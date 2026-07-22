import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Gift, Users, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { error as logError } from "@/lib/logger";
import { useTranslation } from "react-i18next";

export const ReferralSystem = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadReferralData();
  }, [user?.id]);

  const loadReferralData = async () => {
    try {
      // Idempotent server-side code generation (no client race).
      const { data: code } = await supabase.rpc('get_or_create_my_referral_code');
      if (code) setReferralCode(code as string);

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

  const inviteUrl = referralCode ? `https://eazy.family/auth?ref=${referralCode}` : "https://eazy.family";

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({ title: t('referral.copied'), description: t('referral.copiedDesc') });
  };

  const shareInvite = async () => {
    const text = t('referral.shareMessage', { url: inviteUrl });
    if (navigator.share) {
      try { await navigator.share({ title: t('referral.shareTitle'), text }); } catch { /* dismissed */ }
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: t('referral.copied'), description: t('referral.shareCopiedDesc') });
    }
  };

  if (loading) return null;

  return (
    <Card className="shadow-custom-md" data-tutorial="referral-system">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          {t('referral.title')}
        </CardTitle>
        <CardDescription>{t('referral.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
          <p className="text-sm font-medium mb-2">{t('referral.yourCode')}</p>
          <div className="flex gap-2">
            <Input value={referralCode} readOnly className="font-mono text-lg font-bold" />
            <Button onClick={copyCode} size="icon" aria-label={t('referral.copied')}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          <Users className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <p className="font-medium">{referralCount} {t('referral.friendsReferred')}</p>
            {referralCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {referralCount * 14} {t('referral.daysEarned')}
              </p>
            )}
          </div>
        </div>

        <Button onClick={shareInvite} className="w-full gradient-primary text-white border-0">
          <Share2 className="h-4 w-4 mr-2" />
          {t('referral.shareWithFriends')}
        </Button>
      </CardContent>
    </Card>
  );
};
