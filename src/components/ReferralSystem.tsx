import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Gift, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
export const ReferralSystem = () => {
  const {
    toast
  } = useToast();
  const [referralCode] = useState(() => {
    const saved = localStorage.getItem('eazy-family-referral-code');
    if (saved) return saved;
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('eazy-family-referral-code', newCode);
    return newCode;
  });
  const referralCount = parseInt(localStorage.getItem('eazy-family-referral-count') || '0');
  const copyReferralCode = () => {
    navigator.clipboard.writeText(`EAZY${referralCode}`);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard"
    });
  };
  const shareReferral = () => {
    const shareText = `Join me on Eazy.Family! Use my code EAZY${referralCode} to get 7 days of Premium free! 🎁`;
    if (navigator.share) {
      navigator.share({
        title: 'Join Eazy.Family',
        text: shareText
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied!",
        description: "Share message copied to clipboard"
      });
    }
  };
  return <Card className="shadow-custom-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Refer Friends, Get Premium
        </CardTitle>
        <CardDescription>Share Eazy.Family and earn 30 days of Premium for each friend who joins</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
          <p className="text-sm font-medium mb-2">Your Referral Code</p>
          <div className="flex gap-2">
            <Input value={`EAZY${referralCode}`} readOnly className="font-mono text-lg font-bold" />
            <Button onClick={copyReferralCode} size="icon">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{referralCount} Friends Referred</p>
              <p className="text-sm text-muted-foreground">
                {referralCount * 7} days of Premium earned
              </p>
            </div>
          </div>
        </div>

        <Button onClick={shareReferral} className="w-full gradient-primary text-white border-0">
          Share with Friends
        </Button>
      </CardContent>
    </Card>;
};