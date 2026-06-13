export type CaptureType = 'event' | 'task' | 'shopping' | 'shopping_personal' | 'reminder' | 'ritual' | 'journal';

// "my list/shopping/groceries" signals → personal list (EN + DE + FR + IT + ES + PT)
const MY_LIST = /\b(my (shopping list|grocery list|groceries|list)|for me\b|meine (einkaufsliste|liste|einkäufe)|für mich\b|ma (liste|liste de courses|liste des courses)|mes (courses|achats)|pour moi\b|mia (lista|lista della spesa)|per me\b|mi (lista|lista de compras|lista de la compra)|para mí\b|minha (lista|lista de compras)|para mim\b)/i;
// "our/family/shared" signals → shared list (EN + DE + FR + IT + ES + PT)
const OUR_LIST = /\b(our (shopping list|grocery list|groceries|list)|family (list|shopping)|shared list|unsere (einkaufsliste|liste|einkäufe)|familienliste|gemeinsame liste|notre (liste|liste de courses)|liste (familiale|commune|partagée)|nostra (lista|lista della spesa)|lista (di famiglia|condivisa|familiare)|nuestra (lista|lista de compras)|lista (familiar|compartida)|nossa (lista|lista de compras)|lista da família|lista compartilhada)\b/i;
// Generic shopping triggers (no scope signal) — EN + DE + FR + IT + ES + PT
const BUY_VERBS = /\b(buy|get|grab|pick up|kaufen|einkaufen|besorgen|mitbringen|holen|acheter|prendre|courses|faire les courses|comprare|prendere|fare la spesa|comprar|ir de compras|ir às compras)\b/i;
const ADD_TO_LIST = /\b(add|put)\b.+\b(shopping list|grocery list|groceries|list)\b|(?:auf die|zur|auf meine|auf unsere)\s+(?:einkaufsliste|liste)\b|(?:ajouter|mettre|rajouter)\b.+\b(liste|courses)\b|(?:à ma liste|sur ma liste|à notre liste|sur la liste)\b|(?:aggiungere|mettere)\b.+\b(lista|spesa)\b|(?:alla mia lista|sulla lista|alla lista)\b|(?:añadir|poner|agregar)\b.+\b(lista|compras)\b|(?:a mi lista|en la lista)\b|(?:adicionar|colocar|pôr)\b.+\b(lista|compras)\b|(?:à minha lista|na lista)\b/i;

function isPersonalScope(lower: string): boolean {
  return MY_LIST.test(lower) && !OUR_LIST.test(lower);
}

const TASK_VERBS = /\b(clean|clear|sort|declutter|organis|organiz|tidy|pack|unpack|fix|repair|mow|vacuum|sweep|mop|wash|water|call|email|book|return|drop off|finish|complete|task|todo|to-do|aufräumen|putzen|waschen|kochen|anrufen|reparieren|mähen|staubsaugen|wischen|gießen|giessen|buchen|abgeben|fertigstellen|erledigen|auspacken|sortieren|bringen|nettoyer|ranger|organiser|réparer|tondre|aspirer|arroser|appeler|finir|trier|faire le ménage|pulire|sistemare|riparare|falciare|aspirare|lavare|annaffiare|chiamare|finire|ordinare|limpiar|ordenar|organizar|reparar|cortar|aspirar|lavar|regar|llamar|terminar|clasificar|limpar|arrumar|reparar|aparar|aspirar|regar|ligar|terminar|organizar)\b/i;

/**
 * Keyword-based intent classifier — deterministic fallback used when the AI
 * is unavailable or returns a misclassification. Also used as a guard to
 * override clearly wrong AI results.
 */
