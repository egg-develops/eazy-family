import { describe, expect, it } from 'vitest';
import {
  buildCalendarCaptureItem,
  buildShoppingCaptureRows,
  buildTaskCaptureRows,
  dropAssigneesMentionedInTitle,
  extractAssignmentIntent,
  isFamilyCalendarIntent,
  isFeatureHelpQuery,
  parseMessageIntent,
  resolveAssignees,
  type EZParsedEntry,
  type FamilyMemberLite,
} from './ezCapturePersistence';

const entry = (overrides: Partial<EZParsedEntry>): EZParsedEntry => ({
  type: 'event',
  title: 'Dentist',
  date: null,
  time: null,
  endTime: null,
  location: null,
  assignees: null,
  reminder: null,
  notes: null,
  mood: null,
  ...overrides,
});

describe('EZ Capture task persistence rows', () => {
  it('splits multiple tasks and preserves a due date', () => {
    expect(buildTaskCaptureRows(entry({
      type: 'task',
      title: 'Call dentist, pay electricity',
      date: '2026-06-15',
      time: '09:30',
    }), 'user-1')).toEqual([
      { title: 'Call dentist', type: 'task', user_id: 'user-1', completed: false, due_date: new Date('2026-06-15T09:30').toISOString() },
      { title: 'pay electricity', type: 'task', user_id: 'user-1', completed: false, due_date: new Date('2026-06-15T09:30').toISOString() },
    ]);
  });

  // Regression: "our shared to-do list" should route to shared family list
  // even when no specific assignee is named — isExplicitlyShared carries that signal.
  it('isExplicitlyShared → type shared when familyId + parentId provided', () => {
    const rows = buildTaskCaptureRows(
      entry({ type: 'task', title: 'Fix broken shelf' }),
      'user-1',
      { isExplicitlyShared: true, familyId: 'fam-1', parentId: 'parent-1' },
    );
    expect(rows[0].type).toBe('shared');
    expect(rows[0].family_id).toBe('fam-1');
    expect(rows[0].visible_to).toBe('family');
  });

  it('isExplicitlyShared false → stays personal task without assignees', () => {
    const rows = buildTaskCaptureRows(
      entry({ type: 'task', title: 'Fix broken shelf' }),
      'user-1',
      { isExplicitlyShared: false, familyId: 'fam-1', parentId: 'parent-1' },
    );
    expect(rows[0].type).toBe('task');
  });
});

describe('parseMessageIntent', () => {
  it('"send a message to X saying …"', () => {
    expect(parseMessageIntent('send a message to Sofia saying I will be late')).toEqual({ to: 'Sofia', body: 'I will be late' });
  });
  it('"send a message to X that …"', () => {
    expect(parseMessageIntent('Send a message to Leo that dinner is ready')).toEqual({ to: 'Leo', body: 'dinner is ready' });
  });
  it('"send a message to X <body>" (no connector)', () => {
    expect(parseMessageIntent('send a message to Mia pick up milk')).toEqual({ to: 'Mia', body: 'pick up milk' });
  });
  it('"send X a message saying …"', () => {
    expect(parseMessageIntent('send Sofia a message saying running 10 min late')).toEqual({ to: 'Sofia', body: 'running 10 min late' });
  });
  it('"message X: …" and "text X …"', () => {
    expect(parseMessageIntent('message Sofia: on my way')).toEqual({ to: 'Sofia', body: 'on my way' });
    expect(parseMessageIntent('text Leo I will be there soon')).toEqual({ to: 'Leo', body: 'I will be there soon' });
  });
  it('"tell X that …" and "let X know …"', () => {
    expect(parseMessageIntent('tell Sofia that I parked out front')).toEqual({ to: 'Sofia', body: 'I parked out front' });
    expect(parseMessageIntent('let Leo know the game is cancelled')).toEqual({ to: 'Leo', body: 'the game is cancelled' });
  });
  it('does NOT treat "tell X to <task>" as a message (that is assignment)', () => {
    expect(parseMessageIntent('tell Mia to clean her room')).toBeNull();
  });
  it('non-message input → null', () => {
    expect(parseMessageIntent('buy milk and eggs')).toBeNull();
    expect(parseMessageIntent('dentist appointment tomorrow at 3')).toBeNull();
  });
});

