---
name: ship
description: >
  Safely ship a change in Eazy.Family end-to-end: build-verify, stage only the
  intended files, commit with a root-cause message, rebase over CI's versionCode
  bumps, push, confirm CI/Vercel actually built, and report the delivery path +
  cache-bust the user needs. Use whenever code is ready to go to main. Prevents
  broken builds reaching prod, `git add -A` accidents, and versionCode collisions.
---

# Skill: ship

Shipping in this repo is a ritual with several footguns, each of which has bitten
before. Do every step in order. Do not skip the build or the CI confirmation.

## 0. Preconditions
- You are on `main` (this project ships from `main`).
- You know **which files** your change touched. If unsure: `git status --short`.

## 1. Build-verify (the real gate)
```bash
npm run build
```
- Must exit 0. This is the ONLY reliable typecheck — `npx tsc --noEmit` is a no-op
  here (`tsconfig` has `files: []`), so never rely on it.
- If the change touched `src/lib/**`, also run `npm test`.
- If you changed the service worker, mobile touch handling, or lazy-loading, plan to
  verify at runtime too (see the `verify-ui` skill).

## 2. Stage explicitly — NEVER `git add -A`
The working tree collects untracked junk (`build/`, `dist/`, `*.aab`, `*.apks`,
`screenshots/`, `recordings/`). `git add -A` sweeps them all into the commit.
```bash
git add path/to/file1 path/to/file2   # exact paths only
git status --short                     # confirm nothing stray is staged
```

## 3. Commit with a root-cause message
The body must state **what was wrong, why, and why this fixes it** — not just the
symptom. End with the co-author trailer for the active model, e.g.:
```
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```
Template:
```
<type>: <one-line what changed>

<root cause: the underlying reason, not the symptom>
<why this fix is correct / how it was verified>

Co-Authored-By: Claude <model> <noreply@anthropic.com>
```

## 4. Rebase over CI's versionCode bumps, then push
CI auto-commits `ci: bump Android versionCode … [skip ci]` on every build, so
`main` almost always moved since you last pulled. Rebase before pushing:
```bash
git pull --rebase origin main       # add --autostash if the tree is dirty
git push origin main
```
If push is rejected again, repeat the pull --rebase (CI may have bumped mid-push).

### If YOU need to change versionCode manually
CI bumps by **+1**. A manual **+1 collides** with a code CI will consume → Play
rejects "versionCode already used". **Bump manually by +10** to stay ahead.

## 5. Confirm the build actually happened (do not skip)
A green local build does not mean prod got it. Check the pipelines your change
triggers (paths in `.github/workflows/*.yml`: `src/**`, `ios/**`, `android/**`, …):
```bash
gh run list --limit 6 \
  --json headSha,conclusion,workflowName,createdAt \
  --template '{{range .}}{{slice .headSha 0 8}} {{.conclusion}}  {{.workflowName}}{{"\n"}}{{end}}'
```
- Your commit SHA must show `success` for iOS Beta and/or Android Beta.
- Web: confirm the Vercel deploy for your SHA succeeded. A failed deploy silently
  keeps serving the previous bundle — this is the #1 cause of "the fix didn't work".

## 6. Report delivery + cache-bust to the user
State plainly, per affected channel:
- **Web:** live after the Vercel deploy; user may need a hard reload / to close and
  reopen the PWA so the service worker picks up the new bundle.
- **iOS:** available in TestFlight build **N** once CI finishes; must install it.
- **Android:** Play beta build once CI finishes.

## Definition of done
- [ ] `npm run build` exited 0 (and `npm test` if `src/lib` changed).
- [ ] Only intended files committed (`git status` clean of artifacts).
- [ ] Commit body states root cause + why the fix works.
- [ ] Pushed; `main` fast-forwarded.
- [ ] CI/Vercel build for the commit SHA is **confirmed successful**.
- [ ] User told which channel(s) got the change and how to receive it.
