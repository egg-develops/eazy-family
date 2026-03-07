Eazy.Family — PROJECT_STATE.md

Version: Pilot Stabilization Phase

1. Environment

Machine: macOS
User: systemagent
Repo Path: /Users/systemagent/projects/consumer-apps/eazy-family
OpenClaw Workspace: same as repo path
Build Command: pnpm build
Dev Command: pnpm dev

No publishing. No git push without explicit confirmation.

2. Strategic Objective

Ship a pilot-ready, stable consumer family app.

Primary Goal:
Deliver a seamless experience across:

Onboarding

Auth (sign up / sign in / redirect flows)

Create / Join family

Calendar + ToDo + Community usage

Invite flow (deep link)

Upgrade flow (Stripe)

No App Store release yet. Stability > scale.

3. Current Architecture

Frontend:

Vite + React + TS

Supabase client

Capacitor (iOS + Android)

Backend:

Supabase Auth

Supabase Edge Functions

Stripe webhook (subscription activation/cancellation)

Core folders:

src/pages/

src/components/

src/contexts/

supabase/functions/

4. Completed Stabilizations

Auth:

Redirect parameter preserved using encodeURIComponent

useEffect handles post-auth redirect

Immediate navigate(redirect) after successful sign-in

Build passes

AcceptInvite:

Safe error handling (error instanceof Error)

Proper redirect encoding

Auth redirect round-trip fixed

Environment:

Duplicate repo removed

Workspace locked to correct path

OpenClaw config cleaned

5. Known Build Warnings (Non-blocking)

Supabase client dynamic + static import chunk warning

Large JS chunk (>500kb)

These are optimization issues, not blockers.

6. Active Risk Areas

High Priority:

AuthContext.tsx

Profile creation race condition on SIGNED_IN

Duplicate inserts risk

Subscription tier state consistency

Invite Flow

FamilyProfile invite link logging

JoinFamily logic validation

Token expiration handling

Stripe Flow

Webhook reliability

Tier propagation to UI

Subscription cancellation state

Medium Priority:

Console logs in production code

Error message exposure

Edge function failure cases

7. QA Checklist (Pilot)
Flow A — New User

Sign up → email confirm → onboarding → create family → calendar use → invite

Flow B — Invited User

Open invite link → auth → return → accept → appear in family

Flow C — Upgrade

Trigger upgrade → Stripe checkout → webhook → tier update reflected

8. Definition of Done (Pilot Ready)

No build errors

No broken redirects

No console errors in browser

Invite flow 100% deterministic

Upgrade tier reflects immediately after webhook

No exposed secrets or unsafe logs

9. Execution Rules

OpenClaw must:

Work within one lane at a time

One change-set at a time

Always validate with pnpm build

Return structured JSON after analysis

Never publish or push without approval
