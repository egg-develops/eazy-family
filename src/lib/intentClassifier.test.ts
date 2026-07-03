import { describe, it, expect } from 'vitest';
import { classifyText, guardAIType, isSharedTaskDestination } from './intentClassifier';

// ── classifyText – shared shopping (default / "our") ────────────────────────

describe('classifyText – shopping (shared)', () => {
  it('no pronoun: buy keyword',                   () => expect(classifyText('buy milk')).toBe('shopping'));
  it('no pronoun: pick up',                       () => expect(classifyText('pick up peanut butter')).toBe('shopping'));
  it('no pronoun: grab',                          () => expect(classifyText('grab bread from the store')).toBe('shopping'));
  it('our shopping list',                         () => expect(classifyText('add coffee to our shopping list')).toBe('shopping'));
  it('our grocery list',                          () => expect(classifyText('add eggs to our grocery list')).toBe('shopping'));
  it('family list',                               () => expect(classifyText('add juice to the family list')).toBe('shopping'));
  it('the shopping list (no possessive)',         () => expect(classifyText('add wine to the shopping list')).toBe('shopping'));
  it('groceries (no possessive)',                 () => expect(classifyText('groceries: milk, eggs, bread')).toBe('shopping'));
  it('to buy',                                    () => expect(classifyText('coffee to buy')).toBe('shopping'));
});

// ── classifyText – personal shopping ("my") ─────────────────────────────────

describe('classifyText – shopping_personal', () => {
  it('my shopping list',                          () => expect(classifyText('add cottage cheese to my shopping list')).toBe('shopping_personal'));
  it('my grocery list',                           () => expect(classifyText('add oat milk to my grocery list')).toBe('shopping_personal'));
  it('my list',                                   () => expect(classifyText('add wine to my list')).toBe('shopping_personal'));
  it('my groceries',                              () => expect(classifyText('add apples to my groceries')).toBe('shopping_personal'));
  it('for me',                                    () => expect(classifyText('get protein bars for me')).toBe('shopping_personal'));
  it('put on my list',                            () => expect(classifyText('put avocado on my list')).toBe('shopping_personal'));
});

// ── classifyText – reminder ──────────────────────────────────────────────────

describe('classifyText – reminder', () => {
  it('remind me',         () => expect(classifyText('remind me to call mom')).toBe('reminder'));
  it("don't forget",      () => expect(classifyText("don't forget to pay rent")).toBe('reminder'));
  it('remember to',       () => expect(classifyText('remember to take out the trash')).toBe('reminder'));
});

// ── classifyText – journal ───────────────────────────────────────────────────

describe('classifyText – journal', () => {
  it('grateful',          () => expect(classifyText('grateful for a great day')).toBe('journal'));
  it('today i',           () => expect(classifyText('today i felt really proud of the kids')).toBe('journal'));
  it('dear diary',        () => expect(classifyText('dear diary, tough morning')).toBe('journal'));
  it('reflection',        () => expect(classifyText('evening reflection: feeling calm')).toBe('journal'));
});

// ── classifyText – ritual ────────────────────────────────────────────────────

describe('classifyText – ritual', () => {
  it('morning routine',   () => expect(classifyText('morning routine: meditation')).toBe('ritual'));
  it('daily habit',       () => expect(classifyText('daily walk with the dog')).toBe('ritual'));
  it('ritual keyword',    () => expect(classifyText('ritual: yoga before work')).toBe('ritual'));
});

// ── classifyText – task ──────────────────────────────────────────────────────

