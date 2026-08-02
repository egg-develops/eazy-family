import { supabase } from "@/integrations/supabase/client";

// Generic file attachment upload (any type — PDF, image, doc) to the public
// user-uploads bucket. Calendar events live in localStorage, so we store the
// resulting public URL + name on the event object.
const BUCKET = "user-uploads";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export interface Attachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

export async function uploadAttachment(file: File, userId: string): Promise<Attachment> {
  if (file.size > MAX_BYTES) throw new Error("File too large (max 15 MB)");
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-90) || "file";
  const path = `calendar/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { name: file.name, url: publicUrl, size: file.size, type: file.type };
}

export async function deleteAttachment(url: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return;
  const path = decodeURIComponent(url.slice(i + marker.length));
  await supabase.storage.from(BUCKET).remove([path]).catch(() => { /* best-effort */ });
}
