import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, Crown, RotateCcw, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { error as logError } from "@/lib/logger";
import { Capacitor } from "@capacitor/core";
import { getRCOfferings, restoreRCPurchases, presentSubscriptionStore, type RCPackage } from "@/lib/revenuecat";
import { useTranslation } from "react-i18next";

const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();

// Known App Store product IDs — used when RC offerings fail to load so the
// native subscription sheet can still open and show real prices from the store.
const IOS_FALLBACK_PRODUCT_IDS = ['EZ.Family.Monthly', 'EZ.Family.Annual'];

const MONTHLY_PRICE = 5;
const ANNUAL_PRICE = 49;
const ANNUAL_MONTHLY = (ANNUAL_PRICE / 12).toFixed(2);
const ANNUAL_SAVINGS = MONTHLY_PRICE * 12 - ANNUAL_PRICE;

// Safety timeout — if the native purchase sheet never resolves, unblock the UI
const PURCHASE_TIMEOUT_MS = 15_000;

interface UpgradeDialogProps {
  children: React.ReactNode;
}

export const UpgradeDialog = ({ children }: UpgradeDialogProps) => {
  const { isPremium, isTrial, refreshSubscription } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [rcPackages, setRcPackages] = useState<RCPackage[]>([]);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [offeringsError, setOfferingsError] = useState(false);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchOfferings = useCallback(async () => {
    if (!isNative) return;
    setIsLoadingOfferings(true);
    setOfferingsError(false);
    try {
      const pkgs = await getRCOfferings();
      if (!pkgs || pkgs.length === 0) throw new Error('No offerings returned');
      if (mountedRef.current) setRcPackages(pkgs);
    } catch (err) {
      logError('getRCOfferings failed:', err);
      if (mountedRef.current) { setOfferingsError(true); setRcPackages([]); }
    } finally {
      if (mountedRef.current) setIsLoadingOfferings(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchOfferings();
  }, [open, fetchOfferings]);

  // Already paid (not a trial) — nothing to upgrade
  if (isPremium && !isTrial) return <>{children}</>;

  const rcProductIds = rcPackages.map(p => p.product.productIdentifier).filter(Boolean);
  // Fall back to known product IDs on iOS so the subscription sheet opens even when RC fails
  const allProductIds = rcProductIds.length > 0
    ? rcProductIds
    : platform === 'ios' ? IOS_FALLBACK_PRODUCT_IDS : [];

  // Derive per-plan prices — use RC values when loaded, hardcoded CHF otherwise
  const monthlyPkg = rcPackages.find(p => p.identifier === '$rc_monthly');
  const annualPkg  = rcPackages.find(p => p.identifier === '$rc_annual');
  const nativeMonthlyPrice    = monthlyPkg?.product.priceString ?? `CHF ${MONTHLY_PRICE}`;
  const nativeAnnualPrice     = annualPkg?.product.priceString  ?? `CHF ${ANNUAL_PRICE}`;
  const nativeAnnualMonthly   = annualPkg
    ? `${annualPkg.product.currencyCode} ${(annualPkg.product.price / 12).toFixed(2)}`
    : `CHF ${ANNUAL_MONTHLY}`;
  const nativeAnnualSavings   = annualPkg
    ? Math.round(MONTHLY_PRICE * 12 - annualPkg.product.price)
    : ANNUAL_SAVINGS;

  // Product ID to pass to Apple's sheet — only the plan the user selected
  const selectedNativeProductId = billingCycle === 'monthly'
    ? (monthlyPkg?.product.productIdentifier ?? 'EZ.Family.Monthly')
    : (annualPkg?.product.productIdentifier  ?? 'EZ.Family.Annual');

  const handleNativeUpgrade = async () => {
    if (isLoadingOfferings) return;

    if (allProductIds.length === 0) {
      await fetchOfferings();
      return;
    }

    setIsLoading(true);

    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
      toast({ title: t('common.error'), description: t('upgrade.purchaseFailedDesc'), variant: 'destructive' });
    }, PURCHASE_TIMEOUT_MS);

    try {
      await presentSubscriptionStore([selectedNativeProductId]);
      try { await refreshSubscription(); } catch { /* non-fatal */ }
      setOpen(false);
    } catch (err: unknown) {
      logError('SubscriptionStore error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: t('upgrade.purchaseFailed'), description: msg || t('upgrade.purchaseFailedDesc'), variant: 'destructive' });
    } finally {
      clearTimeout(safetyTimer);
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    const safetyTimer = setTimeout(() => setIsLoading(false), PURCHASE_TIMEOUT_MS);
    try {
      const granted = await restoreRCPurchases();
      if (granted) {
        try { await refreshSubscription(); } catch { /* non-fatal */ }
        setOpen(false);
        toast({ title: t('upgrade.purchasesRestored'), description: t('upgrade.subscriptionActive') });
      } else {
        toast({ title: t('upgrade.nothingToRestore'), description: t('upgrade.noActiveSubscription') });
      }
    } catch {
      toast({ title: t('upgrade.restoreFailed'), description: t('upgrade.purchaseFailedDesc'), variant: 'destructive' });
    } finally {
      clearTimeout(safetyTimer);
      setIsLoading(false);
    }
  };

  const handleWebUpgrade = async () => {
    if (isNative) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: t('upgrade.authRequired'), description: t('upgrade.signInToUpgrade'), variant: 'destructive' });
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { billing_cycle: billingCycle },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      logError('Error creating checkout:', error);
      toast({ title: t('common.error'), description: t('upgrade.failedCheckout'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Label for the native CTA button
  const nativeCtaLabel = () => {
    if (isLoading) return t('upgrade.opening');
    if (isLoadingOfferings) return t('upgrade.loadingOfferings');
    if (allProductIds.length === 0) return t('upgrade.retryLoad');
    return t('upgrade.upgradeToPremium');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm w-[92%] p-0 overflow-hidden max-h-[92vh] overflow-y-auto">

        {/* Hero */}
        <div className="px-6 pt-7 pb-5 text-center" style={{ background: 'linear-gradient(160deg, #964735 0%, #D97B66 100%)' }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Crown className="h-6 w-6 text-white" />
            <h2 className="text-xl font-bold text-white tracking-tight">{t('upgrade.familyPremium')}</h2>
          </div>
          {isTrial ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                <Sparkles className="h-3.5 w-3.5" />
                {t('upgrade.keepFullAccess')}
              </div>
              <p className="text-white/75 text-xs mt-2">{t('upgrade.trialEndsSoon')}</p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                <Sparkles className="h-3.5 w-3.5" />
                {t('upgrade.trialSub14')}
              </div>
              <p className="text-white/75 text-xs mt-2">{t('upgrade.noChargeToday')}</p>
            </>
          )}
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Features */}
          <div className="space-y-2">
            {[
              t('onboarding.paywall.voiceFeature'),
              t('onboarding.paywall.familyFeature'),
              t('onboarding.paywall.conflictsFeature'),
              t('onboarding.paywall.listsFeature'),
              t('onboarding.paywall.digestFeature'),
            ].map(f => (
              <div key={f} className="flex items-start gap-2.5 text-sm">
                <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#964735' }} />
                <span style={{ color: 'hsl(var(--foreground))' }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Native plan cards + CTA */}
          {isNative ? (
            <>
              <div className="grid grid-cols-2 gap-2.5 items-stretch">
                <button
                  onClick={() => setBillingCycle('annual')}
                  className="rounded-2xl p-4 text-left flex flex-col transition-all"
                  style={{
                    border: billingCycle === 'annual' ? '2px solid #964735' : '2px solid hsl(var(--border))',
                    background: billingCycle === 'annual' ? '#FDF3EE' : 'hsl(var(--card))',
                  }}
                >
                  <span className="self-start text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white mb-2" style={{ background: '#964735' }}>
                    SAVE CHF {nativeAnnualSavings}
                  </span>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('upgrade.annual')}</p>
                  <p className="text-xl font-bold mt-1 leading-none" style={{ color: 'hsl(var(--foreground))' }}>{nativeAnnualMonthly}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('upgrade.perMonth')}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('upgrade.billedAnnually')} · {nativeAnnualPrice}/yr</p>
                </button>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className="rounded-2xl p-4 text-left flex flex-col transition-all"
                  style={{
                    border: billingCycle === 'monthly' ? '2px solid #964735' : '2px solid hsl(var(--border))',
                    background: billingCycle === 'monthly' ? '#FDF3EE' : 'hsl(var(--card))',
                  }}
                >
                  <span className="text-[9px] mb-2 select-none" style={{ opacity: 0 }}>SAVE</span>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('upgrade.monthly')}</p>
                  <p className="text-xl font-bold mt-1 leading-none" style={{ color: 'hsl(var(--foreground))' }}>{nativeMonthlyPrice}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('upgrade.perMonth')}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('upgrade.billedMonthly')}</p>
                </button>
              </div>

              <button
                onClick={handleNativeUpgrade}
                disabled={isLoading || isLoadingOfferings}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #964735 0%, #D97B66 100%)' }}
              >
                {isLoading || isLoadingOfferings
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : allProductIds.length === 0
                    ? <RefreshCw className="h-4 w-4" />
                    : <Crown className="h-4 w-4" />
                }
                {nativeCtaLabel()}
              </button>

              <button
                onClick={handleRestore}
                disabled={isLoading}
                className="w-full py-3 text-xs flex items-center justify-center gap-1.5"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('upgrade.restorePurchases')}
              </button>
            </>
          ) : (
            /* Web: Stripe pricing */
            <>
              <div className="grid grid-cols-2 gap-2.5 items-stretch">
                <button
                  onClick={() => setBillingCycle('annual')}
                  className="rounded-2xl p-4 text-left flex flex-col transition-all"
                  style={{
                    border: billingCycle === 'annual' ? '2px solid #964735' : '2px solid hsl(var(--border))',
                    background: billingCycle === 'annual' ? '#FDF3EE' : 'hsl(var(--card))',
                  }}
                >
                  <span className="self-start text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white mb-2" style={{ background: '#964735' }}>
                    SAVE CHF {ANNUAL_SAVINGS}
                  </span>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('upgrade.annual')}</p>
                  <p className="text-xl font-bold mt-1 leading-none" style={{ color: 'hsl(var(--foreground))' }}>CHF {ANNUAL_MONTHLY}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('upgrade.perMonth')}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('upgrade.billedAnnually')} · CHF {ANNUAL_PRICE}/yr</p>
                </button>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className="rounded-2xl p-4 text-left flex flex-col transition-all"
                  style={{
                    border: billingCycle === 'monthly' ? '2px solid #964735' : '2px solid hsl(var(--border))',
                    background: billingCycle === 'monthly' ? '#FDF3EE' : 'hsl(var(--card))',
                  }}
                >
                  <span className="text-[9px] mb-2 select-none" style={{ opacity: 0 }}>SAVE</span>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('upgrade.monthly')}</p>
                  <p className="text-xl font-bold mt-1 leading-none" style={{ color: 'hsl(var(--foreground))' }}>CHF {MONTHLY_PRICE}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('upgrade.perMonth')}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('upgrade.billedMonthly')}</p>
                </button>
              </div>
              <button
                onClick={handleWebUpgrade}
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #964735 0%, #D97B66 100%)' }}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                {isLoading ? t('upgrade.processing') : t('upgrade.upgradeToPremium')}
              </button>
            </>
          )}

          <button
            onClick={() => setOpen(false)}
            className="w-full py-1 text-sm"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {t('upgrade.maybeLater')}
          </button>

        </div>
      </DialogContent>
    </Dialog>
  );
};
