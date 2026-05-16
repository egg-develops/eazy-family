import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { error as logError } from "@/lib/logger";

const JoinFamily = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const autoJoinAttempted = useRef(false);

  useEffect(() => {
    document.title = "Join Your Eazy Family";
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      const normalized = codeFromUrl.toUpperCase().slice(0, 6);
      setInviteCode(normalized);
      // Stash so Auth page can redirect back after sign-up/in
      localStorage.setItem('pending-invite-code', normalized);
    }
  }, [searchParams]);

  // If user just signed in (or was already signed in) and a code is in the URL, auto-join
  useEffect(() => {
    if (authLoading || autoJoinAttempted.current) return;
    const codeFromUrl = searchParams.get('code');
    if (user && codeFromUrl) {
      autoJoinAttempted.current = true;
      handleJoinFamily(codeFromUrl.toUpperCase().slice(0, 6));
      return;
    }
    // Not logged in and code present — send to auth
    if (!user && !authLoading && codeFromUrl) {
      navigate('/auth?signup=true');
    }
  }, [user, authLoading]);

  const handleJoinFamily = async (overrideCode?: string) => {
    if (!user) {
      navigate('/auth?signup=true');
      return;
    }

    // Validate invite code format
    const trimmedCode = (overrideCode ?? inviteCode).trim().toUpperCase();
    if (!trimmedCode) {
      toast({
        title: "Enter invite code",
        description: "Please enter a valid invite code",
        variant: "destructive",
      });
      return;
    }

    if (trimmedCode.length !== 6) {
      toast({
        title: "Invalid code length",
        description: "Invite codes must be exactly 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (!/^[A-Z0-9]{6}$/.test(trimmedCode)) {
      toast({
        title: "Invalid code format",
        description: "Invite codes can only contain letters and numbers",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('join_family_with_code', {
        _invite_code: trimmedCode,
        _user_id: user.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; family_name?: string };

      if (!result.success) {
        toast({
          title: "Unable to join",
          description: result.error || "Invalid invite code",
          variant: "destructive",
        });
        return;
      }

      localStorage.removeItem('pending-invite-code');
      toast({
        title: "Welcome to the family! 🎉",
        description: `You've joined ${result.family_name}`,
      });

      navigate("/app/family");
    } catch (error) {
      logError("Error joining family:", error);
      toast({
        title: "Error",
        description: "Failed to join family. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img src="/logo.png" alt="Eazy.Family" className="w-20 h-20 mx-auto object-contain mb-4" />
          <h1 className="text-3xl font-bold">Join Your Eazy Family</h1>
          <p className="text-muted-foreground mt-2">
            Enter the invite code shared with you
          </p>
        </div>

        {/* Join Card */}
        <Card className="shadow-custom-lg">
          <CardContent className="space-y-4">
            {searchParams.get('code') && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                <p className="text-sm text-primary font-medium">Your invite code has been pre-filled ✓</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                placeholder="ABC123"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-2xl font-mono tracking-wider"
                disabled={isLoading}
              />
            </div>

            <Button
              onClick={handleJoinFamily}
              disabled={isLoading || !inviteCode.trim()}
              className="w-full gradient-primary text-white border-0"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join Family
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => navigate("/app")}
                className="text-sm text-muted-foreground"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Don't have an invite code?{" "}
              <button
                onClick={() => navigate("/app/family")}
                className="text-primary hover:underline font-medium"
              >
                Create your own family
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinFamily;
