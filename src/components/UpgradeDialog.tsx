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
import { Check, Crown } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { error as logError } from "@/lib/logger";

interface UpgradeDialogProps {
  children: React.ReactNode;
}

export const UpgradeDialog = ({ children }: UpgradeDialogProps) => {
  const { isPremium } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // If user is already premium, don't wrap in upgrade dialog - just render children directly
  if (isPremium) {
    return <>{children}</>;
  }

  const applyPromo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in first.",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);

      // Validate promo code from database
      const { data: promoData, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.trim().toUpperCase())
        .single();

      if (promoError || !promoData) {
        toast({
          title: "Invalid code",
          description: "Please check your promo code and try again.",
          variant: "destructive",
        });
        return;
      }

      // Check expiration
      if (promoData.expires_at && new Date(promoData.expires_at) < new Date()) {
        toast({
          title: "Expired code",
          description: "This promo code has expired.",
          variant: "destructive",
        });
        return;
      }

      // Check usage limit
      if (promoData.max_uses && promoData.used_count >= promoData.max_uses) {
        toast({
          title: "Code limit reached",
          description: "This promo code has reached its usage limit.",
          variant: "destructive",
        });
        return;
      }

      // Apply the promotion - update user subscription
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_premium: true, upgraded_at: new Date().toISOString() })
        .eq('user_id', session.user.id);

      if (updateError) throw updateError;

      // Increment usage count
      await supabase
        .from('promo_codes')
        .update({ used_count: (promoData.used_count || 0) + 1 })
        .eq('id', promoData.id);

      setPromoApplied(true);
      toast({
        title: "Promo applied",
        description: "Family Plan activated for free. Enjoy!",
      });
      setOpen(false);
      window.location.reload();
    } catch (error) {
      logError('Error applying promo:', error);
      toast({
        title: "Error",
        description: "Failed to apply promo code.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    // Check if promo code is entered - if so, apply it instead of payment
    if (promoCode.trim()) {
      await applyPromo();
      return;
    }

    if (promoApplied) {
      return; // Already applied
    }

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
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
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
    "Basic calendar",
    "Task management",
    "Community access",
    "Shopping lists",
  ];

  const familyFeatures = [
    "Unlimited family members",
    "Unlimited calendar syncs",
    "Shared lists across family",
    "Private messaging",
    "Create custom groups",
    "EazyAI Assistant",
    "Sell items on marketplace",
    "Priority support",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-primary" />
            Upgrade to Family Plan
          </DialogTitle>
          <DialogDescription>Unlock all premium features for your family</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Free Plan */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">Free Plan - What you have now</h3>
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
              Family Plan - Everything in Free, plus:
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

          {/* Pricing */}
          <div className="space-y-4 pt-4 border-t">
            <div className="text-center space-y-2">
              <p className="text-3xl font-bold">
                CHF 5<span className="text-lg text-muted-foreground">/month</span>
              </p>
              <p className="text-sm text-muted-foreground">Cancel anytime</p>
            </div>

            {/* Promo code */}
            <div className="flex gap-2 items-center">
              <Input placeholder="Have a promo code?" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
              <Button variant="outline" onClick={applyPromo}>
                Apply
              </Button>
            </div>

            <Button className="w-full gradient-primary text-white border-0" size="lg" onClick={handleUpgrade} disabled={isLoading}>
              <Crown className="h-4 w-4 mr-2" />
              {isLoading ? "Loading..." : "Upgrade to Family Plan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
