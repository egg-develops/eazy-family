# REA teardown: how Nori does voice capture and parsing

**Date:** 2026-10-11
**Target:** Nori (heynori.com) web client, public production bundle
**Tool:** REA (`rea-agents` v6.4.0) run as an external CLI, not a repo dependency
**Purpose:** competitive architecture research to inform Eazy.Family's EZ capture roadmap. No Nori code is reproduced here; findings are stated as architecture and parameters.

---

## 1. Method and provenance

| Step | What was done |
|---|---|
| Target selection | `https://heynori.com/app` serves the real product shell (Next.js App Router, OpenNext on Cloudflare). Public, unauthenticated assets only. |
| Acquisition | 58 referenced static assets (4.8 MB JS/CSS) fetched from their CDN into an isolated scratch directory. |
| Source maps | None served. `*.js.map` URLs return the SPA HTML fallback with `200`, so recovery worked from minified code. |
| Static analysis | `rea analyze-javascript-application <dir>` → 48 MB canonical Evidence graph, digest-anchored (`sha256 d65d14af…5483`, evidence `ev_eb8ed39f…595a`), 54 sources parsed. |
| Source recovery | `rea recover-javascript-sources` unavailable on this machine: it requires an external Wakaru **Linux x64** binary via `REA_WAKARU_COMMAND`. Worked around with formatting plus targeted module reads. |
| Scope limits | Web client only. The iOS/Android native clients were not analyzed (no artifact in hand). Server-side prompts, model choice and IAM policies are not observable from a client bundle. |

Chunks that carry the voice path: `4451-*` (capture + API layer + conversation store), `6417-*` (input box UI), `4509-*` (AWS SDK), `9aabae2b-*` (RecordRTC).

---

## 2. Verified findings

### 2.1 Capture: the browser streams PCM straight to AWS Transcribe

- Permission is pre-checked with `navigator.permissions.query({name:'microphone'})`; a `denied` state shows a localized toast and rejects before `getUserMedia` is ever called.
- Audio comes from `getUserMedia({audio:true})` into **RecordRTC's `StereoAudioRecorder`** (not `MediaRecorder`), configured mono, `desiredSampRate: 16000`, nominal mime `audio/webm;codecs=pcm`, `timeSlice: 300`.
  The reason for RecordRTC is uniform raw PCM across browsers, including iOS Safari, which is what Transcribe requires.
- Each 300 ms blob is pushed onto a queue. An **async generator** drains the queue and yields `{AudioEvent:{AudioChunk}}` frames as the `AudioStream` of a single `StartStreamTranscription` command.
- Command parameters: `MediaEncoding: "pcm"`, `MediaSampleRateHertz: 16000`, and **`LanguageCode: "en-US"` hardcoded**. `IdentifyLanguage` exists only inside the bundled AWS SDK and is never used by their code: voice input is English-only today, even though the UI ships `de-DE`, `fr-FR`, `it-IT`, `es-ES`, `pt-BR/PT`, `ja-JP`, `zh-CN/TW` locale data.
- **Transport is a WebSocket** from the browser directly to AWS: the SDK request handler is a `ws:`/`wss:`-only handler that constructs `new WebSocket(...)`, wrapped by Nori to attach `open`/`message`/`error`/`close` listeners.
- **Credentials come from their own API**: `GET /api/v1/assets/get-sts?region=us-east-1` returns `accessKeyId`, `secretAccessKey`, `sessionToken`, `expiration`. Cached in a module-level static with a two-tier policy: reuse if more than 10 minutes of life remains; return the stale one and refresh in the background if more than 1 minute remains; otherwise fetch and block.
- **Hard 20-second cap**: a 20 000 ms timer, armed when the transcript stream begins iterating, calls the full cleanup path regardless of what the user is doing.
- Partial/final merge rule: a partial result replaces the pending tail, a final result appends with a space to the committed transcript. Every emission pushes the whole accumulated string into an RxJS subject (so subscribers always get the full text, never a diff).
- The `MediaStream` is **cloned** and handed to a waveform visualizer so teardown of the recorder does not kill the animation source.
- Teardown is centralized and idempotent: stop all tracks, stop + destroy the recorder, destroy the SDK client, complete the observable. It runs on error, on manual stop, on unmount, and on mode change.
- Error surface is explicit: `BadRequestException`, `LimitExceededException`, `InternalFailureException`, `ConflictException` from the Transcribe stream each terminate the session with a typed error.

