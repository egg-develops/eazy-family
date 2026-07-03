import { describe, it, expect } from 'vitest';
import { validateImageFile, validateImageFiles, MAX_FILE_SIZE } from './fileValidation';

const fakeFile = (type: string, size: number): File =>
  ({ type, size, name: 'f' } as unknown as File);

describe('validateImageFile — upload gate', () => {
  it('accepts allowed image types', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) {
      expect(validateImageFile(fakeFile(t, 1000)).valid).toBe(true);
    }
  });

  it('rejects executables/svg/html masquerades', () => {
    for (const t of ['application/x-msdownload', 'image/svg+xml', 'text/html', 'application/pdf', '']) {
      expect(validateImageFile(fakeFile(t, 1000)).valid).toBe(false);
    }
  });

  it('rejects oversize files, accepts exactly-at-limit', () => {
    expect(validateImageFile(fakeFile('image/png', MAX_FILE_SIZE + 1)).valid).toBe(false);
    expect(validateImageFile(fakeFile('image/png', MAX_FILE_SIZE)).valid).toBe(true);
  });

  it('validateImageFiles fails on the first bad file', () => {
    const files = [fakeFile('image/png', 10), fakeFile('text/html', 10)];
    const res = validateImageFiles(files);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Invalid file type/);
  });
});
