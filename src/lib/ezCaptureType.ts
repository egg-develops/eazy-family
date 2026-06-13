import type { CaptureType } from './intentClassifier';

/**
 * Decide the EZ Capture screen's INITIAL locked type from the per-screen
 * defaultType.
 *
 * defaultType is only a STARTING hint (Home/Calendar → 'event', Lists →
 * 'task'/'shopping', Rituals → 'journal'). It must NOT lock the capture type:
 * a locked type suppresses auto-classification, the AI result, and the type
 * badge. Because the global EZ orb (Home) passes 'event', locking from
 * defaultType pinned EVERY capture to a calendar Event regardless of what the
 * user said (e.g. "add bananas to my shopping list" → Event).
 *
 * Only a deliberate journal entry (Rituals) stays locked; everywhere else the
 * type is left unlocked so the classifier/AI route it, and the user can still
 * override via the type picker / "Did you mean?".
 */
export function initialLockedType(defaultType?: CaptureType): CaptureType | null {
  return defaultType === 'journal' ? 'journal' : null;
}