describe('resolveAssignees — fuzzy name matching', () => {
  const members: FamilyMemberLite[] = [
    { user_id: 'u-sofia', name: 'Sofia Müller' },
    { user_id: 'u-leo',   name: 'Leo Müller' },
  ];
  const self = { userId: 'u-self', name: 'Alex Müller' };

  it('"Sophia" resolves to Sofia (edit distance 1)', () =>
    expect(resolveAssignees(['Sophia'], members, self)).toEqual(['u-sofia']));

  it('"Leo" resolves exactly (no fuzzy needed)', () =>
    expect(resolveAssignees(['Leo'], members, self)).toEqual(['u-leo']));

  it('"Mia" (4 chars, no member named Mia) → empty', () =>
    expect(resolveAssignees(['Mia'], members, self)).toEqual([]));
});

describe('resolveAssignees', () => {
  const members: FamilyMemberLite[] = [
    { user_id: 'u-mia', name: 'Mia Rivera' },
    { user_id: 'u-leo', name: 'Leo Rivera' },
  ];
  const self = { userId: 'u-self', name: 'Alex Rivera' };

  it('null/empty → []', () => {
    expect(resolveAssignees(null, members, self)).toEqual([]);
    expect(resolveAssignees([], members, self)).toEqual([]);
  });
  it('matches a member by first name (case-insensitive)', () => {
    expect(resolveAssignees(['mia'], members, self)).toEqual(['u-mia']);
    expect(resolveAssignees(['Leo'], members, self)).toEqual(['u-leo']);
  });
  it('"me"/"myself"/own name → self', () => {
    expect(resolveAssignees(['me'], members, self)).toEqual(['u-self']);
    expect(resolveAssignees(['Alex'], members, self)).toEqual(['u-self']);
  });
  it('resolves multiple and dedupes', () => {
    expect(resolveAssignees(['Mia', 'Leo', 'mia'], members, self)).toEqual(['u-mia', 'u-leo']);
  });
  it('drops names with no matching member', () => {
    expect(resolveAssignees(['Grandma'], members, self)).toEqual([]);
  });
});

describe('buildTaskCaptureRows assignment', () => {
  it('assigned to another member, with a parent list → SHARED list item with pill data', () => {
    const rows = buildTaskCaptureRows(entry({ type: 'task', title: 'Walk the dog' }), 'u-self', {
      assignedUserIds: ['u-mia'], familyId: 'fam-1', parentId: 'list-1',
    });
    expect(rows).toEqual([
      { title: 'Walk the dog', type: 'shared', user_id: 'u-self', completed: false, due_date: null,
        assigned_to_users: ['u-mia'], family_id: 'fam-1', visible_to: 'family', parent_id: 'list-1' },
    ]);
  });
  it('self-only assignment stays a personal task', () => {
    const rows = buildTaskCaptureRows(entry({ type: 'task', title: 'Call dentist' }), 'u-self', {
      assignedUserIds: ['u-self'], familyId: 'fam-1', parentId: 'list-1',
    });
    expect(rows[0].type).toBe('task');
    expect(rows[0].assigned_to_users).toEqual(['u-self']);
    expect(rows[0]).not.toHaveProperty('parent_id');
  });
  it('assigned to another member but no parent list → personal task (still records assignees)', () => {
    const rows = buildTaskCaptureRows(entry({ type: 'task', title: 'Walk the dog' }), 'u-self', {
      assignedUserIds: ['u-mia'], familyId: 'fam-1', parentId: null,
    });
    expect(rows[0].type).toBe('task');
    expect(rows[0].assigned_to_users).toEqual(['u-mia']);
  });
  it('no assignees → plain personal task, no assignment fields', () => {
    const rows = buildTaskCaptureRows(entry({ type: 'task', title: 'Buy milk' }), 'u-self');
    expect(rows[0]).not.toHaveProperty('assigned_to_users');
    expect(rows[0].type).toBe('task');
  });
});

describe('buildShoppingCaptureRows assignment', () => {
  it('shared shopping with assignees → assigned_to_users + family_id', () => {
    const rows = buildShoppingCaptureRows(entry({ type: 'shopping', title: 'Milk' }), 'u-self', {
      assignedUserIds: ['u-mia'], familyId: 'fam-1',
    });
    expect(rows[0]).toMatchObject({ title: 'Milk', type: 'shopping', assigned_to_users: ['u-mia'], family_id: 'fam-1' });
  });
  it('personal shopping ignores assignees and family', () => {
    const rows = buildShoppingCaptureRows(entry({ type: 'shopping_personal', title: 'Milk' }), 'u-self', {
      assignedUserIds: ['u-mia'], familyId: 'fam-1',
    });
    expect(rows[0]).not.toHaveProperty('assigned_to_users');
    expect(rows[0]).not.toHaveProperty('family_id');
  });
  it('shared shopping always carries family_id (so RLS shows it to the family)', () => {
    const rows = buildShoppingCaptureRows(entry({ type: 'shopping', title: 'Eggs' }), 'u-self', { familyId: 'fam-1' });
    expect(rows[0]).toMatchObject({ type: 'shopping', family_id: 'fam-1' });
    expect(rows[0]).not.toHaveProperty('assigned_to_users');
  });
});

