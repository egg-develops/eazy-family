import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Users, Plus, Mail, Phone, Trash2, ArrowLeft, Send, UserPlus, Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

interface FamilyMember {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  joined_at: string | null;
  family_id: string;
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

const inviteSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{1,14}$/u, { message: "Invalid phone number format" })
    .optional(),
  role: z.enum(["parent", "child", "grandparent", "caretaker", "other"]).default("parent"),
}).refine((data) => data.email || data.phone, { message: "Either email or phone is required" });

const FamilyProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [headerImages, setHeaderImages] = useState<string[]>([]);
  const [uploadingHeader, setUploadingHeader] = useState(false);

  // Invite form state
  const [inviteMethod, setInviteMethod] = useState<"email" | "phone">("email");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("parent");
  const [sending, setSending] = useState(false);

  // Track the current family this user belongs to
  const [familyId, setFamilyId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadFamilyData();
      const savedHeaderImages = localStorage.getItem(`eazy-family-profile-headers-${user.id}`);
      if (savedHeaderImages) {
        setHeaderImages(JSON.parse(savedHeaderImages));
      }
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

      // 2) Load active members of this family (if any)
      if (currentFamilyId) {
        const { data: members, error: membersError } = await supabase
          .from("family_members")
          .select("*")
          .eq("family_id", currentFamilyId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (membersError) throw membersError;
        setFamilyMembers(members || []);
      } else {
        setFamilyMembers([]);
      }

      // 3) Load pending invitations sent by this user (tokens are never exposed)
      const { data: invites, error: invitesError } = await supabase
        .from("family_invitations")
        .select("id, invitee_email, invitee_phone, role, status, expires_at, created_at")
        .eq("inviter_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (invitesError) throw invitesError;
      setInvitations(invites || []);
    } catch (error) {
      console.error("Error loading family data:", error);
      toast({
        title: "Error",
        description: "Failed to load family members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to invite members",
        variant: "destructive",
      });
      return;
    }

    if (!familyId) {
      toast({
        title: "No family found",
        description: "Create or join a family first before inviting members.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Validate inputs
      const validationData = inviteSchema.parse({
        email: inviteMethod === "email" ? inviteEmail : undefined,
        phone: inviteMethod === "phone" ? invitePhone : undefined,
        role: inviteRole,
      });

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      const invitationData: any = {
        family_id: familyId, // IMPORTANT: use the actual family id for RLS policy
        inviter_id: user.id,
        role: inviteRole,
        status: "pending",
        token,
        expires_at: expiresAt.toISOString(),
      };

      if (inviteMethod === "email") {
        invitationData.invitee_email = validationData.email;
      } else {
        invitationData.invitee_phone = validationData.phone;
      }

      const { error } = await supabase.from("family_invitations").insert([invitationData]);
      if (error) throw error;

      const inviteLink = `${window.location.origin}/accept-invite?token=${token}`;
      console.log("Invitation link:", inviteLink);

      toast({
        title: "Invitation sent!",
        description: `Family member invited via ${inviteMethod}. Share this link: ${inviteLink}`,
      });

      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInvitePhone("");
      setInviteRole("parent");
      loadFamilyData();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error sending invitation:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to send invitation",
          variant: "destructive",
        });
      }
    } finally {
      setSending(false);
    }
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
      toast({ title: "Member removed", description: "Family member has been removed" });
      loadFamilyData();
    } catch (error) {
      console.error("Error removing member:", error);
      toast({ title: "Error", description: "Failed to remove family member", variant: "destructive" });
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
      toast({ title: "Invitation cancelled", description: "Invitation has been cancelled" });
      loadFamilyData();
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast({ title: "Error", description: "Failed to cancel invitation", variant: "destructive" });
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

  const handleHeaderImageUpload = async (files: FileList) => {
    if (!user) return;
    
    const remainingSlots = 5 - headerImages.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Maximum images reached",
        description: "You can upload a maximum of 5 header images.",
        variant: "destructive",
      });
      return;
    }
    
    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    
    setUploadingHeader(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of filesToUpload) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(filePath);
        
        uploadedUrls.push(publicUrl);
      }

      const newImages = [...headerImages, ...uploadedUrls];
      setHeaderImages(newImages);
      localStorage.setItem(`eazy-family-profile-headers-${user.id}`, JSON.stringify(newImages));
      
      toast({
        title: "Header images updated",
        description: `${uploadedUrls.length} image(s) added successfully.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Could not upload header images",
        variant: "destructive",
      });
    } finally {
      setUploadingHeader(false);
    }
  };

  const removeHeaderImage = (index: number) => {
    if (!user) return;
    const newImages = headerImages.filter((_, i) => i !== index);
    setHeaderImages(newImages);
    localStorage.setItem(`eazy-family-profile-headers-${user.id}`, JSON.stringify(newImages));
    toast({
      title: "Image removed",
      description: "Header image has been removed.",
    });
  };

  const [isCreateFamilyOpen, setIsCreateFamilyOpen] = useState(false);
  const [familyName, setFamilyName] = useState("");

  const handleCreateFamily = async () => {
    if (!user) return;
    
    if (!familyName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a family name.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Generate a new family ID
      const newFamilyId = crypto.randomUUID();
      
      // Create a new family by inserting a family_members record
      const { error: createError } = await supabase
        .from('family_members')
        .insert([{
          family_id: newFamilyId,
          inviter_id: user.id,
          user_id: user.id,
          role: 'parent',
          is_active: true,
          full_name: familyName
        }]);

      if (createError) throw createError;

      toast({
        title: "Family created",
        description: `${familyName} family has been created successfully. You can now invite members!`,
      });

      setFamilyName("");
      setIsCreateFamilyOpen(false);
      loadFamilyData();
    } catch (error) {
      console.error('Error creating family:', error);
      toast({
        title: "Error",
        description: "Failed to create family. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Images Carousel Section */}
      {headerImages.length > 0 ? (
        <div className="relative rounded-2xl overflow-hidden">
          <Carousel className="w-full">
            <CarouselContent>
              {headerImages.map((image, index) => (
                <CarouselItem key={index}>
                  <div className="relative h-32 md:h-48">
                    <img 
                      src={image} 
                      alt={`Family Profile Header ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeHeaderImage(index)}
                      className="absolute top-4 right-4 p-2 bg-red-500/70 hover:bg-red-600 rounded-full text-white transition-colors"
                      title="Remove this image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {headerImages.length > 1 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>
          {headerImages.length < 5 && (
            <>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="header-upload"
                onChange={(e) => {
                  if (e.target.files) handleHeaderImageUpload(e.target.files);
                }}
              />
              <label
                htmlFor="header-upload"
                className="absolute bottom-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors cursor-pointer"
                title={`Add more images (${headerImages.length}/5)`}
              >
                <Plus className="w-4 h-4" />
              </label>
            </>
          )}
        </div>
      ) : (
        <>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            id="header-upload"
            onChange={(e) => {
              if (e.target.files) handleHeaderImageUpload(e.target.files);
            }}
          />
          <label 
            htmlFor="header-upload"
            className="relative rounded-2xl overflow-hidden h-32 md:h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center cursor-pointer hover:from-primary/30 hover:to-accent/30 transition-colors group block"
          >
            <div className="text-center">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50 group-hover:opacity-70 transition-opacity" />
              <p className="font-semibold">Add Header Images</p>
              <p className="text-sm text-muted-foreground">Click to upload (up to 5)</p>
            </div>
          </label>
        </>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/settings")} className="flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
            <Users className="w-6 h-6 text-primary flex-shrink-0" />
            <span>Family Profile</span>
          </h1>
          <p className="text-muted-foreground text-sm">Manage your family members</p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-primary text-white border-0 flex-shrink-0 whitespace-nowrap">
              <Plus className="h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Family Member</DialogTitle>
              <DialogDescription>Send an invitation to join your family on the Family Plan</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Invite Method</Label>
                <Select value={inviteMethod} onValueChange={(value: "email" | "phone") => setInviteMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                    </SelectItem>
                    <SelectItem value="phone">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {inviteMethod === "email" ? (
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="family@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+1 234 567 8900" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} />
                </div>
              )}

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="grandparent">Grandparent</SelectItem>
                    <SelectItem value="caretaker">Caretaker</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleInviteMember} disabled={sending} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Family Members */}
      {!familyId ? (
        <Card className="shadow-custom-md">
          <CardContent className="p-8 text-center">
            <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium text-lg mb-2">No Family Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your family to start inviting members.
            </p>
            <Dialog open={isCreateFamilyOpen} onOpenChange={setIsCreateFamilyOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-white border-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Family
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Your Family</DialogTitle>
                  <DialogDescription>Choose a name for your family</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="family-name">Family Name</Label>
                    <Input 
                      id="family-name" 
                      placeholder="e.g., The Johnsons" 
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleCreateFamily()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateFamilyOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateFamily} className="gradient-primary text-white border-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle>Family Members</CardTitle>
          <CardDescription>Active members of your family</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading family members...</div>
          ) : familyMembers.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No family members yet</p>
              <p className="text-sm text-muted-foreground">Invite your first family member to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {familyMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{member.full_name || "No name"}</p>
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
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>Invitations waiting to be accepted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">Pending</Badge>
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
                      <p className="text-xs text-muted-foreground">Expires: {new Date(invitation.expires_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleCancelInvitation(invitation.id)}>
                    Cancel
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
