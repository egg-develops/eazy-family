import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { error as logError } from '@/lib/logger';

const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
const RC_IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY as string;
const RC_ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string;
const RC_KEY = platform === 'android' ? RC_ANDROID_KEY : RC_IOS_KEY;
const ENTITLEMENT = 'premium';

// Tracks when configure() has completed so getOfferings() is never called on an unconfigured SDK
let _rcConfiguredResolve: () => void;
const _rcConfigured = new Promise<void>(res => { _rcConfiguredResolve = res; });

// Records how far configureRC() got, so a stuck configure can be diagnosed from the UI.
let _rcConfigureStatus = 'not-started';
export function getRCConfigureStatus(): string { return _rcConfigureStatus; }

export interface RCDiagnostics {
  platform: string;
  isNative: boolean;
  apiKeyPresent: boolean;
  configureStatus: string;
}

export function getRCDiagnostics(): RCDiagnostics {
  return { platform, isNative, apiKeyPresent: Boolean(RC_KEY), configureStatus: _rcConfigureStatus };
}

// NOTE: never `await` the `Purchases` plugin object itself, and never return it
// from an async function — the Capacitor proxy turns any property access into a
// native call, so Promise-resolution probing `.then` invokes a non-existent
// native "then" method ("Purchases.then() is not implemented"). Only ever call
// real methods on it (Purchases.configure(), Purchases.getOfferings(), …).

export async function configureRC(userId?: string): Promise<void> {
  if (!isNative) { _rcConfigureStatus = 'web-skip'; _rcConfiguredResolve?.(); return; }
  if (!RC_KEY) {
    _rcConfigureStatus = 'no-api-key';
    logError(`[RevenueCat] No API key for platform "${platform}" — set VITE_REVENUECAT_${platform.toUpperCase()}_KEY in .env`);
    _rcConfiguredResolve?.();
    return;
  }
  // Each step is bounded by its own timeout so a hung native bridge call can't
  // wedge configure forever — and _rcConfigureStatus records exactly where it stalled.
  try {
    _rcConfigureStatus = 'setting-log-level';
    await Promise.race([Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG }), timeout<void>(7_000)]);
    _rcConfigureStatus = 'configuring';
    await Promise.race([Purchases.configure({ apiKey: RC_KEY, appUserID: userId }), timeout<void>(7_000)]);
    _rcConfigureStatus = 'configured';
  } catch (err) {
    _rcConfigureStatus = `failed@${_rcConfigureStatus}: ${err instanceof Error ? err.message : String(err)}`;
    logError('[RevenueCat] configureRC failed:', err);
  } finally {
    _rcConfiguredResolve?.();
  }
}

export async function identifyRCUser(userId: string): Promise<void> {
  if (!isNative) return;
  await Purchases.logIn({ appUserID: userId });
}

export async function resetRCUser(): Promise<void> {
  if (!isNative) return;
  await Purchases.logOut();
}

export async function getRCIsPremium(): Promise<boolean> {
  if (!isNative) return true; // web always treated as premium (Stripe not wired)
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return ENTITLEMENT in customerInfo.entitlements.active;
  } catch {
    return false;
  }
}

/** Returns true if the active entitlement is a free trial or introductory offer (not a paid period). */
export async function getRCIsTrial(): Promise<boolean> {
  if (!isNative) return true; // web has no Stripe yet — everyone is in "trial" state
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT];
    if (!entitlement) return false;
    const pt = (entitlement as any).periodType as string | undefined;
    return pt === 'TRIAL' || pt === 'INTRO' || pt === 'trial' || pt === 'intro';
  } catch {
    return true; // safe default: show "Trial" on error rather than "Active"
  }
}

/** Returns whole days remaining in the current trial, or null if not determinable. */
export async function getRCTrialDaysLeft(): Promise<number | null> {
  if (!isNative) return null;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT];
    if (!entitlement) return null;
    const millis = (entitlement as any).expirationDateMillis as number | null | undefined;
    if (!millis) return null;
    const days = Math.ceil((millis - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  } catch {
    return null;
  }
}