describe('classifyText – task', () => {
  it('clean',                     () => expect(classifyText('clean the kitchen')).toBe('task'));
  it('clean out (compound)',       () => expect(classifyText('clean out basement')).toBe('task'));
  it('clear',                     () => expect(classifyText('clear the garage')).toBe('task'));
  it('sort',                      () => expect(classifyText('sort through the mail')).toBe('task'));
  it('declutter',                 () => expect(classifyText('declutter the closet')).toBe('task'));
  it('wash',                      () => expect(classifyText('wash the car')).toBe('task'));
  it('call',                      () => expect(classifyText('call the dentist')).toBe('task'));
  it('fix',                       () => expect(classifyText('fix the leaky tap')).toBe('task'));
  it('mow',                       () => expect(classifyText('mow the lawn')).toBe('task'));
  it('email',                     () => expect(classifyText('email the school')).toBe('task'));
  it('pack',                      () => expect(classifyText('pack for the trip')).toBe('task'));
  it('unpack',                    () => expect(classifyText('unpack the boxes')).toBe('task'));
  // "my list" with a task verb should still be task, not shopping_personal
  it('"add to my list" with task verb → task', () =>
    expect(classifyText('add clean the terrace to my list')).toBe('task'));
});

// ── classifyText – event ─────────────────────────────────────────────────────

describe('classifyText – event', () => {
  it('tomorrow',          () => expect(classifyText("doctor's appointment tomorrow")).toBe('event'));
  it('day of week',       () => expect(classifyText('lunch with Sarah on Friday')).toBe('event'));
  it('time',              () => expect(classifyText('meeting at 3pm')).toBe('event'));
  it('birthday keyword',  () => expect(classifyText("Mia's birthday party")).toBe('event'));
  it('concert keyword',   () => expect(classifyText('concert next Saturday')).toBe('event'));
});

// ── guardAIType ──────────────────────────────────────────────────────────────

describe('guardAIType – personal scope correction', () => {
  it('AI says shopping, text has "my list" → shopping_personal', () =>
    expect(guardAIType('shopping', 'add coffee to my shopping list', null, null)).toBe('shopping_personal'));

  it('AI says shopping, text has "my groceries" → shopping_personal', () =>
    expect(guardAIType('shopping', 'add apples to my groceries', null, null)).toBe('shopping_personal'));

  it('AI says event, text is "our shopping list" → shopping (shared)', () =>
    expect(guardAIType('event', 'add coffee to our shopping list', null, null)).toBe('shopping'));

  it('AI says event, text is "my shopping list" → shopping_personal', () =>
    expect(guardAIType('event', 'add milk to my shopping list', null, null)).toBe('shopping_personal'));
});

describe('guardAIType – standard overrides', () => {
  it('AI says event, buy keyword → shopping', () =>
    expect(guardAIType('event', 'buy milk', null, null)).toBe('shopping'));

  it('AI says event, task text, no date/time → task', () =>
    expect(guardAIType('event', 'clean the bathroom', null, null)).toBe('task'));

  it('AI says event, task text, has date but no time → task (date = due_date)', () =>
    expect(guardAIType('event', 'clean the bathroom', '2026-06-01', null)).toBe('task'));

  it('AI says event, task text, has time → keep event', () =>
    expect(guardAIType('event', 'clean the bathroom', '2026-06-01', '10:00')).toBe('event'));

  it('"clean out basement" + AI date but no time → task (regression)', () =>
    expect(guardAIType('event', 'clean out basement', '2026-06-15', null)).toBe('task'));
});

describe('guardAIType – passes through correct AI results', () => {
  it('shopping_personal unchanged',  () =>
    expect(guardAIType('shopping_personal', 'add wine to my list', null, null)).toBe('shopping_personal'));

  it('task unchanged',               () =>
    expect(guardAIType('task', 'call the dentist', null, null)).toBe('task'));

  it('reminder unchanged',           () =>
    expect(guardAIType('reminder', 'remind me about rent', null, null)).toBe('reminder'));
});

// ── Regression tests — real failures reported by testers ────────────────────
// Each test is named with the exact utterance that failed so future regressions
// are immediately identifiable.

