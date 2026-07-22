// Native in-app review prompt (iOS SKStoreReview / Android Play In-App Review),
// gated for good UX and App Store compliance.
//
// We only ask users who've shown real engagement, never on first launch, and at
// most once per long cooldown. iOS itself also caps prompts to ~3/year and may
// silently ignore extra calls — this gating avoids wasting those on cold users.
//
// Call signalPositiveMoment() at genuine "this worked / that felt good" moments
// (e.g. completing a task). It counts engagement and, once the bar is cleared,
// fires the native prompt at that natural pause.
import { Capacitor } from '@capacitor/core';
import { InAppReview } from '@capacitor-community/in-app-review';

const K_POSITIVE = 'eazy-review-positive-count';
const K_LAST = 'eazy-review-last-prompt';
const MIN_POSITIVE = 3;                                  // must feel value ≥3× first
const COOLDOWN_MS = 120 * 24 * 60 * 60 * 1000;           // ≤ once / 120 days

export function recordPositiveSignal(): number {
  const n = Number(localStorage.getItem(K_POSITIVE) || '0') + 1;
  localStorage.setItem(K_POSITIVE, String(n));
  return n;
}

export async function maybeRequestReview(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return; // native-only API
  const positive = Number(localStorage.getItem(K_POSITIVE) || '0');
  if (positive < MIN_POSITIVE) return;
  const last = Number(localStorage.getItem(K_LAST) || '0');
  if (last && Date.now() - last < COOLDOWN_MS) return;
  // Set the timestamp BEFORE the call so a rejected/failed prompt still respects
  // the cooldown and we never nag in a loop.
  localStorage.setItem(K_LAST, String(Date.now()));
  try {
    await InAppReview.requestReview();
  } catch {
    /* review UI is best-effort; never surface an error to the user */
  }
}

/** Record a positive moment and, if the user has earned it, request a review. */
export async function signalPositiveMoment(): Promise<void> {
  recordPositiveSignal();
  await maybeRequestReview();
}