describe('buildCalendarCaptureItem attendees', () => {
  const base = { id: 'e1', now: new Date('2026-06-14T12:00:00Z'), userId: 'u-self' };
  it('adds resolved assignees as attendees', () => {
    const item = buildCalendarCaptureItem(entry({ type: 'event', title: 'Game', date: '2026-06-20', time: '15:00' }), {
      ...base, rawInput: 'add game saturday assign to Mia', attendeeUserIds: ['u-mia'],
    });
    expect(item.attendees).toEqual(['u-mia']);
  });
  it('family-calendar intent includes the creator alongside assignees', () => {
    const item = buildCalendarCaptureItem(entry({ type: 'event', title: 'Trip', date: '2026-06-20' }), {
      ...base, rawInput: 'add trip to our family calendar', attendeeUserIds: ['u-mia'],
    });
    expect(item.attendees).toEqual(['u-self', 'u-mia']);
  });
  it('no assignees, not family → no attendees field', () => {
    const item = buildCalendarCaptureItem(entry({ type: 'event', title: 'Solo', date: '2026-06-20' }), {
      ...base, rawInput: 'add solo event',
    });
    expect(item).not.toHaveProperty('attendees');
  });
});

describe('EZ Capture shopping persistence rows', () => {
  it('routes personal shopping to shopping_personal', () => {
    expect(buildShoppingCaptureRows(entry({
      type: 'shopping_personal',
      title: 'Milk, eggs and bread',
    }), 'user-1')).toEqual([
      { title: 'Milk', type: 'shopping_personal', user_id: 'user-1', completed: false },
      { title: 'eggs', type: 'shopping_personal', user_id: 'user-1', completed: false },
      { title: 'bread', type: 'shopping_personal', user_id: 'user-1', completed: false },
    ]);
  });

  it('routes shared shopping to shopping', () => {
    expect(buildShoppingCaptureRows(entry({ type: 'shopping', title: 'Milk' }), 'user-1')[0].type).toBe('shopping');
  });
});

describe('EZ Capture calendar persistence item', () => {
  it('builds a timed family event with explicit end time', () => {
    const item = buildCalendarCaptureItem(entry({
      type: 'event',
      title: 'School meeting',
      date: '2026-06-20',
      time: '14:00',
      endTime: '15:30',
      location: 'School',
    }), {
      id: 'event-1',
      now: new Date('2026-06-12T10:00:00Z'),
      rawInput: 'Add school meeting to our family calendar',
      userId: 'user-1',
    });

    expect(item).toMatchObject({
      id: 'event-1',
      title: 'School meeting',
      allDay: false,
      type: 'event',
      attendees: ['user-1'],
      location: 'School',
    });
    expect(item.endDate).toBe(new Date('2026-06-20T15:30').toISOString());
  });

  it('does not share an event from a person name alone', () => {
    const item = buildCalendarCaptureItem(entry({ title: 'Meeting with Badr' }), {
      id: 'event-2',
      now: new Date('2026-06-12T10:00:00Z'),
      rawInput: 'Business meeting with Badr',
      userId: 'user-1',
    });
    expect(item).not.toHaveProperty('attendees');
  });
});

describe('EZ Capture feature questions', () => {
  it.each([
    'How do I invite my family?',
    'Wie ändere ich die Sprache?',
    'Comment synchroniser mon calendrier ?',
    'Come aggiungo un evento?',
  ])('routes "%s" to guide mode', question => {
    expect(isFeatureHelpQuery(question)).toBe(true);
  });

  it('does not route an event command to guide mode', () => {
    expect(isFeatureHelpQuery('Dentist next Tuesday at 3pm')).toBe(false);
  });
});

describe('family calendar intent', () => {
  it('requires an explicit family/shared calendar phrase', () => {
    expect(isFamilyCalendarIntent('Add dinner to our family calendar')).toBe(true);
    expect(isFamilyCalendarIntent('Dinner with my family tomorrow')).toBe(false);
  });
});

// ── parseMessageIntent – multilingual ────────────────────────────────────────

