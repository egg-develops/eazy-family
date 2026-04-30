import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

export async function compressAndUpload(
  file: File,
  bucket: string,
  path: string
): Promise<string> {
  const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
  const { error } = await supabase.storage.from(bucket).upload(path, compressed);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

/** Extract the storage object path from a Supabase public URL. */
export function storagePathFromUrl(url: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

export async function deleteStorageFile(bucket: string, url: string): Promise<void> {
  const path = storagePathFromUrl(url, bucket);
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}
