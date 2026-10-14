import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { supabase } from "@/integrations/supabase/client";
import { error as logError } from "@/lib/logger";

/**
 * VoiceService — single source of truth for all microphone / speech-to-text in the app.
 *
 * Three platform paths, selected automatically:
 *   1. Native (Capacitor SpeechRecognition plugin)               — Capacitor.isNativePlatform()
 *   2. Mobile web (MediaRecorder + AudioContext VAD → Whisper)   — iOS Safari / mobile, no Web Speech API
 *   3. Desktop web (Web Speech API)                              — everything else
 *
 * Public API (singleton — import `voiceService`):
 *   startListening(lang?)   — begin a session (user controls start/stop)
 *   stopListening()         — end the current session
 *   onResult(cb)            — subscribe to transcripts; returns an unsubscribe fn
 *   onError(cb)             — subscribe to errors; returns an unsubscribe fn
 *   onEnd(cb)               — subscribe to session-end; returns an unsubscribe fn
 *   onStateChange(cb)       — subscribe to {isListening, isTranscribing}; returns an unsubscribe fn
 *   onMeter(cb)             — subscribe to {level, elapsedMs} while recording (cloud path only)
 *
 * Every path emits text WHILE the user is still speaking, so the transcript is
 * never a black box until they stop:
 *   - native: the platform recognizer's partialResults
 *   - desktop web: Web Speech interimResults (continuous:false, so the session
 *     still never auto-cuts off on a pause)
 *   - mobile web: bounded interim passes against the cloud STT endpoint
 * Interim results are emitted with isFinal=false; a final result is authoritative
 * and supersedes them.
 *
 * Audio streams and AudioContext are always released at the end of every session.
 */

export type VoiceResultCallback = (transcript: string, isFinal: boolean) => void;
// `detail` is an optional human-readable diagnostic (device/plugin reason) shown
// to the user and logged — turns a silent "voice never works" into a readable why.
export type VoiceErrorCallback = (error: string, detail?: string) => void;
export type VoiceEndCallback = () => void;
export type VoiceStateCallback = (state: { isListening: boolean; isTranscribing: boolean }) => void;
/** Live input level (0–1) and elapsed recording time, for on-screen feedback. */
export type VoiceMeterCallback = (level: number, elapsedMs: number) => void;

// ── Module-level permission cache — persists for the whole app session ───────
let nativePermissionGranted = false;

// Interim passes on the mobile-web path: re-transcribe the audio captured so
// far while the user is still speaking, so text appears during the utterance
// instead of only after it. Bounded on purpose — each pass is one extra STT
// call on the whole clip so far, so the cost of a capture stays predictable.
const INTERIM_INTERVAL_MS = 2500;
const MAX_INTERIM_PASSES = 3;

// Use MediaRecorder + cloud STT (the `transcribe-audio` edge function, Deepgram
// nova-2) on mobile web: iOS Safari has no Web Speech API and mobile Chrome's is
// unreliable. Desktop keeps the Web Speech API.
function shouldUseWhisper(): boolean {
  if (typeof navigator === "undefined") return false;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const hasSpeechAPI =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  return isMobile || !hasSpeechAPI;
}

const IS_IOS =
  typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

function getBestMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  // iOS Safari's isTypeSupported is unreliable — prefer mp4 explicitly
  if (IS_IOS) return MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

class VoiceServiceImpl {
  // Subscribers
  private resultCbs = new Set<VoiceResultCallback>();
  private errorCbs = new Set<VoiceErrorCallback>();
  private endCbs = new Set<VoiceEndCallback>();
  private stateCbs = new Set<VoiceStateCallback>();
  private meterCbs = new Set<VoiceMeterCallback>();

  // State
  private _isListening = false;
  private _isTranscribing = false;

  // Native path
  private nativeCleanup: (() => void) | null = null;
  private nativeActive = false;
  private nativeAutoStopTimer: ReturnType<typeof setTimeout> | null = null;

  // Web Speech API path (desktop)
  private recognition: any = null;
  private webActive = false;
  private sessionId = 0;

  // MediaRecorder + Whisper path (mobile web)
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private transcribeAbort: AbortController | null = null;
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  private vadInterval: ReturnType<typeof setInterval> | null = null;
  private audioCtx: AudioContext | null = null;
  private interimTimer: ReturnType<typeof setInterval> | null = null;
  private interimAbort: AbortController | null = null;

  private readonly isNative = Capacitor.isNativePlatform();
  private readonly useWhisper = !Capacitor.isNativePlatform() && shouldUseWhisper();