export function classifyText(text: string): CaptureType {
  const lower = text.toLowerCase();

  // Strong shopping signals (buy/get/grab/pick up, explicit list names) take
  // precedence over task verbs — "buy milk and call dentist" is shopping context.
  const hasStrongShoppingSignal =
    /\b(shopping list|grocery list|groceries|to buy|einkaufsliste|einkauf|lebensmittel)\b/.test(lower) ||
    BUY_VERBS.test(lower);

  if (hasStrongShoppingSignal) {
    return isPersonalScope(lower) ? 'shopping_personal' : 'shopping';
  }

  // "add X to [my/our/the] list" — but only if X is not a task verb phrase.
  // e.g. "add cottage cheese to my list" → shopping_personal
  //      "add clean the terrace to my list" → task (task verb overrides)
  if (ADD_TO_LIST.test(lower)) {
    if (TASK_VERBS.test(lower)) return 'task';
    return isPersonalScope(lower) ? 'shopping_personal' : 'shopping';
  }

  if (/\b(remind|don't forget|remember to|don't let me forget|erinnere? mich|nicht vergessen|daran denken|vergiss nicht)\b/.test(lower)) return 'reminder';

  if (/\b(feel|journal|today i|grateful|gratitude|reflection|dear diary|tagebuch|dankbar|reflexion|gefühle|heute fühle)\b/.test(lower)) return 'journal';

  if (/\b(ritual|habit|morning|evening routine|daily|morgenroutine|abendroutine|gewohnheit)\b/.test(lower)) return 'ritual';

  if (TASK_VERBS.test(lower)) return 'task';

  if (
    /\b(tomorrow|today|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+(am|pm)|at \d|o'clock)\b/.test(lower) ||
    /\b(appointment|meeting|dinner|lunch|birthday|wedding|event|concert)\b/.test(lower) ||
    /\b(morgen|heute|nächste[rns]?|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|um \d|uhr)\b/.test(lower) ||
    /\b(termin|treffen|geburtstag|hochzeit|konzert|mittagessen|abendessen|frühstück)\b/.test(lower)
  ) return 'event';

  return 'event'; // safest default for ambiguous input
}

/**
 * Applies classifyText as a guard on an AI result.
 * Returns the corrected type if the AI was clearly wrong.
 */
export function guardAIType(
  aiType: CaptureType,
  rawText: string,
  aiDate: string | null,
  aiTime: string | null
): CaptureType {
  const lower = rawText.toLowerCase();
  const isObviouslyShopping =
    /\b(shopping list|grocery list|groceries|to buy|einkaufsliste|einkauf|lebensmittel)\b/.test(lower) ||
    BUY_VERBS.test(lower) ||
    ADD_TO_LIST.test(lower);
  const isObviouslyTask = TASK_VERBS.test(lower);
  // User explicitly named the destination as tasks/to-dos. Plural-safe:
  // "tasks", "to-dos", "todos" must match (the old /\btask\b/ missed "tasks",
  // so "add X to our tasks" fell through to the calendar). EN + DE + FR + IT + ES + PT.
  const hasExplicitTaskWord =
    /\b(tasks?|to-?dos?|todos?|aufgaben?|t[âa]ches?|compiti?|tareas?|tarefas?)\b/i.test(lower);

  if ((aiType === 'event' || aiType === 'shopping') && isObviouslyShopping) {
    return isPersonalScope(lower) ? 'shopping_personal' : 'shopping';
  }
  // An explicit task DESTINATION ("…to our tasks", "…to my to-do list") is
  // definitive — it overrides an "event" misclassification even when the AI
  // attached a time (you can put a due time on a task).
  if (aiType === 'event' && hasExplicitTaskWord && !isObviouslyShopping) return 'task';
  // A bare task verb overrides "event" only when the AI did NOT return a
  // SPECIFIC time — "fix the shelf" is a task, but "dinner at 7pm" stays an
  // event. Midnight "00:00" is the AI's date-only default, not a real time.
  const hasSpecificTime = !!aiTime && aiTime !== '00:00';
  if (aiType === 'event' && isObviouslyTask && !hasSpecificTime) return 'task';
  // Upgrade shopping → shopping_personal when keyword guard detects personal scope
  if (aiType === 'shopping' && isPersonalScope(lower)) return 'shopping_personal';
  return aiType;
}
