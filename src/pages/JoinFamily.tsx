import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const JoinFamily = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinFamily = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to join a family",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!inviteCode.trim()) {
      toast({
        title: "Enter invite code",
        description: "Please enter a valid invite code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('join_family_with_code', {
        _invite_code: inviteCode.trim().toUpperCase(),
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

      toast({
        title: "Welcome to the family! 🎉",
        description: `You've joined ${result.family_name}`,
      });

      navigate("/app/family");
    } catch (error) {
      console.error("Error joining family:", error);
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
          <div className="w-20 h-20 mx-auto gradient-primary rounded-3xl flex items-center justify-center shadow-custom-lg mb-4">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Join a Family</h1>
          <p className="text-muted-foreground mt-2">
            Enter the invite code shared with you
          </p>
        </div>

        {/* Join Card */}
        <Card className="shadow-custom-lg">
          <CardHeader>
            <CardTitle>Family Invite Code</CardTitle>
            <CardDescription>
              Ask your family member for the 6-character code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
