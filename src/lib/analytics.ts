// Product/marketing analytics via PostHog.
//
// Env-gated: does nothing unless VITE_POSTHOG_KEY is set, so local/dev builds
// and any environment without the key stay silent. Web-only (skipped on native
// Capacitor) and lazy-loaded — posthog-js (~230 KB) is dynamically imported off
// the critical path so it never bloats the initial bundle or slows first paint,
// which matters for the marketing site's SEO/Core Web Vitals.
//
// Configured privacy-first for CH/EU: EU cloud host by default, respects
// Do-Not-Track, no session recording, person profiles only for identified users.
//
// Set in Vercel project env (and .env.local for local testing):
//   VITE_POSTHOG_KEY=phc_xxx
//   VITE_POSTHOG_HOST=https://eu.i.posthog.com   (optional; EU default below)
import { Capacitor } from '@capacitor/core';
import type { PostHog } from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://eu.i.posthog.com';

let ph: PostHog | null = null;
let pendingPageview: string | null = null;

export function initAnalytics() {
  if (ph || !KEY || typeof window === 'undefined' || Capacitor.isNativePlatform()) return;
  import('posthog-js').then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: HOST,
      person_profiles: 'identified_only',
      capture_pageview: false, // captured manually on route change (SPA)
      autocapture: true,
      respect_dnt: true,
      disable_session_recording: true,
    });
    ph = posthog;
    // Flush the landing pageview that fired before posthog finished loading.
    if (pendingPageview) { trackPageview(pendingPageview); pendingPageview = null; }
  }).catch(() => { /* analytics is best-effort; never break the app */ });
}

/** Track a funnel/marketing event. Safe no-op until analytics is initialised. */
export function track(event: string, props?: Record<string, unknown>) {
  if (ph) ph.capture(event, props);
}

/** Record an SPA pageview. Called on every route change; queues the first one
 *  if posthog hasn't finished loading yet. */
export function trackPageview(path: string) {
  if (ph) ph.capture('$pageview', { $current_url: window.location.origin + path });
  else pendingPageview = path;
}

/** Tie subsequent events to a known user (call after sign-in). */
export function identifyUser(id: string, props?: Record<string, unknown>) {
  if (ph) ph.identify(id, props);
}

/** Clear identity on sign-out. */
export function resetAnalytics() {
  if (ph) ph.reset();
}
