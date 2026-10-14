/**
 * Shared reader for the OpenAI-compatible SSE stream that `eazy-chat` returns.
 *
 * Both EZ-capture callers (structured parse + the in-app guide) consumed this
 * format with their own copy of the same loop. The subtle part is line
 * buffering: a `data:` line can be split at a network chunk boundary, so the
 * trailing partial line MUST be carried over to the next chunk. Splitting each
 * chunk independently dropped the straddling line, which corrupted the JSON on
 * longer inputs and silently degraded capture to the weaker local parser.
 */
export async function readSseContent(
  body: ReadableStream<Uint8Array>,
  onDelta?: (delta: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buf = '';

  const consume = (line: string) => {
    if (!line.startsWith('data: ') || line.includes('[DONE]')) return;
    try {
      const data = JSON.parse(line.slice(6));
      const content = data?.choices?.[0]?.delta?.content;
      if (typeof content === 'string' && content) {
        full += content;
        onDelta?.(content);
      }
    } catch {
      /* keep-alives, comments and non-JSON lines */
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? ''; // incomplete line → carry over
    for (const line of lines) consume(line);
  }
  if (buf) consume(buf); // flush the final buffered line

  return full;
}

/**
 * Strips a markdown code fence from a model reply that should be raw JSON.
 * Models occasionally fence structured output despite being told not to.
 */
export function stripJsonFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```$/, '')
    .trim();
}
