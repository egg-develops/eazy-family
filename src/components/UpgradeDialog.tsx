import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { error as logError } from "@/lib/logger";
import { Capacitor } from "@capacitor/core";
import { getRCOfferings, purchaseRCPackage, restoreRCPurchases, type RCPackage } from "@/lib/revenuecat";

const isNative = Capacitor.isNativePlatform();

interface UpgradeDialogProps {
  children: React.ReactNode;
}

export const UpgradeDialog = ({ children }: UpgradeDialogProps) => {
  const { isPremium, refreshSubscription } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [rcPackages, setRcPackages] = useState<RCPackage[]>([]);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (open && isNative) {
      getRCOfferings().then(pkgs => setRcPackages(pkgs));
    }
  }, [open, isNative]);

  if (isPremium) {
    return <>{children}</>;
  }

  const annualPkg = rcPackages.find(p =>
    p.packageType === 'ANNUAL' || p.identifier.toLowerCase().includes('annual') || p.identifier === 'yearly'
  );
  const monthlyPkg = rcPackages.find(p =>
    p.packageType === 'MONTHLY' || p.identifier.toLowerCase().includes('monthly')
  );

  const handleNativeUpgrade = async () => {
    const pkg = billingCycle === 'annual' ? annualPkg : monthlyPkg;
    if (!pkg) {
      toast({ title: "Not available", description: "Could not load offerings. Try again.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const granted = await purchaseRCPackage(pkg.identifier);
      if (granted) {
        await refreshSubscription();
        setOpen(false);
        toast({ title: "Welcome to Family Plan!", description: "Your subscription is now active." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('userCancelled')) {
        logError("RC purchase error:", err);
        toast({ title: "Purchase failed", description: "Please try again.", variant: "destructive" });
      }
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

  const freeFeatures = [
    "Up to 4 family members",
    "Private family messaging",
    "Calendar & reminders",
    "Shopping & to-do lists with voice input",
    "Eazy AI Assistant — 10 messages/month",
    "Community browsing",
  ];

  const familyFeatures = [
    "Unlimited family members",
    "Eazy AI Assistant (unlimited)",
    "Shared lists & real-time sync",
    "Private family messaging",
    "Create & manage groups",
    "Outlook & Google Calendar sync",
    "Priority support",
    "No ads, ever",
  ];

  const monthlyPrice = 5;
  const annualPrice = 49;
  const annualMonthly = (annualPrice / 12).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-primary" />
            Upgrade to Family
          </DialogTitle>
          <DialogDescription className="text-left">Unlock all premium features</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Free Plan */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">Free Plan — What you have now</h3>
            <div className="space-y-2">
              {freeFeatures.map((feature) => (
                <div key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Family Plan */}
          <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Family Plan — Everything in Free, plus:
            </h3>
            <div className="space-y-2">
              {familyFeatures.map((feature) => (
                <div key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Billing / CTA */}
          <div className="space-y-4 pt-4 border-t">
            {/* Billing toggle — shared between native and web */}
            <div className="flex rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-primary text-white'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  billingCycle === 'annual'
                    ? 'bg-primary text-white'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                Annual
              </button>
            </div>

            {isNative ? (
              /* iOS: RevenueCat purchase flow */
              <>
                <div className="text-center">
                  {billingCycle === 'annual' && annualPkg ? (
                    <div>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Badge className="bg-grape-100 text-grape-700 border-0 text-xs">2 months free</Badge>
                      </div>
                      <p className="text-3xl font-bold">
                        {annualPkg.product.priceString}
                        <span className="text-lg text-muted-foreground font-normal">/year</span>
                      </p>
                    </div>
                  ) : billingCycle === 'monthly' && monthlyPkg ? (
                    <div>
                      <p className="text-3xl font-bold">
                        {monthlyPkg.product.priceString}
                        <span className="text-lg text-muted-foreground font-normal">/month</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Cancel anytime</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">Loading pricing…</p>
                  )}
                </div>

                <Button
                  className="w-full gradient-primary text-white border-0"
                  size="lg"
                  onClick={handleNativeUpgrade}
                  disabled={isLoading || (!annualPkg && !monthlyPkg)}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {isLoading ? "Processing…" : "Subscribe"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground text-xs"
                  onClick={handleRestore}
                  disabled={isLoading}
                >
                  <RotateCcw className="h-3 w-3 mr-1.5" />
                  Restore Purchases
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setOpen(false)}>
                  Maybe Later
                </Button>
              </>
            ) : (
              /* Web: Stripe checkout */
              <>
                <div className="text-center">
                  {billingCycle === 'monthly' ? (
                    <div>
                      <p className="text-3xl font-bold">
                        CHF {monthlyPrice}<span className="text-lg text-muted-foreground font-normal">/month</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Cancel anytime</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Badge className="bg-grape-100 text-grape-700 border-0 text-xs">2 months free</Badge>
                      </div>
                      <p className="text-3xl font-bold">
                        CHF {annualMonthly}<span className="text-lg text-muted-foreground font-normal">/month</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        CHF {annualPrice} billed annually · Save CHF {monthlyPrice * 12 - annualPrice}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full gradient-primary text-white border-0"
                  size="lg"
                  onClick={handleWebUpgrade}
                  disabled={isLoading}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {isLoading
                    ? "Loading..."
                    : `Upgrade — CHF ${billingCycle === 'annual' ? annualPrice + '/year' : monthlyPrice + '/month'}`}
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setOpen(false)}>
                  Maybe Later
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
