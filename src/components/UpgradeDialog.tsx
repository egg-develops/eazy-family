import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, Crown, RotateCcw, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { error as logError } from "@/lib/logger";
import { Capacitor } from "@capacitor/core";
import { getRCOfferings, restoreRCPurchases, presentSubscriptionStore, type RCPackage } from "@/lib/revenuecat";

const isNative = Capacitor.isNativePlatform();

const MONTHLY_PRICE = 5;
const ANNUAL_PRICE = 49;
const ANNUAL_MONTHLY = (ANNUAL_PRICE / 12).toFixed(2);
const ANNUAL_SAVINGS = MONTHLY_PRICE * 12 - ANNUAL_PRICE;

const features = [
  "Unlimited family members",
  "Unlimited calendars — sync your Google, Apple, and Outlook",
  "Unlimited private and shared lists for Shopping and Tasks",
  "Full voice AI — EZ Button, your family's own assistant",
  "Full intelligence layer — conflict detection, shopping frequency, task escalation",
  "Rituals & Journal — your private space for reflection",
  "Morning Digest — daily & email",
];

interface UpgradeDialogProps {
  children: React.ReactNode;
}

export const UpgradeDialog = ({ children }: UpgradeDialogProps) => {
  const { isPremium, isTrial, refreshSubscription } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [rcPackages, setRcPackages] = useState<RCPackage[]>([]);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && isNative) {
      getRCOfferings().then(pkgs => setRcPackages(pkgs));
    }
  }, [open]);

  // Already paid (not a trial) — nothing to upgrade
  if (isPremium && !isTrial) return <>{children}</>;

  const annualPkg = rcPackages.find(p =>
    p.packageType === 'ANNUAL' || p.identifier.toLowerCase().includes('annual') || p.identifier === 'yearly'
  );
  const monthlyPkg = rcPackages.find(p =>
    p.packageType === 'MONTHLY' || p.identifier.toLowerCase().includes('monthly')
  );

  // Collect all App Store product IDs to pass to SubscriptionStoreView
  const allProductIds = rcPackages
    .map(p => p.product.productIdentifier)
    .filter(Boolean);

  const handleNativeUpgrade = async () => {
    if (allProductIds.length === 0) {
      toast({ title: "Not available", description: "Could not load offerings. Try again.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      // Present Apple's native SubscriptionStoreView — handles purchase + all disclosures
      await presentSubscriptionStore(allProductIds);
      // Sheet dismissed — check if entitlement is now active
      await refreshSubscription();
      setOpen(false);
    } catch (err: unknown) {
      logError("SubscriptionStore error:", err);
      toast({ title: "Purchase failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    try {
      const granted = await restoreRCPurchases();
      if (granted) {
        await refreshSubscription();
        setOpen(false);
        toast({ title: "Purchases restored", description: "Your subscription is active." });
      } else {
        toast({ title: "Nothing to restore", description: "No active subscription found." });
      }
    } catch {
      toast({ title: "Restore failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebUpgrade = async () => {
    if (isNative) return; // iOS must never reach Stripe
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Authentication Required", description: "Please sign in to upgrade.", variant: "destructive" });
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { billing_cycle: billingCycle },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      logError("Error creating checkout:", error);
      toast({ title: "Error", description: "Failed to start checkout. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm w-[92%] p-0 overflow-hidden max-h-[92vh] overflow-y-auto">

        {/* Hero */}
        <div className="px-6 pt-7 pb-5 text-center" style={{ background: 'linear-gradient(160deg, #964735 0%, #D97B66 100%)' }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Crown className="h-6 w-6 text-white" />
            <h2 className="text-xl font-bold text-white tracking-tight">Family Premium</h2>
          </div>
          {isTrial ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                <Sparkles className="h-3.5 w-3.5" />
                Keep your full access
              </div>
              <p className="text-white/75 text-xs mt-2">
                Upgrade before your trial ends.<br />Cancel anytime.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                <Sparkles className="h-3.5 w-3.5" />
                14-day free trial
              </div>
              <p className="text-white/75 text-xs mt-2">
                No charge today.<br />Cancel anytime.
              </p>
            </>
          )}
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Features */}
          <div className="space-y-2">
            {features.map(f => (
              <div key={f} className="flex items-start gap-2.5 text-sm">
                <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#964735' }} />
                <span style={{ color: 'hsl(var(--foreground))' }}>{f}</span>
              </div>
            ))}
          </div>

          {/* iOS: single CTA — Apple's SubscriptionStoreView handles pricing, trial info, T&C */}
          {isNative ? (
            <>
              <button
                onClick={handleNativeUpgrade}
                disabled={isLoading || allProductIds.length === 0}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #964735 0%, #D97B66 100%)' }}
              >
                <Crown className="h-4 w-4" />
                {isLoading ? "Opening…" : allProductIds.length === 0 ? "Loading…" : "Upgrade to Premium"}
              </button>
              <button
                onClick={handleRestore}
                disabled={isLoading}
                className="w-full py-2 text-xs flex items-center justify-center gap-1.5"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                <RotateCcw className="h-3 w-3" />
                Restore Purchases
              </button>
            </>
          ) : (
            /* Web: Stripe — show pricing cards + CTA (web only, never shown on iOS) */
            <>
              <div className="grid grid-cols-2 gap-2.5 items-stretch">
                {/* Annual */}
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
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>Annual</p>
                  <p className="text-xl font-bold mt-1 leading-none" style={{ color: 'hsl(var(--foreground))' }}>CHF {ANNUAL_MONTHLY}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>/month</p>
                  <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Billed annually · CHF {ANNUAL_PRICE}/yr</p>
                </button>
                {/* Monthly */}
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className="rounded-2xl p-4 text-left flex flex-col transition-all"
                  style={{
                    border: billingCycle === 'monthly' ? '2px solid #964735' : '2px solid hsl(var(--border))',
                    background: billingCycle === 'monthly' ? '#FDF3EE' : 'hsl(var(--card))',
                  }}
                >
                  {/* Invisible spacer matches Annual badge row so card heights align */}
                  <span className="text-[9px] mb-2 select-none" style={{ opacity: 0 }}>SAVE</span>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>Monthly</p>
                  <p className="text-xl font-bold mt-1 leading-none" style={{ color: 'hsl(var(--foreground))' }}>CHF {MONTHLY_PRICE}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>/month</p>
                  <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Billed monthly</p>
                </button>
              </div>
              <button
                onClick={handleWebUpgrade}
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #964735 0%, #D97B66 100%)' }}
              >
                <Crown className="h-4 w-4" />
                {isLoading ? "Processing…" : "Upgrade to Premium"}
              </button>
            </>
          )}

          <button
            onClick={() => setOpen(false)}
            className="w-full py-1 text-sm"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Maybe Later
          </button>

        </div>
      </DialogContent>
    </Dialog>
  );
};
