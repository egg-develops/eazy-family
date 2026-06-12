import { describe, expect, it } from 'vitest';
import {
  buildCalendarCaptureItem,
  buildShoppingCaptureRows,
  buildTaskCaptureRows,
  isFamilyCalendarIntent,
  isFeatureHelpQuery,
  type EZParsedEntry,
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
