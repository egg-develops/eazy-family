import { describe, it, expect } from 'vitest';
import { readSseContent, stripJsonFence } from './sseText';

const streamOf = (chunks: string[]): ReadableStream<Uint8Array> => {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= chunks.length) { controller.close(); return; }
      controller.enqueue(enc.encode(chunks[i++]));
    },
  });
};

const sse = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`;

describe('readSseContent', () => {
  it('concatenates the content deltas', async () => {
    const out = await readSseContent(streamOf([sse('{"a"'), sse(':1}'), 'data: [DONE]\n']));
    expect(out).toBe('{"a":1}');
  });

  it('survives a data line split across chunk boundaries (the regression)', async () => {
    const line = sse('hello world');
    const cut = Math.floor(line.length / 2);
    const out = await readSseContent(streamOf([line.slice(0, cut), line.slice(cut)]));
    expect(out).toBe('hello world');
  });

  it('flushes a final line that never got its newline', async () => {
    const out = await readSseContent(streamOf([sse('tail').trimEnd()]));
    expect(out).toBe('tail');
  });

  it('ignores keep-alives, comments and unparseable lines', async () => {
    const out = await readSseContent(streamOf([': ping\n', '\n', 'data: not json\n', sse('ok')]));
    expect(out).toBe('ok');
  });

  it('reports each delta to the callback in order', async () => {
    const seen: string[] = [];
    await readSseContent(streamOf([sse('a'), sse('b')]), d => seen.push(d));
    expect(seen).toEqual(['a', 'b']);
  });
});

describe('stripJsonFence', () => {
  it('removes a ```json fence', () => {
    expect(stripJsonFence('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it('removes a bare ``` fence', () => {
    expect(stripJsonFence('```\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it('leaves unfenced JSON untouched', () => {
    expect(stripJsonFence(' {"a":1} ')).toBe('{"a":1}');
  });
});
