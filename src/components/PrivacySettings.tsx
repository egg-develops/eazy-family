import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";

export const PrivacySettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [shareEmail, setShareEmail] = useState(false);
  const [sharePhone, setSharePhone] = useState(false);

  useEffect(() => {
    loadPrivacySettings();
  }, [user]);

  const loadPrivacySettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, share_email, share_phone")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setDisplayName(data.display_name || "");
        setShareEmail(data.share_email || false);
        setSharePhone(data.share_phone || false);
      }
    } catch (error) {
      console.error("Error loading privacy settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const savePrivacySettings = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          share_email: shareEmail,
          share_phone: sharePhone,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      await supabase
        .from("family_members")
        .update({
          display_name: displayName.trim() || null,
        })
        .eq("user_id", user.id);

      toast({
        title: t('privacySettings.saved'),
        description: t('privacySettings.savedDesc'),
      });
    } catch (error) {
      console.error("Error saving privacy settings:", error);
      toast({
        title: t('privacySettings.error'),
        description: t('privacySettings.errorDesc'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t('privacySettings.title')}
        </CardTitle>
        <CardDescription>
          {t('privacySettings.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="display-name">{t('privacySettings.displayName')}</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('privacySettings.displayNamePlaceholder')}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            {t('privacySettings.displayNameHint')}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share-email">{t('privacySettings.shareEmail')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('privacySettings.shareEmailDesc')}
              </p>
            </div>
            <Switch
              id="share-email"
              checked={shareEmail}
              onCheckedChange={setShareEmail}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share-phone">{t('privacySettings.sharePhone')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('privacySettings.sharePhoneDesc')}
              </p>
            </div>
            <Switch
              id="share-phone"
              checked={sharePhone}
              onCheckedChange={setSharePhone}
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button
            onClick={savePrivacySettings}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('common.save')
            )}
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            <strong>{t('privacySettings.displayName')}:</strong> {t('privacySettings.displayNameHint')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
