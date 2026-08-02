// Address / place autocomplete via Photon (photon.komoot.io) — a free,
// key-less geocoder built on OpenStreetMap and designed for typeahead. No API
// key, GDPR-friendly (EU-hosted). Debounce calls at the call site.
interface PhotonProps {
  name?: string; street?: string; housenumber?: string; postcode?: string;
  city?: string; district?: string; state?: string; country?: string;
}

/** Return up to `limit` human-readable address suggestions for a query. */
export async function searchPlaces(query: string, opts?: { signal?: AbortSignal; limit?: number }): Promise<string[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=${opts?.limit ?? 5}`;
  let data: { features?: Array<{ properties?: PhotonProps }> };
  try {
    const res = await fetch(url, { signal: opts?.signal });
    if (!res.ok) return [];
    data = await res.json();
  } catch {
    return []; // network/abort — fail quiet, the field still works as free text
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties ?? {};
    const streetLine = [p.housenumber, p.street].filter(Boolean).join(" ");
    const parts = [p.name, streetLine, p.postcode, p.city || p.district, p.state, p.country]
      .filter((x): x is string => !!x && x.trim().length > 0);
    // Drop consecutive duplicates (name often equals street).
    const label = parts.filter((v, i) => i === 0 || v !== parts[i - 1]).join(", ");
    if (label && !seen.has(label)) { seen.add(label); out.push(label); }
  }
  return out;
}