  /** True when the active path is single-shot — native and Whisper both stop after one utterance. */
  get isSingleShot() {
    return this.isNative || this.useWhisper;
  }
  get isListening() {
    return this._isListening;
  }
  get isTranscribing() {
    return this._isTranscribing;
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────
  onResult(cb: VoiceResultCallback): () => void {
    this.resultCbs.add(cb);
    return () => this.resultCbs.delete(cb);
  }
  onError(cb: VoiceErrorCallback): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }
  onEnd(cb: VoiceEndCallback): () => void {
    this.endCbs.add(cb);
    return () => this.endCbs.delete(cb);
  }
  onStateChange(cb: VoiceStateCallback): () => void {
    this.stateCbs.add(cb);
    return () => this.stateCbs.delete(cb);
  }
  onMeter(cb: VoiceMeterCallback): () => void {
    this.meterCbs.add(cb);
    return () => this.meterCbs.delete(cb);
  }

  private emitResult(transcript: string, isFinal: boolean) {
    this.resultCbs.forEach((cb) => cb(transcript, isFinal));
  }
  private emitError(err: string, detail?: string) {
    // Always log (logError writes even in production → visible in adb logcat /
    // remote console), and pass the detail to subscribers for on-screen display.
    logError(`[VoiceService] error=${err}${detail ? ` detail=${detail}` : ''} platform=${Capacitor.getPlatform()}`);
    this.errorCbs.forEach((cb) => cb(err, detail));
  }
  private emitEnd() {
    this.endCbs.forEach((cb) => cb());
  }
  private setListening(v: boolean) {
    if (this._isListening === v) return;
    this._isListening = v;
    this.emitState();
  }
  private setTranscribing(v: boolean) {
    if (this._isTranscribing === v) return;
    this._isTranscribing = v;
    this.emitState();
  }
  private emitState() {
    const snap = { isListening: this._isListening, isTranscribing: this._isTranscribing };
    this.stateCbs.forEach((cb) => cb(snap));
  }
  private emitMeter(level: number, elapsedMs: number) {
    this.meterCbs.forEach((cb) => cb(level, elapsedMs));
  }

  // ── Public control ───────────────────────────────────────────────────────
  startListening(lang: string = "en-US") {
    if (this.isNative) {
      this.nativeActive = true;
      void this.startNative(lang);
      return;
    }
    if (this.useWhisper) {
      void this.startMediaRecorder(lang);
      return;
    }
    this.startWeb(lang);
  }

  stopListening() {
    if (this.isNative) {
      this.nativeActive = false;
      if (this.nativeAutoStopTimer) {
        clearTimeout(this.nativeAutoStopTimer);
        this.nativeAutoStopTimer = null;
      }
      this.nativeCleanup?.();
      this.nativeCleanup = null;
      SpeechRecognition.stop().catch(() => {});
      this.setListening(false);
    } else if (this.useWhisper) {
      this.clearInterim();
      this.clearVad();
      this.closeAudioCtx();
      if (this.autoStopTimer) {
        clearTimeout(this.autoStopTimer);
        this.autoStopTimer = null;
      }
      if (this.mediaRecorder?.state === "recording") {
        this.mediaRecorder.stop(); // triggers onstop → transcription
      } else {
        this.transcribeAbort?.abort();
        this.releaseStream();
        this.setListening(false);
        this.setTranscribing(false);
      }
    } else {
      this.webActive = false;
      this.sessionId++;
      this.recognition?.stop();
      this.recognition = null;
      this.setListening(false);
    }
  }

  /**
   * Pre-warm the web microphone permission once (no-op on native, which prompts
   * lazily via the Capacitor plugin). Returns true if granted/already-asked.
   */
  async prewarmWebPermission(): Promise<boolean> {
    if (this.isNative) return true;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  // ── Raw audio-file recording (voice message attachments) ─────────────────
  // Separate from speech-to-text: captures an audio File rather than a transcript.
  private attachmentRecorder: MediaRecorder | null = null;
  private attachmentStream: MediaStream | null = null;

  /**
   * Record a voice-message audio attachment. Resolves the returned File via the
   * `onComplete` callback when {@link stopRecordingAttachment} is called.
   * Returns true if recording started.
   */
  async startRecordingAttachment(
    onComplete: (file: File) => void,
    onError?: (err: string) => void
  ): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      onError?.("not-supported");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.attachmentStream = stream;
      const mimeType = getBestMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const effectiveMimeType = recorder.mimeType || "audio/webm";
      const ext = effectiveMimeType.includes("mp4") || effectiveMimeType.includes("aac") ? "mp4" : "webm";
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        this.attachmentStream?.getTracks().forEach((t) => t.stop());
        this.attachmentStream = null;
        this.attachmentRecorder = null;
        const blob = new Blob(chunks, { type: effectiveMimeType });
        const file = new File([blob], `voice-message.${ext}`, { type: effectiveMimeType });
        onComplete(file);
      };

