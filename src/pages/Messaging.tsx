import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { MessageCircle, Search, Lock, Users, Send, ArrowLeft } from "lucide-react";
import { error as logError } from "@/lib/logger";
import { haptic } from "@/lib/haptic";

interface FamilyMember {
  user_id: string;
  name: string;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

const Messaging = () => {
  const { user, isPremium } = useAuth();
  const { toast } = useToast();

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) loadFamilyMembers();
  }, [user?.id]);

  useEffect(() => {
    if (selectedMember) {
      loadMessages(selectedMember.user_id);
      // Subscribe to realtime messages
      const channel = supabase
        .channel(`dm-${user!.id}-${selectedMember.user_id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${user!.id}`,
        }, (payload) => {
          const msg = payload.new as DirectMessage;
          if (msg.sender_id === selectedMember.user_id) {
            setMessages(prev => [...prev, msg]);
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedMember?.user_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadFamilyMembers = async () => {
    try {
      const { data: memberships } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user!.id)
        .eq('is_active', true);

      if (!memberships?.length) return;
      const familyIds = memberships.map(m => m.family_id);

      const { data: members } = await supabase
        .from('family_members')
        .select('user_id, display_name, full_name')
        .in('family_id', familyIds)
        .neq('user_id', user!.id)
        .eq('is_active', true);

      if (members) {
        const unique = new Map<string, FamilyMember>();
        members.forEach(m => {
          if (m.user_id && !unique.has(m.user_id)) {
            unique.set(m.user_id, {
              user_id: m.user_id,
              name: m.display_name || m.full_name || 'Family Member',
            });
          }
        });
        setFamilyMembers([...unique.values()]);
      }
    } catch (err) {
      logError("Error loading family members:", err);
    }
  };

  const loadMessages = async (otherUserId: string) => {
    try {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user!.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user!.id})`)
        .order('created_at', { ascending: true })
        .limit(100);

      setMessages(data || []);
    } catch (err) {
      logError("Error loading messages:", err);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedMember || !user?.id) return;
    haptic('light');
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({ sender_id: user.id, recipient_id: selectedMember.user_id, content })
        .select()
        .single();

      if (error) throw error;
      if (data) { haptic('success'); setMessages(prev => [...prev, data]); }
    } catch (err) {
      logError("Error sending message:", err);
      toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
      setNewMessage(content); // restore
    } finally {
      setSending(false);
    }
  };

  const filteredMembers = familyMembers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
          <h1 className="text-lg sm:text-2xl font-bold">Messages</h1>
        </div>
        {!isPremium && (
          <Badge variant="outline" className="text-xs gap-1">
            <Lock className="w-3 h-3" />
            Family Only
          </Badge>
        )}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>

        {/* Conversation list */}
        <div className={`${selectedMember ? 'hidden md:flex' : 'flex'} flex-col gap-2 md:col-span-1`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search family..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {filteredMembers.length > 0 ? (
              filteredMembers.map(member => (
                <button
                  key={member.user_id}
                  onClick={() => setSelectedMember(member)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${selectedMember?.user_id === member.user_id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'}`}
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground">Family member</p>
                  </div>
                </button>
              ))
            ) : familyMembers.length === 0 ? (
              <Card className="flex-1">
                <CardContent className="p-6 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Join a family to start messaging</p>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No results</p>
            )}
          </div>
        </div>

        {/* Chat thread */}
        {selectedMember ? (
          <div className="flex flex-col md:col-span-2 min-h-0 h-full">
            {/* Chat header */}
            <div className="flex items-center gap-3 pb-3 border-b flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedMember(null)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                  {getInitials(selectedMember.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{selectedMember.name}</p>
                <p className="text-xs text-muted-foreground">Family member</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No messages yet. Say hi!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isOwn = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isOwn && (
                        <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                          <AvatarFallback className="text-xs bg-primary/10">{getInitials(selectedMember.name)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[75%] flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                          {msg.content}
                        </div>
                        <span className="text-xs text-muted-foreground px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 pt-3 border-t flex-shrink-0">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                maxLength={2000}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={sending || !newMessage.trim()}
                size="icon"
                className="gradient-primary text-white border-0 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex md:col-span-2 items-center justify-center">
            <Card className="w-full">
              <CardContent className="flex flex-col items-center justify-center p-12">
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-6" />
                <p className="text-sm text-muted-foreground text-center">
                  Select a family member to start a conversation
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messaging;
