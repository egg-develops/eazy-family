import { describe, it, expect } from 'vitest';
import {
  rowToChannelMessage,
  channelMessageToRow,
  colorForUser,
  initialsFor,
  buildAuthors,
  type FamilyMessageRow,
  type ChannelAuthor,
} from './familyChannel';

const authors: Record<string, ChannelAuthor> = {
  'u-self': { name: 'Alex Rivera', initials: 'AR', color: '#964735' },
  'u-sofia': { name: 'Sofia Rivera', initials: 'SR', color: '#6E8FE5' },
};

const row = (over: Partial<FamilyMessageRow>): FamilyMessageRow => ({
  id: 'm1', family_id: 'fam', sender_id: 'u-sofia', content: null, media_url: null,
  type: 'text', metadata: null, created_at: '2026-06-15T08:00:00Z', ...over,
});

describe('colorForUser', () => {
  it('is deterministic and within the palette', () => {
    expect(colorForUser('u-sofia')).toBe(colorForUser('u-sofia'));
    expect(colorForUser('u-sofia')).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

describe('initialsFor', () => {
  it('two-word name → first+last initial', () => expect(initialsFor('Sofia Rivera')).toBe('SR'));
  it('single word → first two letters', () => expect(initialsFor('Mia')).toBe('MI'));
  it('empty → ?', () => expect(initialsFor('')).toBe('?'));
});

describe('rowToChannelMessage', () => {
  it('text from another member resolves author + isMe=false', () => {
    const m = rowToChannelMessage(row({ content: 'Hi all' }), authors, 'u-self');
    expect(m).toMatchObject({ type: 'text', content: 'Hi all', authorName: 'Sofia Rivera', authorInitials: 'SR', isMe: false });
  });
  it('own message → isMe=true', () => {
    const m = rowToChannelMessage(row({ sender_id: 'u-self', content: 'yo' }), authors, 'u-self');
    expect(m.isMe).toBe(true);
  });
  it('image uses media_url as imageUrl', () => {
    const m = rowToChannelMessage(row({ type: 'image', media_url: 'https://x/y.jpg' }), authors, 'u-self');
    expect(m).toMatchObject({ type: 'image', imageUrl: 'https://x/y.jpg' });
  });
  it('voice/location pull type-specific fields out of metadata', () => {
    const v = rowToChannelMessage(row({ type: 'voice', metadata: { transcript: 'hello', duration: 3 } }), authors, 'u-self');
    expect(v).toMatchObject({ type: 'voice', transcript: 'hello', duration: 3 });
    const loc = rowToChannelMessage(row({ type: 'location', metadata: { locationName: 'Park', lat: 1, lon: 2 } }), authors, 'u-self');
    expect(loc).toMatchObject({ type: 'location', locationName: 'Park', lat: 1, lon: 2 });
  });
  it('unknown sender falls back to a generic author', () => {
    const m = rowToChannelMessage(row({ sender_id: 'u-ghost' }), authors, 'u-self');
    expect(m.authorName).toBe('Family member');
    expect(m.authorColor).toMatch(/^#/);
  });
});

describe('channelMessageToRow', () => {
  it('text → content column', () => {
    expect(channelMessageToRow({ type: 'text', content: 'hey' }, 'fam', 'u-self'))
      .toEqual({ family_id: 'fam', sender_id: 'u-self', type: 'text', content: 'hey', media_url: null, metadata: null });
  });
  it('image → media_url column', () => {
    expect(channelMessageToRow({ type: 'image', imageUrl: 'u.jpg' }, 'fam', 'u-self'))
      .toMatchObject({ type: 'image', media_url: 'u.jpg', content: null, metadata: null });
  });
  it('voice → metadata jsonb', () => {
    expect(channelMessageToRow({ type: 'voice', transcript: 'hi', duration: 4 }, 'fam', 'u-self'))
      .toMatchObject({ type: 'voice', content: null, media_url: null, metadata: { transcript: 'hi', duration: 4 } });
  });
  it('round-trips through rowToChannelMessage', () => {
    const insert = channelMessageToRow({ type: 'location', locationName: 'Home', lat: 9, lon: 8 }, 'fam', 'u-sofia');
    const full: FamilyMessageRow = { id: 'm9', created_at: '2026-06-15T09:00:00Z', ...insert };
    const back = rowToChannelMessage(full, authors, 'u-self');
    expect(back).toMatchObject({ type: 'location', locationName: 'Home', lat: 9, lon: 8, isMe: false, authorName: 'Sofia Rivera' });
  });
});

describe('buildAuthors', () => {
  it('prefers profile display_name, falls back to member full_name', () => {
    const a = buildAuthors(
      [{ user_id: 'u-self', full_name: 'Alex R' }, { user_id: 'u-sofia', full_name: 'Sofia Rivera' }],
      [{ user_id: 'u-self', display_name: 'Alex Rivera' }],
    );
    expect(a['u-self'].name).toBe('Alex Rivera'); // from profile
    expect(a['u-self'].initials).toBe('AR');
    expect(a['u-sofia'].name).toBe('Sofia Rivera'); // from member full_name
  });
});
