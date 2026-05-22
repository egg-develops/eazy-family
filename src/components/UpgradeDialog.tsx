import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Crown } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { error as logError } from "@/lib/logger";
import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

interface UpgradeDialogProps {
  children: React.ReactNode;
}

export const UpgradeDialog = ({ children }: UpgradeDialogProps) => {
  const { isPremium } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  if (isPremium) {
    return <>{children}</>;
  }

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to upgrade to the Family Plan.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { billing_cycle: billingCycle },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      logError("Error creating checkout:", error);
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
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
            {isNative ? (
              /* iOS: all features currently free — no external payment */
              <div className="space-y-3 text-center">
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                  <p className="text-sm font-medium text-green-800">All features included</p>
                  <p className="text-xs text-green-700 mt-1">
                    Every feature in Eazy.Family is currently available at no cost. No subscription required.
                  </p>
                </div>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setOpen(false)}>
                  Got it
                </Button>
              </div>
            ) : (
              /* Web: full Stripe checkout */
              <>
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
                  onClick={handleUpgrade}
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
