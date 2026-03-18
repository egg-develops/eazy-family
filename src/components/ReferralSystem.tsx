import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Gift, Users, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { error as logError } from "@/lib/logger";

export const ReferralSystem = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadReferralData();
    }
  }, [user?.id]);

  const loadReferralData = async () => {
    try {
      // Get or create referral code from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user!.id)
        .single();

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      } else {
        // Generate and save a new referral code
        const newCode = `EAZY${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await supabase
          .from('profiles')
          .update({ referral_code: newCode })
          .eq('user_id', user!.id);
        setReferralCode(newCode);
      }

      // Count successful referrals
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', user!.id)
        .eq('status', 'completed');

      setReferralCount(count || 0);
    } catch (error) {
      logError('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const shareReferral = () => {
    const shareText = `Join me on Eazy.Family! Use my code ${referralCode} to get 1 month of Premium free! 🎁`;
    if (navigator.share) {
      navigator.share({
        title: 'Join Eazy.Family',
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied!",
        description: "Share message copied to clipboard",
      });
    }
  };

  if (loading) return null;

  return (
    <Card className="shadow-custom-md" data-tutorial="referral-system">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Refer Friends, Get Premium
        </CardTitle>
        <CardDescription>
          Share Eazy.Family and earn 1 free month of Premium for each friend who joins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
          <p className="text-sm font-medium mb-2">Your Referral Code</p>
          <div className="flex gap-2">
            <Input value={referralCode} readOnly className="font-mono text-lg font-bold" />
            <Button onClick={copyReferralCode} size="icon" aria-label="Copy referral code">
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
                {referralCount * 30} days of Premium earned
              </p>
            </div>
          </div>
        </div>

        <Button onClick={shareReferral} className="w-full gradient-primary text-white border-0">
          <Share2 className="h-4 w-4 mr-2" />
          Share with Friends
        </Button>
      </CardContent>
    </Card>
  );
};