describe('parseMessageIntent – DE/FR/IT/ES/PT', () => {
  it('DE schick X eine Nachricht', () => {
    expect(parseMessageIntent('Schick Sofia eine Nachricht, dass ich später komme'))
      .toEqual({ to: 'Sofia', body: 'ich später komme' });
  });
  it('DE sag X, dass', () => {
    expect(parseMessageIntent('Sag Sofia, dass das Essen fertig ist'))
      .toEqual({ to: 'Sofia', body: 'das Essen fertig ist' });
  });
  it('DE "sag X, sie soll" is NOT a message (assignment)', () => {
    expect(parseMessageIntent('Sag Sofia, sie soll den Tisch decken')).toBeNull();
  });
  it('FR envoie un message à X', () => {
    expect(parseMessageIntent("Envoie un message à Sofia que je rentre tard"))
      .toEqual({ to: 'Sofia', body: 'je rentre tard' });
  });
  it('FR dis à X que', () => {
    expect(parseMessageIntent('Dis à Sofia que le dîner est prêt'))
      .toEqual({ to: 'Sofia', body: 'le dîner est prêt' });
  });
  it('IT manda un messaggio a X', () => {
    expect(parseMessageIntent('Manda un messaggio a Sofia che arrivo tardi'))
      .toEqual({ to: 'Sofia', body: 'arrivo tardi' });
  });
  it('ES envía un mensaje a X', () => {
    expect(parseMessageIntent('Envía un mensaje a Sofia que llego tarde'))
      .toEqual({ to: 'Sofia', body: 'llego tarde' });
  });
  it('ES dile a X que', () => {
    expect(parseMessageIntent('Dile a Sofia que la cena está lista'))
      .toEqual({ to: 'Sofia', body: 'la cena está lista' });
  });
  it('PT envia uma mensagem para X', () => {
    expect(parseMessageIntent('Envia uma mensagem para a Sofia que chego tarde'))
      .toEqual({ to: 'Sofia', body: 'chego tarde' });
  });
  it('EN "tell X to" still NOT a message (assignment)', () => {
    expect(parseMessageIntent('Tell Sofia to set the table')).toBeNull();
  });
});

// ── buildShoppingCaptureRows – locale-aware "and" splitting ──────────────────

describe('buildShoppingCaptureRows – multilingual item splitting', () => {
  const base = { type: 'shopping' as const, date: null, time: null, endTime: null,
    location: null, assignees: null, reminder: null, notes: null, mood: null };

  it('DE: "Milch und Brot" → two items', () => {
    const rows = buildShoppingCaptureRows({ ...base, title: 'Milch und Brot' }, 'u1', { lang: 'de' });
    expect(rows.map(r => r.title)).toEqual(['Milch', 'Brot']);
  });
  it('FR: "lait et pain" → two items', () => {
    const rows = buildShoppingCaptureRows({ ...base, title: 'lait et pain' }, 'u1', { lang: 'fr' });
    expect(rows.map(r => r.title)).toEqual(['lait', 'pain']);
  });
  it('IT: "latte e pane" → two items', () => {
    const rows = buildShoppingCaptureRows({ ...base, title: 'latte e pane' }, 'u1', { lang: 'it' });
    expect(rows.map(r => r.title)).toEqual(['latte', 'pane']);
  });
  it('ES: "leche y pan" → two items', () => {
    const rows = buildShoppingCaptureRows({ ...base, title: 'leche y pan' }, 'u1', { lang: 'es' });
    expect(rows.map(r => r.title)).toEqual(['leche', 'pan']);
  });
  it('PT: "leite e pão" → two items', () => {
    const rows = buildShoppingCaptureRows({ ...base, title: 'leite e pão' }, 'u1', { lang: 'pt' });
    expect(rows.map(r => r.title)).toEqual(['leite', 'pão']);
  });
  it('EN: "vitamin E" is NOT split (conjunction is locale-scoped)', () => {
    const rows = buildShoppingCaptureRows({ ...base, title: 'vitamin E' }, 'u1', { lang: 'en' });
    expect(rows.map(r => r.title)).toEqual(['vitamin E']);
  });
  it('EN: "milk and bread" still splits', () => {
    const rows = buildShoppingCaptureRows({ ...base, title: 'milk and bread' }, 'u1', { lang: 'en' });
    expect(rows.map(r => r.title)).toEqual(['milk', 'bread']);
  });
});

// ── extractAssignmentIntent ──────────────────────────────────────────────────

