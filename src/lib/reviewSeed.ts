// App Review demo seed for LOCAL-ONLY data.
//
// Calendar events, journal entries and rituals are persisted in localStorage
// (not Supabase), so they cannot be seeded server-side onto the review account.
// This runs on-device when the App Review account signs in, filling those
// stores once so the reviewer sees a fully-populated app. It is strictly gated
// to the review email and is a no-op for every real user.
//
// Safe to delete after the app is approved (and remove the call in App.tsx).

const REVIEW_EMAIL = 'appreview@eazy.family';
const FLAG = 'eazy-review-seeded-v1';

const CAL_KEY = 'eazy-family-calendar-items';
const JOURNAL_KEY = 'eazy-journal-entries';
const RITUALS_KEY = 'eazy-rituals';

// Brand palette / tag colors used elsewhere in the calendar
const C = { brand: '#964735', gold: '#FFC861', coral: '#D97B66' };

// date d days from now (optionally at h:m); returned as ISO string to match
// how the calendar serializes Date fields into localStorage.
const at = (days: number, h = 9, m = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const dayOnly = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
const id = () => (crypto?.randomUUID?.() ?? String(Date.now() + Math.random()));

function hasContent(key: string): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const v = JSON.parse(raw);
    return Array.isArray(v) && v.length > 0;
  } catch {
    return false;
  }
}

export function seedReviewLocalData(email: string | null | undefined): void {
  if (email !== REVIEW_EMAIL) return;
  if (localStorage.getItem(FLAG)) return;

  // ── Calendar: events + reminders (only if the store is empty) ──────────────
  if (!hasContent(CAL_KEY)) {
    const calendar = [
      { id: id(), title: '🏊 Mia — swimming lesson', startDate: at(0, 16, 0), endDate: at(0, 17, 0), allDay: false, location: 'Aquatic Center', type: 'event', color: C.brand, tag: 'appointment' },
      { id: id(), title: '👩‍⚕️ Dentist checkup', startDate: at(1, 9, 30), endDate: at(1, 10, 15), allDay: false, location: 'Bright Smiles Clinic', type: 'event', color: C.coral, tag: 'appointment' },
      { id: id(), title: '⚽ Leo — football practice', startDate: at(2, 10, 0), endDate: at(2, 11, 30), allDay: false, location: 'Community Pitch', type: 'event', color: C.gold, tag: 'meeting' },
      { id: id(), title: '🎂 Grandma’s birthday dinner', startDate: at(3, 18, 30), endDate: at(3, 21, 0), allDay: false, location: 'Home', type: 'event', color: C.brand, tag: 'celebration' },
      { id: id(), title: '🏖️ Family trip to the lake', startDate: dayOnly(6), endDate: dayOnly(7), allDay: true, location: 'Lake Geneva', type: 'event', color: C.coral, tag: 'travel' },
      { id: id(), title: '🧑‍🏫 Parent–teacher meeting', startDate: at(9, 17, 0), endDate: at(9, 17, 30), allDay: false, location: 'Riverside School', type: 'event', color: C.gold, tag: 'meeting' },
      { id: id(), title: '🩺 Annual health check', startDate: at(12, 8, 45), endDate: at(12, 9, 30), allDay: false, type: 'event', color: C.brand, tag: 'appointment' },
      // a couple of reminders
      { id: id(), title: 'Sign Mia’s permission slip', dueDate: dayOnly(0), completed: false, priority: 'high', type: 'reminder' },
      { id: id(), title: 'Renew car insurance', dueDate: dayOnly(4), completed: false, priority: 'medium', type: 'reminder' },
    ];
    localStorage.setItem(CAL_KEY, JSON.stringify(calendar));
  }

  // ── Journal entries ────────────────────────────────────────────────────────
  if (!hasContent(JOURNAL_KEY)) {
    const journal = [
      { id: id(), text: 'Grateful for a calm morning — coffee before the kids woke up. Today I want to be present, not just busy.', date: at(-1, 7, 20) },
      { id: id(), text: 'Leo scored his first goal at practice. The look on his face — that’s the whole point of all the driving around. 💛', date: at(-3, 19, 5) },
      { id: id(), text: 'Felt stretched thin this week. Writing it down helps: top priority is Grandma’s birthday and the lake trip. Everything else can wait.', date: at(-5, 21, 40) },
      { id: id(), text: 'Family dinner with no phones tonight. Small thing, but it felt like a reset for all of us.', date: at(-6, 20, 15) },
    ];
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  }

  // ── Rituals ─────────────────────────────────────────────────────────────────
  if (!hasContent(RITUALS_KEY)) {
    const rituals = [
      { id: id(), title: 'Morning gratitude', date: at(-1, 7, 0), type: 'ritual', notes: 'Three things: health, the kids, a slow start.' },
      { id: id(), title: 'Weekly family sync', date: at(-2, 18, 0), type: 'ritual', notes: 'Planned the week together over dinner.' },
      { id: id(), title: 'Evening wind-down', date: at(-4, 22, 0), type: 'ritual', notes: 'Read with Mia, lights out by 9.' },
    ];
    localStorage.setItem(RITUALS_KEY, JSON.stringify(rituals));
  }

  localStorage.setItem(FLAG, '1');
  // Let any mounted journal view refresh
  try { window.dispatchEvent(new CustomEvent('eazy-journal-updated')); } catch { /* noop */ }
}
