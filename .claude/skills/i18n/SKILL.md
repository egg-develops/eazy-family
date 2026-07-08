---
name: i18n
description: >
  Add or audit user-facing strings in Eazy.Family across all six full locales
  (en, de, fr, es, it, pt) so no key is English-only or missing. Use whenever you
  add/rename a UI string or suspect locale drift. A missing key renders the raw
  key string to the user, so this is a correctness task, not a nicety.
---

# Skill: i18n

Every user-facing string flows through `t('namespace.key')`. If a key exists in
`en.json` but not `de.json`, German users see the literal string
`"settings.moduleStaleTasks"` on screen. Keeping locales in sync is a correctness
requirement.

## The locale set (know the difference)
- **Six FULL locales — must stay in lockstep:** `en`, `de`, `fr`, `es`, `it`, `pt`
  (`src/i18n/locales/*.json`). Each currently ~1514 leaf keys. `en` is the base.
- **`en-GB.json` is a SPARSE override**, not a full locale — it holds only British
  spelling differences (~a hundred keys) layered over `en`. Do **not** copy every
  new key into `en-GB`; add to it only when the string differs in British English
  (e.g. "Organise", "Colour").

## Adding a new string
1. Add the key to **`en.json`** first, in the correct namespace
   (`home.*`, `settings.*`, `calendar.*`, `familyAgenda.*`, `nav.*`, …), placed
   near sibling keys.
2. Add the **same key** to `de`, `fr`, `es`, `it`, `pt` with a real translation
   (not the English text). Reference translations for a related feature to match
   tone/terminology already used in the app.
3. Add to `en-GB.json` **only** if the British spelling differs.
4. Use the key via `t('namespace.key')`; for counts/vars use interpolation
   (`t('calendar.eventsImported', { count })`) — keep the placeholder name
   identical across locales.

## Auditing for drift (run this before shipping i18n changes)
Finds keys present in `en` but missing elsewhere, and extra keys not in `en`
(e.g. `pt` has drifted +2):
```bash
python3 - <<'PY'
import json, glob, os
base = 'src/i18n/locales'
full = ['en','de','fr','es','it','pt']
def leaves(o, p=''):
    out = {}
    for k, v in o.items():
        kp = f'{p}.{k}' if p else k
        if isinstance(v, dict): out.update(leaves(v, kp))
        else: out[kp] = v
    return out
en = leaves(json.load(open(f'{base}/en.json')))
enk = set(en)
for loc in full:
    if loc == 'en': continue
    lk = set(leaves(json.load(open(f'{base}/{loc}.json'))))
    missing = sorted(enk - lk)
    extra   = sorted(lk - enk)
    status = 'OK' if not missing and not extra else 'DRIFT'
    print(f'{loc}: {status}  missing={len(missing)} extra={len(extra)}')
    for m in missing[:20]: print('   - missing', m)
    for e in extra[:20]:   print('   + extra  ', e)
PY
```
- **Goal:** every full locale reports `missing=0 extra=0`.
- `missing` > 0 → users of that language see raw key strings. Fix by adding the key.
- `extra` > 0 → dead/renamed keys; remove them (or add the matching key to `en` if
  the string is actually needed).

## Common mistakes this prevents
- Adding a string to `en.json` only → other languages show the raw key.
- Copying English text into other locales as a placeholder and forgetting to
  translate → users see English mid-sentence.
- Mismatched interpolation placeholder names across locales → runtime substitution
  fails for some languages.
- Bloating `en-GB.json` with every key instead of only British-spelling overrides.

## Definition of done
- [ ] New key exists in all six full locales with genuine translations.
- [ ] Interpolation placeholders are identical across locales.
- [ ] `en-GB.json` updated only where British spelling differs.
- [ ] The audit script reports `missing=0 extra=0` for de, fr, es, it, pt.
- [ ] `npm run build` still exits 0.
