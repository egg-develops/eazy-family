import { describe, expect, it } from 'vitest';
import {
  buildCalendarCaptureItem,
  buildShoppingCaptureRows,
  buildTaskCaptureRows,
  isFamilyCalendarIntent,
  isFeatureHelpQuery,
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
  it('personal shopping ignores assignees', () => {
    const rows = buildShoppingCaptureRows(entry({ type: 'shopping_personal', title: 'Milk' }), 'u-self', {
      assignedUserIds: ['u-mia'], familyId: 'fam-1',
    });
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
