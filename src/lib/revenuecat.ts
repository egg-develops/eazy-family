import { Capacitor } from '@capacitor/core';
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

// Lazy-import the native plugin only on native platforms to avoid web build issues
async function getRC() {
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  return Purchases;
}

async function getLogLevel() {
  const { LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  return LOG_LEVEL;
}

export async function configureRC(userId?: string): Promise<void> {
  if (!isNative) { _rcConfiguredResolve?.(); return; }
  if (!RC_KEY) {
    logError(`[RevenueCat] No API key for platform "${platform}" — set VITE_REVENUECAT_${platform.toUpperCase()}_KEY in .env`);
    _rcConfiguredResolve?.();
    return;
  }
  try {
    const Purchases = await getRC();
    const LOG_LEVEL = await getLogLevel();
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({ apiKey: RC_KEY, appUserID: userId });
  } finally {
    _rcConfiguredResolve?.();
  }
}

export async function identifyRCUser(userId: string): Promise<void> {
  if (!isNative) return;
  const Purchases = await getRC();
  await Purchases.logIn({ appUserID: userId });
}

export async function resetRCUser(): Promise<void> {
  if (!isNative) return;
  const Purchases = await getRC();
  await Purchases.logOut();
}

export async function getRCIsPremium(): Promise<boolean> {
  if (!isNative) return true; // web always treated as premium (Stripe not wired)
  try {
    const Purchases = await getRC();
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
    const Purchases = await getRC();
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
    const Purchases = await getRC();
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
  try {
    // Wait for configure() to complete before calling getOfferings — calling on
    // an unconfigured SDK causes it to hang indefinitely on Android.
    await Promise.race([_rcConfigured, timeout<void>(8_000)]);
    const Purchases = await getRC();
    // Race against a 10s timeout — Purchases.getOfferings() can hang indefinitely
    // on certain OS versions (observed on iPadOS 26) if the SDK is not fully ready.
    const { current } = await Promise.race([
      Purchases.getOfferings(),
      timeout<Awaited<ReturnType<typeof Purchases.getOfferings>>>(10_000),
    ]);
    if (!current) return [];
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
  } catch (err) {
    // Log exact error so it appears in Xcode console for next test run
    logError('[RevenueCat] getRCOfferings failed:', err);
    return [];
  }
}

export async function purchaseRCPackage(packageIdentifier: string): Promise<boolean> {
  if (!isNative) return false;
  const Purchases = await getRC();
  const { current } = await Purchases.getOfferings();
  if (!current) throw new Error('No offerings available');

  const pkg = current.availablePackages.find(p => p.identifier === packageIdentifier);
  if (!pkg) throw new Error(`Package ${packageIdentifier} not found`);

  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return ENTITLEMENT in customerInfo.entitlements.active;
}

export async function restoreRCPurchases(): Promise<boolean> {
  if (!isNative) return false;
  const Purchases = await getRC();
  const { customerInfo } = await Purchases.restorePurchases();
  return ENTITLEMENT in customerInfo.entitlements.active;
}

// Triggers a direct StoreKit 2 purchase for the given product ID.
// Returns true if the purchase was completed successfully.
export async function presentSubscriptionStore(productIds: string[]): Promise<boolean> {
  if (!isNative) return false;
  const { registerPlugin } = await import('@capacitor/core');
  const SubscriptionPlugin = registerPlugin<{
    present: (opts: { productIds: string[] }) => Promise<{ purchased?: boolean; cancelled?: boolean; pending?: boolean }>;
  }>('SubscriptionPlugin');
  const result = await SubscriptionPlugin.present({ productIds });
  return result.purchased === true;
}