      recorder.start();
      this.attachmentRecorder = recorder;
      return true;
    } catch (err: any) {
      this.attachmentStream?.getTracks().forEach((t) => t.stop());
      this.attachmentStream = null;
      const denied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      onError?.(denied ? "not-allowed" : "unknown");
      return false;
    }
  }

  /** Stop the active attachment recording, triggering its onComplete callback. */
  stopRecordingAttachment() {
    if (this.attachmentRecorder?.state === "recording") {
      this.attachmentRecorder.stop();
    }
  }

  // ── Cleanup helpers ────────────────────────────────────────────────────────
  private clearVad() {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
  }
  /** Stop scheduling interim passes and drop any in-flight one. */
  private clearInterim() {
    if (this.interimTimer) {
      clearInterval(this.interimTimer);
      this.interimTimer = null;
    }
    this.interimAbort?.abort();
    this.interimAbort = null;
  }
  private closeAudioCtx() {
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
  }
  private releaseStream() {
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
  }

  // ── Native (Capacitor SpeechRecognition) ─────────────────────────────────
  private async startNative(lang: string) {
    if (!nativePermissionGranted) {
      try {
        const { speechRecognition: current } = await SpeechRecognition.checkPermissions();
        if (current === "granted") {
          nativePermissionGranted = true;
        } else {
          const { speechRecognition } = await SpeechRecognition.requestPermissions();
          if (speechRecognition !== "granted") {
            this.emitError(
              "not-allowed",
              `permission '${speechRecognition}' after request (was '${current}'). Enable Microphone for this app in system Settings.`
            );
            return;
          }
          nativePermissionGranted = true;
        }
        const { available } = await SpeechRecognition.available();
        if (!available) {
          // Most common Android dead-end: no on-device recognition service —
          // e.g. the Google app / "Speech Recognition & Synthesis" is disabled
          // or missing on this ROM, so SpeechRecognizer.isRecognitionAvailable()
          // is false. Mic permission being granted does NOT fix this.
          this.emitError(
            "not-supported",
            `SpeechRecognition.available() = false on ${Capacitor.getPlatform()}. The device has no speech-recognition service enabled (check Google app / "Speech Recognition & Synthesis" is installed & enabled).`
          );
          return;
        }
      } catch (e: any) {
        this.emitError(
          "not-supported",
          `availability/permission check threw: ${e?.message ?? e}`
        );
        return;
      }
    }

    if (!this.nativeActive) return;

    this.setListening(true);

    let partialHandle: any = null;
    let stateHandle: any = null;
    let cleanedUp = false;
    // Diagnostics: did the recognizer actually engage, and did it ever return
    // anything? "Started but never produced a partial" is the fingerprint of the
    // Android "mic looks active but nothing happens" dead-end (no-match, or the
    // online recognizer with no network).
    let engineStarted = false;
    let gotPartial = false;
    const isAndroid = Capacitor.getPlatform() === "android";

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      partialHandle?.remove();
      stateHandle?.remove();
      this.nativeCleanup = null;
      this.setListening(false);
    };

    this.nativeCleanup = cleanup;

    partialHandle = await SpeechRecognition.addListener(
      "partialResults",
      (data: { matches: string[] }) => {
        if (!this.nativeActive || cleanedUp) return;
        const transcript = data.matches?.[0] ?? "";
        if (transcript) {
          gotPartial = true;
          this.emitResult(transcript, false);
        }
      }
    );

    stateHandle = await SpeechRecognition.addListener(
      "listeningState",
      (data: { status: "started" | "stopped" }) => {
        if (data.status === "started") engineStarted = true;
        if (data.status === "stopped" && !cleanedUp) {
          const startedButEmpty = engineStarted && !gotPartial;
          cleanup();
          if (this.nativeActive) {
            // Surface the silent Android failure: the recognizer started and
            // stopped without ever transcribing a word.
            if (isAndroid && startedButEmpty) {
              this.emitError(
                "no-result",
                "Recognizer ran but returned no speech. If you spoke, the device's speech service may have errored (no-match) or the online recognizer had no network."
              );
            }
            this.emitEnd();
          }
        }
      }
    );

    try {
      await SpeechRecognition.start({
        language: lang,
        partialResults: true,
        maxResults: 1,
        popup: false,
      });
      // Android's SpeechRecognizer without a popup UI can stay open indefinitely —
      // force-stop after 30s so the user is never left with a stuck mic indicator.
      this.nativeAutoStopTimer = setTimeout(() => {
        this.nativeAutoStopTimer = null;
        if (this.nativeActive) this.stopListening();
      }, 30_000);
    } catch (e: any) {
      if (!cleanedUp) {
        cleanup();
        const raw = e?.message ?? String(e);
        const msg = raw.toLowerCase();
        this.emitError(
          msg.includes("permiss") || msg.includes("denied") ? "not-allowed" : "unknown",
          `SpeechRecognition.start() failed: ${raw}`
        );
      }
    }
  }

  // ── Mobile web (MediaRecorder + AudioContext VAD → Whisper) ──────────────
  private async startMediaRecorder(lang: string) {
    // Create AudioContext synchronously while still inside the user-gesture call
    // stack. iOS Safari drops the activation context once we hit the first await,
    // so AudioContext must be instantiated before getUserMedia.
    let analyser: AnalyserNode | null = null;
    let timeDomainData: Uint8Array | null = null;
    try {
      const audioCtx = new AudioContext();
      this.audioCtx = audioCtx;
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      timeDomainData = new Uint8Array(analyser.fftSize);
    } catch {
      // AudioContext not available — VAD will be skipped
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;
      const startedAt = Date.now();

      // Voice Activity Detection — auto-stop after silence so users don't need to tap stop
      let hasSpeech = false;
      let silenceStartMs: number | null = null;
      const SILENCE_STOP_MS = 2800;
      const SPEECH_RMS_THRESHOLD = 0.015;

      if (analyser && timeDomainData && this.audioCtx) {
        try {
          this.audioCtx.createMediaStreamSource(stream).connect(analyser);
          const _analyser = analyser;
          const _data = timeDomainData;
          let tick = 0;

          this.vadInterval = setInterval(() => {
            if (this.mediaRecorder?.state !== "recording") {
              this.clearVad();
              return;
            }
            _analyser.getByteTimeDomainData(_data);
            let sum = 0;
            for (const v of _data) {
              const n = (v - 128) / 128;
              sum += n * n;
            }
            const rms = Math.sqrt(sum / _data.length);

            // Feed the on-screen level meter at 200ms (every other 100ms tick)
            // so the user has immediate feedback before the first interim
            // transcript lands. Scaled so normal speech fills most of the bar.
            if (++tick % 2 === 0) {
              this.emitMeter(Math.min(1, rms / 0.25), Date.now() - startedAt);
            }

            if (rms > SPEECH_RMS_THRESHOLD) {
              hasSpeech = true;
              silenceStartMs = null;
            } else if (hasSpeech) {
              if (silenceStartMs === null) silenceStartMs = Date.now();
              if (Date.now() - silenceStartMs > SILENCE_STOP_MS) {
                this.clearVad();
                if (this.mediaRecorder?.state === "recording") {
                  this.mediaRecorder.stop();
                }
              }
            }
          }, 100);
        } catch {
          // Stream connection failed — VAD disabled
        }
      }

      const mimeType = getBestMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const effectiveMimeType = recorder.mimeType || (IS_IOS ? "audio/mp4" : "audio/webm");
      const ext =
        effectiveMimeType.includes("mp4") || effectiveMimeType.includes("aac") ? "mp4" : "webm";
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        this.clearInterim();
        this.clearVad();
        this.closeAudioCtx();
        if (this.autoStopTimer) {
          clearTimeout(this.autoStopTimer);
          this.autoStopTimer = null;
        }
        this.releaseStream();
        this.mediaRecorder = null;
        this.setListening(false);

        const totalSize = chunks.reduce((sum, c) => sum + c.size, 0);
        if (totalSize < 500) {
          this.emitEnd();
          return;
        }

        this.setTranscribing(true);
        const abort = new AbortController();
        this.transcribeAbort = abort;

        const transcript = await this.transcribeBlob(
          new Blob(chunks, { type: effectiveMimeType }),
          ext,
          lang,
          abort.signal
        );
        // null = the request failed (not just "no speech heard"), so surface it;
        // an empty string is a successful transcription of silence and stays quiet.
        if (transcript) this.emitResult(transcript, true);
        else if (transcript === null && !abort.signal.aborted) this.emitError("transcription-failed");

        this.setTranscribing(false);
        this.emitEnd();
      };

      recorder.start(250);
      this.mediaRecorder = recorder;
      this.setListening(true);

      // Live partials on this path: re-transcribe what has been captured so far
      // while the user keeps speaking. Only for WebM — its chunks concatenate
      // into a decodable stream mid-recording, whereas iOS Safari's MP4 only
      // becomes decodable once the recorder finalizes the container.
      if (ext === "webm") {
        let passes = 0;
        let inFlight = false;
        this.interimTimer = setInterval(() => {
          if (this.mediaRecorder?.state !== "recording") return;
          if (inFlight || passes >= MAX_INTERIM_PASSES || chunks.length === 0) return;
          inFlight = true;
          passes++;
          const abort = new AbortController();
          this.interimAbort = abort;
          void this.transcribeBlob(
            new Blob(chunks.slice(), { type: effectiveMimeType }),
            ext,
            lang,
            abort.signal
          ).then((text) => {
            inFlight = false;
            // Drop a late interim: once recording has stopped, the final
            // transcript is authoritative and must not be overwritten.
            if (text && this.mediaRecorder?.state === "recording") this.emitResult(text, false);
          });
        }, INTERIM_INTERVAL_MS);
      }
      // 30s hard limit — VAD stops it sooner on silence; 30s covers longer entries
      this.autoStopTimer = setTimeout(() => {
        if (this.mediaRecorder?.state === "recording") {
          this.mediaRecorder.stop();
        }
      }, 30000);
    } catch (err: any) {
      this.clearInterim();
      this.closeAudioCtx();
      this.releaseStream();
      const denied =
        err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      this.emitError(denied ? "not-allowed" : "unknown");
    }
  }

  /**
   * POST one audio clip to the `transcribe-audio` edge function.
   * Returns the transcript, `""` when the clip held no speech, or `null` when
   * the request itself failed (so callers can tell silence from an outage).
   * Shared by the final transcription and the interim passes.
   */
  private async transcribeBlob(
    blob: Blob,
    ext: string,
    lang: string,
    signal: AbortSignal
  ): Promise<string | null> {
    try {
      let {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        session = refreshed.session;
      }
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

      const fd = new FormData();
      fd.append("audio", blob, `recording.${ext}`);
      fd.append("language", lang.split("-")[0]);

      const res = await fetch(`${supabaseUrl}/functions/v1/transcribe-audio`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token ?? anonKey}`,
          apikey: anonKey,
        },
        body: fd,
        signal,
      });

      if (!res.ok) {
        logError("[VoiceService] Transcription HTTP error:", res.status);
        return null;
      }
      const data = await res.json();
      return ((data.text ?? "") as string).trim();
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        logError("[VoiceService] Cloud transcription failed:", err);
        return null;
      }
      return "";
    }
  }

  // ── Desktop web (Web Speech API) ─────────────────────────────────────────
  private startWeb(lang: string) {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      this.emitError("not-supported");
      return;
    }

    this.webActive = false;
    this.sessionId++;
    this.recognition?.stop();
    this.recognition = null;

    this.webActive = true;
    this.setListening(true);

    const sessionId = this.sessionId;
    const r = new SR();
    r.lang = lang;
    // Live partials: the words appear while the user speaks instead of only
    // after the engine commits the utterance. continuous stays false, so the
    // user still controls start/stop and the session never auto-cuts on a pause.
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;

    r.onresult = (e: any) => {
      if (this.sessionId !== sessionId) return;
      // Committed text first, then the volatile tail. isFinal is false while any
      // part is still interim, so subscribers know the text can still change.
      let committed = "";
      let interim = "";
      let allFinal = true;
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) committed += res[0].transcript;
        else {
          interim += res[0].transcript;
          allFinal = false;
        }
      }
      const text = `${committed}${interim}`.trim();
      if (text) this.emitResult(text, allFinal);
    };

    r.onerror = (e: any) => {
      if (this.sessionId !== sessionId) return;
      if (e.error === "aborted" || e.error === "no-speech") return;
      this.webActive = false;
      this.setListening(false);
      this.emitError(e.error);
    };

    r.onend = () => {
      if (this.sessionId !== sessionId) return;
      this.setListening(false);
      if (this.webActive) this.emitEnd();
    };

    try {
      r.start();
      this.recognition = r;
    } catch {
      this.webActive = false;
      this.setListening(false);
    }
  }
}

// Singleton — module-level instance, not a React hook.
export const voiceService = new VoiceServiceImpl();
export type VoiceService = VoiceServiceImpl;
