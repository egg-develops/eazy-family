import { supabase } from "@/integrations/supabase/client";

export interface DbDialectRule {
  locale: string;
  pattern: string;
  replacement: string;
  is_regex: boolean;
  flags: string;
}

let cache: DbDialectRule[] = [];
let expiry = 0;
let inflight: Promise<void> | null = null;

const TTL = 60 * 60 * 1000; // 1 hour

async function load(): Promise<void> {
  try {
    const { data } = await supabase
      .from("dialect_normalizations")
      .select("locale, pattern, replacement, is_regex, flags")
      .order("id");
    if (data) {
      cache = data as DbDialectRule[];
      expiry = Date.now() + TTL;
    }
  } catch {
    // Fail silently — hardcoded rules in normalizeLocale.ts still apply
  } finally {
    inflight = null;
  }
}

/** Call once on mount when locale is de-CH so rules are ready before first use. */
export function warmDialectCache(): void {
  if (Date.now() < expiry) return;
  if (!inflight) inflight = load();
}

/**
 * Returns the current cached rules synchronously.
 * Also triggers a background refresh if the cache is stale.
 * Returns an empty array until the first fetch completes.
 */
export function getDbRules(): DbDialectRule[] {
  if (Date.now() >= expiry && !inflight) {
    inflight = load();
  }
  return cache;
}