### 2.2 UX: voice is an input method, not a feature

- The streaming transcript is written into the **same textarea** used for typing. In voice mode the textarea is disabled and its placeholder reads "I'm listening…"; the footer carries "AI may make mistakes, so check important tasks".
- Voice mode replaces the normal action row with: waveform, a cancel button, a send button. Sending switches the box back to text mode and calls the **identical send path as typed text**.
- Entering voice mode is itself state-driven (`text` / `loading` / `voice`), and three separate effects force a teardown back to `text` on unmount, on mode change and when the parent closes.
- The same input box also takes images and PDFs (max 3 attachments, 10 MB each, 20 000 char limit) uploaded to an asset endpoint before send.
- Analytics events fire at `ai_voice_input` and `ai_chat_send`, so the voice funnel is measured separately from typing.

### 2.3 Parsing: there is no client-side parsing at all

Nothing in the bundle parses dates, intents or entities. The transcript is sent as plain text and the server's agent does everything.

**Send:** `POST /api/v2/chat/message/send` with `{ conversation_id?, contents[], metadata: { client_instance_id, source: "web" }, stream_enabled: true }` → `{ conversation_id, turn_id, task_context }`.
The client optimistically appends the user message and an empty assistant message with status `streaming`, `isClient: true`, `snapshotId: -1`, so the thread renders before the server answers.

**Stream:** `GET https://api.heynori.com/conversations/{id}/stream?turn_id&client_instance_id&client_stream_version=v2[&last_sequence_id][&snapshot_version][&device_id][&token]` as SSE with `openWhenHidden: true` (keeps streaming in a backgrounded tab).

Event types: `contents.delta`, `contents.refresh`, `turn.completed`, `turn.failed`, `task.state.changed`.

**Content model:** an assistant message is an ordered list of typed blocks: `text | image | file | card | tool_step | artifact_ref`. Deltas are block operations, `upsert(block)` and `remove(block_id)`, each stamped `base_version → snapshot_version`.

**Consistency protocol (the most interesting part):**
- The client tracks the last applied `snapshot_version` per assistant message and refuses any delta whose `base_version` does not match, rather than applying it out of order.
- On a gap or a reconnect it calls `GET /api/v1/stream/deltas?turn_id&from_snapshot_version&to_snapshot_version`, which answers `{ recovery_mode, deltas[] }`. Only `recovery_mode === "deltas"` is applied incrementally; anything else forces a full refresh from the server snapshot.
- Out-of-order events land in a `pendingDeltas` queue, are sorted by `(base_version, snapshot_version)`, and gaps are back-filled before the queue is drained.
- Reconnects use a backoff counter reset to 1000 ms on every successful event.

**Control and failure:** `POST /api/v1/chat/turn/{turn_id}/interrupt` cancels a running turn. `turn.failed` carries `error_code` ∈ `interrupted | workflow_crashed | agent_unable_to_complete`, each mapped to distinct user copy. `GET /chat/turn/{id}/suggestions?conversation_id=` fetches follow-up chips.

**The agent's tool surface** (client-side enum used to render tool steps and result cards, so it mirrors the server tool registry):
`system_intelligent_search`, `search|create|update|delete_calendar_event`, `…_task`, `…_meal_plan`, `…_recipe`, `…_shopping_item`, plus `combined_search_entities` and `combined_delete_entities`.
So one utterance can legitimately produce several typed writes across domains in a single turn.

**Monetization is enforced client-side too:** a quota check runs before send (feature-flagged), and API codes `32002 FreeTrialExpired` / `32003 QuotaDepleted` are rendered as a paywall **card inside the thread** instead of an error.

### 2.4 Inferred, not verified

- The STS credentials are presumably scoped to `transcribe:StartStreamTranscription` only; the policy is not visible from the client.
- The server is a tool-calling agent loop; `tool_step` blocks are its externalized trace. Model, prompts and orchestration are not observable.
- The native iOS/Android clients most likely speak the same versioned protocol (the stream endpoint accepts `device_id`, and `client_stream_version` is negotiated), but this was not checked against a native artifact.