describe('extractAssignmentIntent', () => {
  it('EN: "fix broken shelf and assign to Sofia"', () => {
    expect(extractAssignmentIntent('fix broken shelf and assign to Sofia'))
      .toEqual({ names: ['Sofia'], cleaned: 'fix broken shelf' });
  });
  // Regression: user said "assign it Sophia" (no "to") — was not extracted
  it('EN: "assign it Sophia" without "to"', () => {
    const r = extractAssignmentIntent('fix broken shelf and assign it Sophia');
    expect(r.names).toContain('Sophia');
    expect(r.cleaned).not.toContain('assign');
  });
  it('EN: "assign it to Sofia" mid-sentence', () => {
    expect(extractAssignmentIntent('water the plants, assign it to Sofia'))
      .toEqual({ names: ['Sofia'], cleaned: 'water the plants,' });
  });
  it('EN: "tell Sofia to walk the dog"', () => {
    expect(extractAssignmentIntent('tell Sofia to walk the dog'))
      .toEqual({ names: ['Sofia'], cleaned: 'walk the dog' });
  });
  it('EN: "ask Sofia to set the table"', () => {
    expect(extractAssignmentIntent('ask Sofia to set the table'))
      .toEqual({ names: ['Sofia'], cleaned: 'set the table' });
  });
  it('DE: "Repariere das Regal und weise es Sofia zu"', () => {
    expect(extractAssignmentIntent('Repariere das Regal und weise es Sofia zu'))
      .toEqual({ names: ['Sofia'], cleaned: 'Repariere das Regal' });
  });
  it('DE: "Sofia soll den Tisch decken"', () => {
    expect(extractAssignmentIntent('Sofia soll den Tisch decken'))
      .toEqual({ names: ['Sofia'], cleaned: 'den Tisch decken' });
  });
  it('FR: "demande à Sofia de ranger le salon"', () => {
    expect(extractAssignmentIntent('demande à Sofia de ranger le salon'))
      .toEqual({ names: ['Sofia'], cleaned: 'ranger le salon' });
  });
  it('IT: "chiedi a Sofia di apparecchiare"', () => {
    expect(extractAssignmentIntent('chiedi a Sofia di apparecchiare'))
      .toEqual({ names: ['Sofia'], cleaned: 'apparecchiare' });
  });
  it('ES: "dile a Sofia que riegue las plantas"', () => {
    expect(extractAssignmentIntent('dile a Sofia que riegue las plantas'))
      .toEqual({ names: ['Sofia'], cleaned: 'riegue las plantas' });
  });
  it('PT: "envia uma mensagem para Sofia"', () => {
    const r = extractAssignmentIntent('add task and assign it Sofia');
    expect(r.names).toContain('Sofia');
  });
  it('no assignment → names empty, text untouched', () => {
    expect(extractAssignmentIntent('call Sofia about dinner plans'))
      .toEqual({ names: [], cleaned: 'call Sofia about dinner plans' });
  });
  it('"get ready to go" is not an assignment', () => {
    expect(extractAssignmentIntent('get ready to go'))
      .toEqual({ names: [], cleaned: 'get ready to go' });
  });
});

// ── dropAssigneesMentionedInTitle ────────────────────────────────────────────

describe('dropAssigneesMentionedInTitle', () => {
  it('drops assignee whose name is in the title ("call Sofia")', () => {
    expect(dropAssigneesMentionedInTitle(['Sofia'], 'call Sofia')).toBeNull();
  });
  it('keeps assignee not mentioned in the title', () => {
    expect(dropAssigneesMentionedInTitle(['Sofia'], 'fix broken shelf')).toEqual(['Sofia']);
  });
  it('mixed: keeps only unmentioned names', () => {
    expect(dropAssigneesMentionedInTitle(['Sofia', 'Alex'], 'pick up Sofia from school')).toEqual(['Alex']);
  });
  it('case-insensitive match', () => {
    expect(dropAssigneesMentionedInTitle(['sofia'], 'Call Sofia about the plumber')).toBeNull();
  });
  it('null/empty passthrough', () => {
    expect(dropAssigneesMentionedInTitle(null, 'anything')).toBeNull();
    expect(dropAssigneesMentionedInTitle([], 'anything')).toEqual([]);
  });
});

describe('extractAssignmentIntent – accented names', () => {
  it('assign to José (accent-final name)', () => {
    expect(extractAssignmentIntent('fix the fence and assign to José'))
      .toEqual({ names: ['José'], cleaned: 'fix the fence' });
  });
});
