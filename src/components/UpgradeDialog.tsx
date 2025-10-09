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

interface UpgradeDialogProps {
  children: React.ReactNode;
}

export const UpgradeDialog = ({ children }: UpgradeDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  const applyPromo = () => {
    if (promoCode.trim().toUpperCase() === "EZ-FAMILY-VIP") {
      localStorage.setItem("eazy-family-plan", "vip");
      setPromoApplied(true);
      toast({
        title: "Promo applied",
        description: "Family Plan activated for free. Enjoy!",
      });
      setOpen(false);
      window.location.reload();
    } else {
      toast({
        title: "Invalid code",
        description: "Please check your promo code and try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpgrade = async () => {
    if (promoApplied || promoCode.trim().toUpperCase() === "EZ-FAMILY-VIP") {
      applyPromo();
      return;
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
      console.error("Error creating checkout:", error);
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
    "Photo storage (limited)",
    "Task management",
    "Community access",
  ];

  const familyFeatures = [
    "Unlimited family members",
    "Unlimited calendar syncs",
    "Shared lists across family",
    "Private messaging",
    "Create groups",
    "EazyAI Assistant",
    "Unlimited photo storage",
    "AI photo editing & management",
    "Photo tagging by location",
    "Create memory books",
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
              <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-2">7-Day Free Trial</div>
              <p className="text-3xl font-bold">
                CHF 5<span className="text-lg text-muted-foreground">/month</span>
              </p>
              <p className="text-sm text-muted-foreground">Cancel anytime • Auto-renews after trial</p>
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
              {isLoading ? "Loading..." : "Start Free Trial"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">You won't be charged until your 7-day trial ends</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
