import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const RC_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY as string;
const ENTITLEMENT = 'premium';

// Lazy-import the native plugin only on native platforms to avoid web build issues
async function getRC() {
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  return Purchases;
}

export async function configureRC(userId?: string): Promise<void> {
  if (!isNative || !RC_KEY) return;
  const Purchases = await getRC();
  await Purchases.configure({ apiKey: RC_KEY, appUserID: userId });
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

export async function getRCOfferings(): Promise<RCPackage[]> {
  if (!isNative) return [];
  try {
    const Purchases = await getRC();
    const { current } = await Purchases.getOfferings();
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
  } catch {
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

// Presents Apple's native SubscriptionStoreView sheet.
// Resolves when the sheet is dismissed (purchase or cancel).
// Caller should then call getRCIsPremium() to check entitlement status.
export async function presentSubscriptionStore(productIds: string[]): Promise<void> {
  if (!isNative) return;
  const { registerPlugin } = await import('@capacitor/core');
  const SubscriptionPlugin = registerPlugin<{
    present: (opts: { productIds: string[] }) => Promise<{ dismissed: boolean }>;
  }>('SubscriptionPlugin');
  await SubscriptionPlugin.present({ productIds });
}