describe('regression – voice command misclassifications', () => {
  // Reported: "Add peanut butter to my shopping list" → added as calendar event
  it('"Add peanut butter to my shopping list" → shopping_personal', () =>
    expect(classifyText('Add peanut butter to my shopping list')).toBe('shopping_personal'));

  // Reported: "Add a task to clean out storage closet this week" → added as event
  it('"Add a task to clean out storage closet this week" → task', () =>
    expect(classifyText('Add a task to clean out storage closet this week')).toBe('task'));

  // Explicit "task" keyword must always override event classification
  it('"add a task to..." always resolves to task', () =>
    expect(classifyText('add a task to organise the pantry')).toBe('task'));

  it('"create a task to fix the sink" → task', () =>
    expect(classifyText('create a task to fix the sink')).toBe('task'));
});

// Reported: "add fix broken shelf to our shared to-do list and assign it Sophia"
// → "our shared to-do list" was not recognised as a shared destination
describe('isSharedTaskDestination', () => {
  it('"our shared to-do list" → true',     () => expect(isSharedTaskDestination('add fix broken shelf to our shared to-do list')).toBe(true));
  it('"our to-do list" → true',            () => expect(isSharedTaskDestination('add task to our to-do list')).toBe(true));
  it('"family task list" → true',          () => expect(isSharedTaskDestination('put it in the family task list')).toBe(true));
  it('"shared tasks" → true',              () => expect(isSharedTaskDestination('add to shared tasks')).toBe(true));
  it('"our tasks" → true',                 () => expect(isSharedTaskDestination('add to our tasks')).toBe(true));
  it('"my list" → false (personal)',       () => expect(isSharedTaskDestination('add milk to my list')).toBe(false));
  it('no list signal → false',             () => expect(isSharedTaskDestination('fix the shelf')).toBe(false));
});

describe('regression – guardAIType 00:00 not treated as specific time', () => {
  // Reported: AI returned time:"00:00" for "this week" → blocked task correction
  it('AI says event + task verb + time 00:00 → task (00:00 is not a specific time)', () =>
    expect(guardAIType('event', 'clean out storage closet this week', '2026-06-07', '00:00')).toBe('task'));

  it('AI says event + explicit task keyword + time 00:00 → task', () =>
    expect(guardAIType('event', 'add a task to clean out storage closet', '2026-06-07', '00:00')).toBe('task'));

  it('AI says event + task verb + real time 09:00 → stays event', () =>
    expect(guardAIType('event', 'clean the office at 9am', '2026-06-07', '09:00')).toBe('event'));
});

describe('regression – shopping scope edge cases', () => {
  // Reported: "our shopping list" must stay shared even with "my" elsewhere in text
  it('"add to our shopping list" → shopping (not personal)', () =>
    expect(classifyText('add peanut butter to our shopping list')).toBe('shopping'));

  // Exact field report (June 2026): this utterance created a calendar EVENT on
  // the shipped build. Logic is correct here — the shipped build was stale.
  // Pin both the AI=event guard and the bogus-time variant.
  it('guard: AI=event, "add peanut butter to our shopping list" → shopping', () =>
    expect(guardAIType('event', 'add peanut butter to our shopping list', null, null)).toBe('shopping'));
  it('guard: AI=event + bogus time, "add peanut butter to our shopping list" → shopping', () =>
    expect(guardAIType('event', 'add peanut butter to our shopping list', '2026-06-13', '09:00')).toBe('shopping'));

  it('"family shopping list" → shopping (shared)', () =>
    expect(classifyText('add bread to the family shopping list')).toBe('shopping'));

  // German equivalents
  it('DE: "auf unsere Einkaufsliste" → shopping', () =>
    expect(classifyText('Erdnussbutter auf unsere Einkaufsliste')).toBe('shopping'));

  it('DE: "auf meine Einkaufsliste" → shopping_personal', () =>
    expect(classifyText('Erdnussbutter auf meine Einkaufsliste')).toBe('shopping_personal'));
});

