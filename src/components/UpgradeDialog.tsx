import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "lucide-react";

interface UpgradeDialogProps {
  children: React.ReactNode;
}

export const UpgradeDialog = ({ children }: UpgradeDialogProps) => {
  const freeFeatures = [
    "Basic calendar",
    "Photo storage (limited)",
    "Task management",
    "Community access",
  ];

  const familyFeatures = [
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
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-primary" />
            Upgrade to Family Plan
          </DialogTitle>
          <DialogDescription>
            Unlock all premium features for your family
          </DialogDescription>
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
              <p className="text-3xl font-bold">$9.99<span className="text-lg text-muted-foreground">/month</span></p>
              <p className="text-sm text-muted-foreground">Cancel anytime</p>
            </div>
            <Button className="w-full gradient-primary text-white border-0" size="lg">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
