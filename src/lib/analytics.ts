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
// Any event fired before posthog finishes loading is QUEUED and replayed once
// it's ready (the earlier version dropped such events, so pageviews/clicks that
// happened during the ~async chunk load never reached PostHog).
//
// Set in Vercel project env (and .env.local for local testing):
//   VITE_POSTHOG_KEY=phc_xxx
//   VITE_POSTHOG_HOST=https://eu.i.posthog.com   (optional; EU default below)
import { Capacitor } from '@capacitor/core';
import type { PostHog } from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://eu.i.posthog.com';

let ph: PostHog | null = null;
const queue: Array<(p: PostHog) => void> = [];

// Run now if posthog is ready, otherwise queue until initAnalytics resolves.
function withPH(fn: (p: PostHog) => void) {
  if (ph) fn(ph);
  else queue.push(fn);
}

export function initAnalytics() {
  if (ph || !KEY || typeof window === 'undefined' || Capacitor.isNativePlatform()) return;
  import('posthog-js')
    .then((mod) => {
      const posthog = mod.default;
      posthog.init(KEY, {
        api_host: HOST,
        person_profiles: 'identified_only',
        capture_pageview: false, // captured manually on route change (SPA)
        autocapture: true,
        respect_dnt: true,
        disable_session_recording: true,
      });
      ph = posthog;
      (window as unknown as { __eazyPH?: PostHog }).__eazyPH = posthog; // debug handle
      // Replay everything captured during the async load.
      while (queue.length) queue.shift()!(posthog);
    })
    .catch((e) => {
      // Don't break the app, but don't swallow silently either — a failed init
      // here is why events would never send.
      console.warn('[analytics] PostHog init failed:', e);
    });
}

/** Track a funnel/marketing event. Queued until posthog is ready. */
export function track(event: string, props?: Record<string, unknown>) {
  withPH((p) => p.capture(event, props));
}

/** Record an SPA pageview on each route change. Queued until posthog is ready. */
export function trackPageview(path: string) {
  withPH((p) => p.capture('$pageview', { $current_url: window.location.origin + path }));
}

/** Tie subsequent events to a known user (call after sign-in). */
export function identifyUser(id: string, props?: Record<string, unknown>) {
  withPH((p) => p.identify(id, props));
}

/** Clear identity on sign-out. */
export function resetAnalytics() {
  withPH((p) => p.reset());
}