// ── Regression — reported 2026-06-11 (web + TestFlight) ─────────────────────
// Both utterances were being saved as calendar events. Root gaps fixed:
//  1) explicit plural destination "tasks" wasn't matched by the guard's
//     /\btask\b/ (only singular), and
//  2) an AI-attached time defeated the task override.
describe('regression – 2026-06-11 EZ button → wrong destination', () => {
  it('"Add peanut butter to our shared shopping list" → shopping', () =>
    expect(classifyText('Add peanut butter to our shared shopping list')).toBe('shopping'));

  it('guard: AI=event, "…to our shared shopping list" → shopping', () =>
    expect(guardAIType('event', 'Add peanut butter to our shared shopping list', null, null)).toBe('shopping'));

  it('"add fix broken shelf to our tasks" → task', () =>
    expect(classifyText('add fix broken shelf to our tasks')).toBe('task'));

  it('guard: AI=event, "…to our tasks" → task (plural destination matched)', () =>
    expect(guardAIType('event', 'add fix broken shelf to our tasks', null, null)).toBe('task'));

  // explicit task destination must win even if the AI hallucinated a real time
  it('guard: AI=event + "to our tasks" + time 15:00 → task (explicit destination beats time)', () =>
    expect(guardAIType('event', 'add fix broken shelf to our tasks', '2026-06-12', '15:00')).toBe('task'));

  it('plural "to-dos" destination → task', () =>
    expect(guardAIType('event', 'add water the plants to my to-dos', null, null)).toBe('task'));

  // a real event with a task-ish word but a genuine time must still stay an event
  it('"dinner with the team at 7pm" → event (not hijacked)', () =>
    expect(guardAIType('event', 'dinner with the team at 7pm', '2026-06-12', '19:00')).toBe('event'));
});

// ── classifyText – multilingual (FR / IT / ES / PT) ──────────────────────────
// The deterministic fallback must recognise all six app languages, not just
// EN + DE — it is what users get when the AI parse fails or times out.

describe('classifyText – reminder (FR/IT/ES/PT)', () => {
  it('FR rappelle-moi',   () => expect(classifyText("rappelle-moi d'appeler maman")).toBe('reminder'));
  it("FR n'oublie pas",   () => expect(classifyText("n'oublie pas le loyer")).toBe('reminder'));
  it('IT ricordami',      () => expect(classifyText('ricordami di chiamare la mamma')).toBe('reminder'));
  it('ES recuérdame',     () => expect(classifyText('recuérdame llamar a mamá')).toBe('reminder'));
  it('ES no olvides',     () => expect(classifyText('no olvides pagar el alquiler')).toBe('reminder'));
  it('PT lembra-me',      () => expect(classifyText('lembra-me de ligar à mãe')).toBe('reminder'));
});

describe('classifyText – journal (FR/IT/ES/PT)', () => {
  it('FR je me sens',     () => expect(classifyText('je me sens fier aujourd\'hui')).toBe('journal'));
  it('IT mi sento',       () => expect(classifyText('mi sento felice')).toBe('journal'));
  it('ES me siento',      () => expect(classifyText('me siento orgullosa')).toBe('journal'));
  it('PT sinto-me',       () => expect(classifyText('sinto-me feliz')).toBe('journal'));
});

describe('classifyText – event (FR/IT/ES/PT date words)', () => {
  it('FR demain',         () => expect(classifyText('dentiste demain 15h')).toBe('event'));
  it('FR rendez-vous',    () => expect(classifyText('rendez-vous chez le médecin')).toBe('event'));
  it('IT domani',         () => expect(classifyText('dentista domani')).toBe('event'));
  it('IT compleanno',     () => expect(classifyText('compleanno di Luca sabato')).toBe('event'));
  it('ES cita',           () => expect(classifyText('cita con el dentista el lunes')).toBe('event'));
  it('PT amanhã',         () => expect(classifyText('dentista amanhã')).toBe('event'));
});

