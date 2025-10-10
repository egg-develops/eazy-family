import { useState, useEffect } from "react";
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

      // Update family_members records to reflect new privacy settings
      await supabase
        .from("family_members")
        .update({
          display_name: displayName.trim() || null,
        })
        .eq("user_id", user.id);

      toast({
        title: "Privacy settings saved",
        description: "Your privacy preferences have been updated.",
      });
    } catch (error) {
      console.error("Error saving privacy settings:", error);
      toast({
        title: "Error",
        description: "Failed to save privacy settings. Please try again.",
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
          Privacy Settings
        </CardTitle>
        <CardDescription>
          Control what information you share with your family members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="display-name">Display Name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How you want to be called"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            This is the name family members will see. If empty, they'll see "Family Member".
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share-email">Share Email Address</Label>
              <p className="text-sm text-muted-foreground">
                Allow family members to see your email address
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
              <Label htmlFor="share-phone">Share Phone Number</Label>
              <p className="text-sm text-muted-foreground">
                Allow family members to see your phone number
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
                Saving...
              </>
            ) : (
              "Save Privacy Settings"
            )}
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Your display name is always visible to family members.
            Email and phone are only shown if you enable sharing. Even with sharing disabled,
            family admins can still manage your membership.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