export interface RCPackage {
  identifier: string;
  packageType: string;
  product: {
    title: string;
    description: string;
    priceString: string;
    currencyCode: string;
    price: number;
    productIdentifier: string; // App Store product ID for SubscriptionStoreView
  };
}

const timeout = <T>(ms: number): Promise<T> =>
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`RC timeout after ${ms}ms`)), ms)
  );

export async function getRCOfferings(): Promise<RCPackage[]> {
  if (!isNative) return [];
  if (!RC_KEY) throw new Error(`No RevenueCat API key for ${platform}`);
  // Wait for configure() to complete before calling getOfferings — calling on
  // an unconfigured SDK causes it to hang indefinitely on Android.
  try {
    await Promise.race([_rcConfigured, timeout<void>(8_000)]);
  } catch {
    throw new Error(`RevenueCat not ready (configure status: ${_rcConfigureStatus})`);
  }
  if (_rcConfigureStatus !== 'configured') {
    throw new Error(`RevenueCat configure did not succeed (status: ${_rcConfigureStatus})`);
  }
  // Race against a 10s timeout — Purchases.getOfferings() can hang indefinitely
  // on certain OS versions (observed on iPadOS 26) if the SDK is not fully ready.
  const { current } = await Promise.race([
    Purchases.getOfferings(),
    timeout<Awaited<ReturnType<typeof Purchases.getOfferings>>>(10_000),
  ]);
  if (!current) {
    // Offering exists in the SDK response but none is marked "current".
    throw new Error('No "current" offering set in RevenueCat. Set a current Offering in the dashboard.');
  }
  if (current.availablePackages.length === 0) {
    // current offering exists but the store returned no purchasable products.
    // On Android this almost always means the app is not installed from a Google
    // Play track, or the subscription products are not Active in Play Console.
    throw new Error(
      platform === 'android'
        ? 'Play Billing returned no products. Install from a Play (internal testing) track and ensure the subscriptions are Active and mapped to the current Offering.'
        : 'The store returned no products for the current Offering.'
    );
  }
  return current.availablePackages.map(p => ({
    identifier: p.identifier,
    packageType: p.packageType,
    product: {
      title: p.product.title,
      description: p.product.description,
      priceString: p.product.priceString,
      currencyCode: p.product.currencyCode,
      price: p.product.price,
      productIdentifier: p.product.identifier,
    },
  }));
}

export async function purchaseRCPackage(packageIdentifier: string): Promise<boolean> {
  if (!isNative) return false;
  if (_rcConfigureStatus !== 'configured') {
    throw new Error(`RevenueCat is not ready for purchase (status: ${_rcConfigureStatus})`);
  }
  const { current } = await Promise.race([
    Purchases.getOfferings(),
    timeout<Awaited<ReturnType<typeof Purchases.getOfferings>>>(10_000),
  ]);
  if (!current) throw new Error('No offerings available');

  const pkg = current.availablePackages.find(p => p.identifier === packageIdentifier);
  if (!pkg) throw new Error(`Package ${packageIdentifier} not found`);

  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return ENTITLEMENT in customerInfo.entitlements.active;
}

export async function restoreRCPurchases(): Promise<boolean> {
  if (!isNative) return false;
  const { customerInfo } = await Purchases.restorePurchases();
  return ENTITLEMENT in customerInfo.entitlements.active;
}

// Triggers a direct StoreKit 2 purchase for the given product ID.
// Returns true if the purchase was completed successfully.
export async function presentSubscriptionStore(productIds: string[]): Promise<boolean> {
  if (!isNative) return false;
  const { registerPlugin } = await import('@capacitor/core');
  const SubscriptionPlugin = registerPlugin<{
    present: (opts: { productIds: string[] }) => Promise<{ purchased?: boolean; cancelled?: boolean; pending?: boolean; unavailable?: boolean }>;
  }>('SubscriptionPlugin');
  const result = await SubscriptionPlugin.present({ productIds });
  if (result.unavailable) throw new Error('This plan is not yet available. Please try again later.');
  return result.purchased === true;
}