describe('classifyText – shopping stays shopping in FR/IT/ES/PT', () => {
  it('FR acheter',        () => expect(classifyText('acheter du lait')).toBe('shopping'));
  it('IT comprare',       () => expect(classifyText('comprare il latte')).toBe('shopping'));
  it('ES mi lista',       () => expect(classifyText('añadir vino a mi lista')).toBe('shopping_personal'));
  it('PT nossa lista',    () => expect(classifyText('adicionar leite à nossa lista')).toBe('shopping'));
});

// ── classifyText – reported misclassifications (2026-07-02 audit round 2) ────

describe('classifyText – obvious tasks no longer classified as events', () => {
  it('take out the trash',        () => expect(classifyText('take out the trash')).toBe('task'));
  it('take out the trash tomorrow (still task)', () => expect(classifyText('take out the trash tomorrow')).toBe('task'));
  it('pay the electricity bill',  () => expect(classifyText('pay the electricity bill')).toBe('task'));
  it('iron the shirts',           () => expect(classifyText('iron the shirts')).toBe('task'));
  it('feed the cat',              () => expect(classifyText('feed the cat')).toBe('task'));
  it('DE Müll rausbringen',       () => expect(classifyText('Müll rausbringen')).toBe('task'));
  it('DE Rechnung bezahlen',      () => expect(classifyText('Rechnung bezahlen')).toBe('task'));
  it('FR payer la facture',       () => expect(classifyText('payer la facture')).toBe('task'));
  it('IT pagare la bolletta',     () => expect(classifyText('pagare la bolletta')).toBe('task'));
  it('ES sacar la basura',        () => expect(classifyText('sacar la basura')).toBe('task'));
  it('PT tirar o lixo',           () => expect(classifyText('tirar o lixo')).toBe('task'));
  it('ambiguous input defaults to task, not event', () =>
    expect(classifyText('new tires for the car')).toBe('task'));
  it('dated input still an event', () => expect(classifyText('team dinner friday 7pm')).toBe('event'));
});

describe('classifyText / guardAIType – personal scope (declined German forms)', () => {
  it('DE "zu meiner Liste" → shopping_personal', () =>
    expect(classifyText('Milch zu meiner Liste hinzufügen')).toBe('shopping_personal'));
  it('DE "auf meine Liste" → shopping_personal', () =>
    expect(classifyText('Milch auf meine Liste')).toBe('shopping_personal'));
  it('DE "zu unserer Liste" → shopping (shared)', () =>
    expect(classifyText('Milch zu unserer Liste hinzufügen')).toBe('shopping'));
  it('EN "for myself" → shopping_personal', () =>
    expect(classifyText('buy protein bars for myself')).toBe('shopping_personal'));
  it('guard: AI shopping + "zu meiner Liste" → shopping_personal', () =>
    expect(guardAIType('shopping', 'Milch zu meiner Liste hinzufügen', null, null)).toBe('shopping_personal'));
});

describe('guardAIType – new task verbs override event', () => {
  it('AI event + take out the trash tomorrow (no time) → task', () =>
    expect(guardAIType('event', 'take out the trash tomorrow', '2026-07-03', null)).toBe('task'));
  it('AI event + pay bills (no time) → task', () =>
    expect(guardAIType('event', 'pay the bills this week', '2026-07-05', null)).toBe('task'));
});

// ── Accent-boundary regressions: JS \b is ASCII-only, so "para mí" and
// "à minha lista" never matched until the lookaround rewrite ────────────────

describe('classifyText – accented personal-scope phrases', () => {
  it('ES "para mí" → shopping_personal', () =>
    expect(classifyText('añade vino para mí')).toBe('shopping_personal'));
  it('PT "à minha lista" → shopping_personal', () =>
    expect(classifyText('adicionar leite à minha lista')).toBe('shopping_personal'));
  it('FR "à 15h" is an event signal', () =>
    expect(classifyText('médecin à 15h')).toBe('event'));
  it('IT "lunedì" is an event signal', () =>
    expect(classifyText('dentista lunedì')).toBe('event'));
});
