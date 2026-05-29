/**
 * Pre-processing normalization for locale-specific dialect inputs.
 *
 * Text is normalized BEFORE reaching classifyText() and the AI parser so that
 * both the deterministic classifier and the LLM see clean Standard German (or
 * standard forms of other locales) regardless of what dialect the user typed
 * or spoke.
 *
 * Normalization is intentionally conservative — only well-established dialect
 * terms are mapped, never ambiguous short words that could cause false hits.
 *
 * Admin-curated rules from the dialect_normalizations table are applied on top
 * of the hardcoded baseline via the optional dbRules parameter (supplied by
 * dialectRulesCache.getDbRules() at call sites).
 */

export interface DbDialectRule {
  locale: string;
  pattern: string;
  replacement: string;
  is_regex: boolean;
  flags: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Swiss German → Standard German
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeCHDE(text: string, dbRules: DbDialectRule[] = []): string {
  if (!text) return text;

  let s = text;

  // Days of week — highly distinctive Swiss German spellings
  s = s.replace(/\bzischtig\b/gi, 'Dienstag');
  s = s.replace(/\bzyschtig\b/gi, 'Dienstag');
  s = s.replace(/\bdunschtig\b/gi, 'Donnerstag');
  s = s.replace(/\bdunnschtig\b/gi, 'Donnerstag');
  s = s.replace(/\bmittwuch\b/gi, 'Mittwoch');
  s = s.replace(/\bmöntag\b/gi, 'Montag');
  s = s.replace(/\bfriitig\b/gi, 'Freitag');
  s = s.replace(/\bsamstig\b/gi, 'Samstag');
  s = s.replace(/\bsamschtig\b/gi, 'Samstag');
  s = s.replace(/\bsunntig\b/gi, 'Sonntag');
  s = s.replace(/\bsuntig\b/gi, 'Sonntag');

  // Temporal references
  s = s.replace(/\bhüt(?:ige?n?)?\b/gi, 'heute');
  s = s.replace(/\bmornig[e]?\b/gi, 'morgen');
  s = s.replace(/\bmorn\b/gi, 'morgen');  // "morn" alone, not inside another word
  s = s.replace(/\büberismorn\b/gi, 'übermorgen');
  s = s.replace(/\büberisch(?:nächt)?\b/gi, 'übermorgen');
  s = s.replace(/\bgschtert\b/gi, 'gestern');
  s = s.replace(/\bgeschter\b/gi, 'gestern');
  s = s.replace(/\bnächschti(?:u)?\b/gi, 'nächste');
  s = s.replace(/\bnächschte[rns]?\b/gi, 'nächste');
  s = s.replace(/\bletscht[ei][rn]?\b/gi, 'letzte');

  // Meal time nouns — important for event/task classification
  s = s.replace(/\bz['']?nacht\b/gi, 'Abendessen');
  s = s.replace(/\bz['']?mittag\b/gi, 'Mittagessen');
  s = s.replace(/\bz['']?morge\b/gi, 'Frühstück');
  s = s.replace(/\bznacht\b/gi, 'Abendessen');
  s = s.replace(/\bzmittag\b/gi, 'Mittagessen');
  s = s.replace(/\bzmorge\b/gi, 'Frühstück');

  // Shopping verbs — critical for type classification
  s = s.replace(/\bga?\s+poschte\b/gi, 'einkaufen');
  s = s.replace(/\bgo\s+poschte\b/gi, 'einkaufen');
  s = s.replace(/\bposchte\b/gi, 'einkaufen');

  // Task / action verbs
  s = s.replace(/\buufräume\b/gi, 'aufräumen');
  s = s.replace(/\bufräume\b/gi, 'aufräumen');
  s = s.replace(/\busräume\b/gi, 'aufräumen');
  s = s.replace(/\bputze\b/gi, 'putzen');
  s = s.replace(/\bwäsche\b/gi, 'waschen');
  s = s.replace(/\bchoche\b/gi, 'kochen');
  s = s.replace(/\baaruefe\b/gi, 'anrufen');
  s = s.replace(/\baaluete\b/gi, 'anrufen');
  s = s.replace(/\bhole\b/gi, 'holen');
  s = s.replace(/\bbringe\b/gi, 'bringen');
  s = s.replace(/\bgo\s+luege\b/gi, 'nachschauen');
  s = s.replace(/\bluege\b/gi, 'anschauen');
  s = s.replace(/\bfiire\b/gi, 'feiern');

  // List scope markers — map to Standard German so isPersonalScope() works
  s = s.replace(/\bmini\s+(einkaufs)?list[e]?\b/gi, 'meine Liste');
  s = s.replace(/\bmine\s+(einkaufs)?list[e]?\b/gi, 'meine Liste');
  s = s.replace(/\büsi\s+(einkaufs)?list[e]?\b/gi, 'unsere Liste');
  s = s.replace(/\büseri\s+(einkaufs)?list[e]?\b/gi, 'unsere Liste');
  s = s.replace(/\büsere\s+(einkaufs)?list[e]?\b/gi, 'unsere Liste');

  // Common nouns that matter for parsing context
  s = s.replace(/\bNatel\b/g, 'Handy');
  s = s.replace(/\bVelo\b/g, 'Fahrrad');
  s = s.replace(/\bVelos\b/g, 'Fahrräder');
  s = s.replace(/\bCoiffeur\b/g, 'Friseur');
  s = s.replace(/\bcoiffeur\b/g, 'Friseur');

  // Apply admin-curated rules from the database on top of the hardcoded baseline
  for (const rule of dbRules) {
    if (rule.locale !== 'de-CH') continue;
    try {
      if (rule.is_regex) {
        s = s.replace(new RegExp(rule.pattern, rule.flags || 'gi'), rule.replacement);
      } else {
        const escaped = rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        s = s.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), rule.replacement);
      }
    } catch {
      // Skip malformed regex patterns silently
    }
  }

  return s.trim();
}

/**
 * Returns true if the stored language code represents a Swiss locale.
 * Used in EZCapture to decide whether to apply CH normalization.
 */
export function isSwissGermanLocale(): boolean {
  const lang = localStorage.getItem('eazy-family-language') || '';
  return lang === 'de-CH';
}
