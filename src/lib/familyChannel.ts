/**
 * Shared Family Channel data layer — maps between the `family_messages` DB row
 * and the rich `ChannelMessage` shape the UI renders. Append-only: no polls
 * (voting would need cross-member row UPDATEs; every type here is insert-only).
 *
 * Pure + framework-free so it can be unit-tested; FamilyAgenda wires it to
 * Supabase (load + realtime + insert).
 */

export type ChannelMessageType = 'text' | 'voice' | 'image' | 'location' | 'document' | 'event';

export interface ChannelMessage {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  isMe: boolean;
  type: ChannelMessageType;
  timestamp: string;
  content?: string;
  transcript?: string;
  duration?: number;
  imageUrl?: string;
  locationName?: string;
  lat?: number;
  lon?: number;
  fileName?: string;
  fileSize?: string;
  fileData?: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
}

export interface FamilyMessageRow {
  id: string;
  family_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ChannelAuthor { name: string; initials: string; color: string; }

// Type-specific fields that ride along in the row's `metadata` jsonb.
// (content → column `content`, imageUrl → column `media_url`.)
const META_KEYS = ['transcript', 'duration', 'locationName', 'lat', 'lon', 'fileName', 'fileSize', 'fileData', 'eventTitle', 'eventDate', 'eventLocation'] as const;

const PALETTE = ['#964735', '#6E8FE5', '#D97B66', '#44664F', '#EE7BB0', '#FFC861'];

/** Deterministic avatar colour for a user id (stable across members/devices). */
export function colorForUser(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Up-to-2-letter initials from a display name. */
export function initialsFor(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const s = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return s.toUpperCase();
}

/** DB row → ChannelMessage, resolving the sender to a display author. */
export function rowToChannelMessage(row: FamilyMessageRow, authors: Record<string, ChannelAuthor>, selfId: string): ChannelMessage {
  const meta = (row.metadata || {}) as Record<string, unknown>;
  const author = authors[row.sender_id] || { name: 'Family member', initials: 'FM', color: colorForUser(row.sender_id) };
  const msg: ChannelMessage = {
    id: row.id,
    authorName: author.name,
    authorInitials: author.initials,
    authorColor: author.color,
    isMe: row.sender_id === selfId,
    type: (row.type as ChannelMessageType) || 'text',
    timestamp: row.created_at,
  };
  if (row.content != null) msg.content = row.content;
  if (row.media_url != null) msg.imageUrl = row.media_url;
  for (const k of META_KEYS) {
    if (meta[k] !== undefined) (msg as Record<string, unknown>)[k] = meta[k];
  }
  return msg;
}

export type ChannelMessageInput =
  Partial<Omit<ChannelMessage, 'id' | 'authorName' | 'authorInitials' | 'authorColor' | 'isMe' | 'timestamp' | 'type'>>
  & { type: ChannelMessageType };

/** ChannelMessage draft → family_messages insert payload. */
export function channelMessageToRow(input: ChannelMessageInput, familyId: string, senderId: string): Omit<FamilyMessageRow, 'id' | 'created_at'> {
  const meta: Record<string, unknown> = {};
  for (const k of META_KEYS) {
    const v = (input as Record<string, unknown>)[k];
    if (v !== undefined) meta[k] = v;
  }
  return {
    family_id: familyId,
    sender_id: senderId,
    type: input.type,
    content: input.content ?? null,
    media_url: input.imageUrl ?? null,
    metadata: Object.keys(meta).length ? meta : null,
  };
}

/** Build an author lookup from family member rows (full_name) + profiles. */
export function buildAuthors(
  members: { user_id: string; full_name?: string | null }[],
  profiles: { user_id: string; display_name?: string | null }[],
): Record<string, ChannelAuthor> {
  const nameByProfile = new Map(profiles.map(p => [p.user_id, p.display_name]));
  const authors: Record<string, ChannelAuthor> = {};
  for (const m of members) {
    if (!m.user_id) continue;
    const name = (nameByProfile.get(m.user_id) || m.full_name || 'Family member').trim();
    authors[m.user_id] = { name, initials: initialsFor(name), color: colorForUser(m.user_id) };
  }
  return authors;
}
