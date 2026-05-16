import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Users, Plus, Mail, Trash2, ArrowLeft, UserPlus, Copy, RefreshCw, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { error as logError } from "@/lib/logger";

interface FamilyMember {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  joined_at: string | null;
  family_id: string;
  share_email: boolean | null;
  share_phone: boolean | null;
}

interface FamilyInvitation {
  id: string;
  invitee_email: string | null;
  invitee_phone: string | null;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
}

const FamilyProfile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyInfo, setFamilyInfo] = useState<{ name: string; invite_code: string } | null>(null);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadFamilyData();

    }
  }, [user]);

  const loadFamilyData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 1) Get the family for the current user
      const { data: myMembership, error: membershipError } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (membershipError) throw membershipError;

      const currentFamilyId = myMembership?.family_id ?? null;
      setFamilyId(currentFamilyId);

      // 2) Load family info and active members
      if (currentFamilyId) {
        // Load family details including invite code (use maybeSingle for backwards compatibility)
        const { data: familyData, error: familyError } = await supabase
          .from("families")
          .select("name, invite_code")
          .eq("id", currentFamilyId)
          .maybeSingle();
        
        if (familyError) throw familyError;
        
        // If no family record exists, create one for backwards compatibility
        if (!familyData) {
          const { data: newCode } = await supabase.rpc('generate_family_invite_code');
          await supabase.from('families').insert({
            id: currentFamilyId,
            name: "My Family",
            invite_code: newCode || 'ERROR',
            created_by: user.id
          });
          setFamilyInfo({ name: "My Family", invite_code: newCode || 'ERROR' });
        } else {
          setFamilyInfo(familyData);
        }

        // Load family members using the safe view that respects privacy
        const { data: members, error: membersError } = await supabase
          .from("family_members_safe")
          .select("*")
          .eq("family_id", currentFamilyId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (membersError) throw membersError;
        setFamilyMembers(members || []);
      } else {
        setFamilyMembers([]);
        setFamilyInfo(null);
      }

      // 3) Load pending invitations sent by this user (tokens are never exposed)
      const { data: invites } = await supabase
        .from("family_invitations")
        .select("id, invitee_email, invitee_phone, role, status, expires_at, created_at")
        .eq("inviter_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      setInvitations(invites || []);
    } catch (error) {
      logError("Error loading family data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = () => {
    if (!familyInfo) {
      toast({ title: t('familyProfile.noFamilyFound'), description: t('familyProfile.noFamilyCreate'), variant: "destructive" });
      return;
    }
    shareInviteLink();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !familyId) return;
    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", memberId)
        .eq("family_id", familyId);
      if (error) throw error;
      toast({ title: t('familyProfile.memberRemoved'), description: t('familyProfile.memberRemovedDesc') });
      loadFamilyData();
    } catch (error) {
      logError("Error removing member:", error);
      toast({ title: t('common.error'), description: t('familyProfile.errorRemovingMember'), variant: "destructive" });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("family_invitations")
        .delete()
        .eq("id", invitationId)
        .eq("inviter_id", user.id);
      if (error) throw error;
      toast({ title: t('familyProfile.invitationCancelled'), description: t('familyProfile.invitationCancelledDesc') });
      loadFamilyData();
    } catch (error) {
      logError("Error cancelling invitation:", error);
      toast({ title: t('common.error'), description: t('familyProfile.errorCancellingInvite'), variant: "destructive" });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "parent":
        return "default";
      case "child":
        return "secondary";
      case "grandparent":
        return "outline";
      case "caretaker":
        return "default";
      default:
        return "secondary";
    }
  };

  const copyInviteCode = () => {
    if (!familyInfo) return;
    navigator.clipboard.writeText(familyInfo.invite_code);
    toast({
      title: t('familyProfile.copied'),
      description: t('familyProfile.copiedDesc'),
    });
  };

  const shareInviteLink = () => {
    if (!familyInfo) return;
    const inviteUrl = `https://eazy.family/join-family?code=${familyInfo.invite_code}`;
    const shareText = `You're invited to join ${familyInfo.name} on Eazy.Family!\n\nTap the link to join instantly:\n${inviteUrl}`;
    if (navigator.share) {
      navigator.share({ title: `Join ${familyInfo.name} on Eazy.Family`, text: shareText, url: inviteUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      toast({ title: t('familyProfile.linkCopied'), description: t('familyProfile.linkCopiedDesc') });
    }
  };

  const regenerateInviteCode = async () => {
    if (!familyId || !user) return;
    
    setRegeneratingCode(true);
    try {
      // Generate new code
      const { data: newCode, error: codeError } = await supabase.rpc('generate_family_invite_code');
      if (codeError) throw codeError;

      // Update family with new code
      const { error: updateError } = await supabase
        .from('families')
        .update({ invite_code: newCode })
        .eq('id', familyId);
      
      if (updateError) throw updateError;

      toast({
        title: t('familyProfile.codeRegenerated'),
        description: t('familyProfile.codeRegeneratedDesc'),
      });

      loadFamilyData();
    } catch (error) {
      logError('Error regenerating code:', error);
      toast({
        title: t('common.error'),
        description: t('familyProfile.codeRegeneratedDesc') || "Failed to regenerate invite code",
        variant: "destructive",
      });
    } finally {
      setRegeneratingCode(false);
    }
  };

  const [isCreateFamilyOpen, setIsCreateFamilyOpen] = useState(false);
  const [familyName, setFamilyName] = useState("");

  const handleCreateFamily = async () => {
    if (!user) return;
    
    // Validate family name
    const trimmedName = familyName.trim();
    if (!trimmedName) {
      toast({
        title: t('familyProfile.familyNameRequired'),
        description: t('familyProfile.enterFamilyName'),
        variant: "destructive",
      });
      return;
    }

    if (trimmedName.length > 100) {
      toast({
        title: t('familyProfile.nameTooLong'),
        description: t('familyProfile.nameTooLongDesc'),
        variant: "destructive",
      });
      return;
    }

    if (!/^[a-zA-Z0-9\s'-]+$/.test(trimmedName)) {
      toast({
        title: t('familyProfile.invalidCharacters'),
        description: t('familyProfile.invalidCharactersDesc'),
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Generate invite code
      const { data: inviteCode, error: codeError } = await supabase
        .rpc('generate_family_invite_code');

      if (codeError) throw codeError;

      // Create family
      const newFamilyId = crypto.randomUUID();
      const { error: familyError } = await supabase
        .from("families")
        .insert({
          id: newFamilyId,
          name: trimmedName,
          invite_code: inviteCode,
          created_by: user.id,
        });

      if (familyError) throw familyError;

      // Add user as family member with profile info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, phone, full_name')
        .eq('user_id', user.id)
        .single();

      const { error: memberError } = await supabase
        .from("family_members")
        .insert({
          family_id: newFamilyId,
          user_id: user.id,
          role: "parent",
          inviter_id: user.id,
          email: profileData?.email,
          phone: profileData?.phone,
          full_name: profileData?.full_name,
        });

      if (memberError) throw memberError;

      toast({
        title: t('familyProfile.familyCreated'),
        description: t('familyProfile.familyCreatedDesc'),
      });

      setFamilyName("");
      setIsCreateFamilyOpen(false);
      loadFamilyData();
    } catch (error) {
      logError('Error creating family:', error);
      toast({
        title: t('common.error'),
        description: "Failed to create family. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/settings")} className="flex-shrink-0 min-h-[44px] min-w-[44px]">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            <span>{t('familyProfile.title')}</span>
          </h1>
        </div>
        <Button onClick={handleInviteMember} className="gap-2 gradient-primary text-white border-0 flex-shrink-0 whitespace-nowrap">
          <Share2 className="h-4 w-4" />
          {t('familyProfile.inviteMember')}
        </Button>
      </div>

      {/* Family Invite Code Section */}
      {familyId && familyInfo && (
        <Card className="shadow-custom-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t('familyProfile.inviteFamilyMembers')}
            </CardTitle>
            <CardDescription>
              {t('familyProfile.shareCodeDesc')} <strong>{familyInfo.name}</strong> on Eazy.Family
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Invite Code Display */}
            <div className="bg-card p-4 rounded-lg border-2 border-dashed border-primary/30">
              <p className="text-3xl font-mono font-bold text-center tracking-widest text-primary">
                {familyInfo.invite_code}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={copyInviteCode}
                className="gap-2 flex-1 min-w-[110px] min-h-[44px] px-4"
              >
                <Copy className="h-4 w-4 flex-shrink-0" />
                {t('familyProfile.copyCode')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!familyInfo) return;
                  const url = `https://eazy.family/join-family?code=${familyInfo.invite_code}`;
                  navigator.clipboard.writeText(url);
                  toast({ title: t('familyProfile.linkCopied'), description: t('familyProfile.linkCopiedDesc') });
                }}
                className="gap-2 flex-1 min-w-[110px] min-h-[44px] px-4"
              >
                <Copy className="h-4 w-4 flex-shrink-0" />
                {t('familyProfile.copyLink')}
              </Button>
              <Button
                variant="outline"
                onClick={shareInviteLink}
                className="gap-2 flex-1 min-w-[110px] min-h-[44px] px-4"
              >
                <Share2 className="h-4 w-4 flex-shrink-0" />
                {t('familyProfile.share')}
              </Button>
            </div>

            {/* Regenerate Code */}
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={regenerateInviteCode}
                disabled={regeneratingCode}
                className="w-full text-muted-foreground hover:text-destructive gap-2 min-h-[40px]"
              >
                <RefreshCw className={`h-4 w-4 flex-shrink-0 ${regeneratingCode ? 'animate-spin' : ''}`} />
                {regeneratingCode ? t('familyProfile.regeneratingCode') : t('familyProfile.regenerateCode')}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-1">{t('familyProfile.oldCodeWarning')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Family Members */}
      {!familyId ? (
        <Card className="shadow-custom-md">
          <CardContent className="p-8 text-center">
            <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium text-lg mb-2">{t('familyProfile.noFamilyFound')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('familyProfile.noFamilyFoundDesc')}
            </p>
            <Dialog open={isCreateFamilyOpen} onOpenChange={setIsCreateFamilyOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-white border-0">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('familyProfile.createFamily')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('familyProfile.createYourFamily')}</DialogTitle>
                  <DialogDescription>{t('familyProfile.chooseFamilyName')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="family-name">{t('familyProfile.familyNameLabel')}</Label>
                    <Input
                      id="family-name"
                      placeholder={t('familyProfile.familyNamePlaceholder')}
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleCreateFamily()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateFamilyOpen(false)}>{t('familyProfile.cancel')}</Button>
                  <Button onClick={handleCreateFamily} className="gradient-primary text-white border-0">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('familyProfile.create')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle>{t('familyProfile.familyMembers')}</CardTitle>
          <CardDescription>{t('familyProfile.activeMembers')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t('familyProfile.loadingMembers')}</div>
          ) : familyMembers.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">{t('familyProfile.noMembersYet')}</p>
              <p className="text-sm text-muted-foreground">{t('familyProfile.inviteFirstMember')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {familyMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{member.display_name || "Family Member"}</p>
                      <Badge variant={getRoleBadgeColor(member.role)}>{member.role}</Badge>
                    </div>
                    <div className="space-y-1">
                      {member.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </p>
                      )}
                      {member.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </p>
                      )}
                      {!member.email && !member.phone && (
                        <p className="text-xs text-muted-foreground italic">
                          {t('familyProfile.contactNotShared')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="shadow-custom-md">
          <CardHeader>
            <CardTitle>{t('familyProfile.pendingInvitations')}</CardTitle>
            <CardDescription>{t('familyProfile.pendingDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{t('familyProfile.pending')}</Badge>
                      <Badge variant={getRoleBadgeColor(invitation.role)}>{invitation.role}</Badge>
                    </div>
                    <div className="space-y-1">
                      {invitation.invitee_email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {invitation.invitee_email}
                        </p>
                      )}
                      {invitation.invitee_phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {invitation.invitee_phone}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{t('familyProfile.expires')} {new Date(invitation.expires_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleCancelInvitation(invitation.id)}>
                    {t('familyProfile.cancelInvite')}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FamilyProfile;