---

## 3. Nori vs Eazy.Family today

| Dimension | Nori (web) | Eazy.Family |
|---|---|---|
| STT engine | AWS Transcribe Streaming, browser → AWS over WebSocket | Native: Capacitor SpeechRecognition. Mobile web: MediaRecorder → Whisper via `transcribe-audio` edge fn. Desktop: Web Speech API |
| Credentials | Temporary AWS STS handed to the browser | None in client; everything proxied through Supabase edge functions |
| Live partial text | Yes, always | Yes on native (`partialResults: true` → rendered). **No** on mobile web (single-shot Whisper) and desktop (`interimResults: false`) |
| Languages for voice | English only (`en-US` hardcoded) | 6 languages via `getSpeechLocale()` |
| Session length | Hard 20 s cap | 30 s cap plus AudioContext VAD silence auto-stop; continuous mode for journal |
| Parsing | Server agent with a typed tool registry; no client parsing | One-shot LLM JSON extraction via `eazy-chat` (temperature 0, 15 s race), plus local `intentClassifier` and `parseDatesLocalized` fallbacks |
| Writes per utterance | Many, typed, across domains in one turn | One `ParsedEntry` of one type |
| Streaming result | SSE with versioned block deltas and a delta-replay recovery endpoint | SSE token stream parsed into one JSON object; no resume, no idempotency key |
| Cancel mid-run | `interrupt` endpoint, typed failure codes | Not applicable (single request), 15 s timeout returns null and silently degrades |
| Result presentation | Typed cards and tool steps inline in a thread | Auto-commit then "done" screen with Add reminder / Edit / Remove |

Where we are already ahead: multilingual voice, VAD instead of a blunt timeout, no cloud credentials in the client, and a capture flow that commits without a chat thread.

Where they are ahead: live partials on every platform, multi-write turns from one utterance, and a genuinely robust streaming protocol that survives a dropped connection.

---

## 4. Recommendations for Eazy.Family

Ordered by value per unit of work. Nothing here has been implemented; all of it needs approval.

**R1. Live partials on the web paths — small.**
Native already renders partials. Mobile web shows nothing until the user stops and Whisper returns, and desktop has `interimResults: false` by deliberate choice. Turning desktop interims on behind the existing `continuousRef` logic, and showing a "transcribing…" skeleton with the recorded duration on the Whisper path, closes most of the perceived-latency gap without changing engines.

**R2. Idempotency key plus resume on the parse call — small/medium.**
Our parse is a 15 s `Promise.race` that returns `null` on timeout and quietly degrades to the weaker local parser. Adding a `client_instance_id`-style key to the `eazy-chat` request, and retrying once with the same key on network failure, would stop a flaky connection from downgrading a capture. This is the cheap 20% of Nori's snapshot protocol.

**R3. Multi-write captures — medium/high, highest product value.**
Their `combined_*` tools mean "milk, bread, and clean the terrace Tuesday" becomes several typed writes in one turn. Our `ParsedEntry` is single-typed, so mixed utterances lose data or get forced into one bucket. The change is a schema change: have `eazy-chat` return an array of typed entries, then commit them in one pass and show one "done" screen listing each item. It fits the existing do-then-suggest flow and the auto-classify path, and it is the single biggest capability gap.

**R4. Keep and advertise multilingual voice — free.**
Their voice is `en-US` only. Ours is six languages through `getSpeechLocale()`. That is a marketing fact, not just an engineering one.

**R5. Streaming STT for the Whisper path, only if R1 is not enough — high.**
If we want true word-by-word on mobile web, the right shape for us is a Supabase edge function or a small relay proxying a streaming provider, keeping the key server-side. Copying Nori's browser-held STS credentials is the wrong trade for a family app: it puts cloud credentials on every client and makes abuse metering a server-side afterthought.

**R6. Small UX borrowings — small.**
A waveform fed by a cloned `MediaStream`, an "I'm listening…" placeholder on the disabled input, and separate analytics events for the voice funnel (`ez_voice_start` / `ez_voice_commit`) so we can see where voice captures are abandoned.

**R7. Explicitly do not copy.**
The 20 s hard cap (our VAD is better), browser-side cloud credentials, and routing every capture through a chat thread.
