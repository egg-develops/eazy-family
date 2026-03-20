import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MessagingConversationList from "@/components/MessagingConversationList";
import MessagingChatThread from "@/components/MessagingChatThread";
import MessagingMessageInput from "@/components/MessagingMessageInput";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { MessageCircle, Search, Lock, Users } from "lucide-react";

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isCurrentUser: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline?: boolean;
  isVerified?: boolean;
  isFamily?: boolean;
}

const Messaging = () => {
  const { t } = useTranslation();
  const { user, isPremium } = useAuth();
  const { toast } = useToast();
  
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchExternal, setSearchExternal] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // Load family members as conversations
  useEffect(() => {
    if (user?.id) loadFamilyConversations();
  }, [user?.id]);

  const loadFamilyConversations = async () => {
    try {
      // Get user's families
      const { data: memberships } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user!.id)
        .eq('is_active', true);

      if (!memberships?.length) return;

      const familyIds = memberships.map(m => m.family_id);
      
      // Get other family members
      const { data: familyMembers } = await supabase
        .from('family_members')
        .select('user_id, display_name, full_name')
        .in('family_id', familyIds)
        .neq('user_id', user!.id)
        .eq('is_active', true);

      if (familyMembers) {
        const convs: Conversation[] = familyMembers.map((member, i) => ({
          id: member.user_id || `family-${i}`,
          userId: member.user_id || '',
          userName: member.display_name || member.full_name || 'Family Member',
          lastMessage: 'Start chatting!',
          lastMessageTime: new Date(),
          unreadCount: 0,
          isOnline: false,
          isFamily: true,
        }));
        setConversations(convs);
      }
    } catch (error) {
      // Silently handle - user may not have a family yet
    }
  };

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content,
      timestamp: new Date(),
      isCurrentUser: true,
      status: 'sent',
    };
    
    setMessages([...messages, newMessage]);
    toast({
      title: "Message sent",
      description: "Your message has been delivered.",
    });
  };

  const handleConversationClick = (conversationId: string) => {
    setSelectedConversation(conversationId);
    // Load mock messages for now
    setMessages([
      {
        id: "msg-1",
        content: "Hi! How are you doing?",
        timestamp: new Date(Date.now() - 300000),
        isCurrentUser: false,
        status: 'read',
      },
      {
        id: "msg-2",
        content: "I'm doing great! How about you?",
        timestamp: new Date(Date.now() - 240000),
        isCurrentUser: true,
        status: 'read',
      },
    ]);
  };

  const currentConversation = conversations.find(
    (conv) => conv.id === selectedConversation
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold">Messages</h1>
        </div>
        {!isPremium && (
          <Badge variant="outline" className="text-xs gap-1 whitespace-nowrap">
            <Lock className="w-3 h-3" />
            Family Only
          </Badge>
        )}
      </div>

      {/* External User Search - Premium Only */}
      {isPremium ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search external users..."
            value={searchExternal}
            onChange={(e) => setSearchExternal(e.target.value)}
            className="pl-10"
          />
        </div>
      ) : (
        <UpgradeDialog>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-3 flex items-center gap-3">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Upgrade to search and message external users
              </span>
            </CardContent>
          </Card>
        </UpgradeDialog>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-280px)] md:h-[calc(100vh-200px)]">
        {/* Conversation List - Hidden on mobile when conversation selected */}
        <div className={`${selectedConversation ? 'hidden md:block' : 'block'} md:col-span-1`}>
          {conversations.length > 0 ? (
            <MessagingConversationList
              conversations={conversations}
              onConversationClick={handleConversationClick}
              onStartNewConversation={() =>
                toast({ title: "Start new conversation", description: "Feature coming soon" })
              }
            />
          ) : (
            <Card>
              <CardContent className="p-4 sm:p-6 text-center">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Join a family to start messaging family members
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chat Thread - Full width on mobile when selected, 2/3 on desktop */}
        {selectedConversation && currentConversation ? (
          <div className={`${selectedConversation ? 'block' : 'hidden'} md:block md:col-span-2 flex flex-col gap-3 sm:gap-4`}>
            <div className="flex items-center gap-2 md:hidden pb-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedConversation(null)}
                className="p-1"
              >
                ← Back
              </Button>
            </div>
            <MessagingChatThread
              userName={currentConversation.userName}
              userAvatar={currentConversation.userAvatar}
              isOnline={currentConversation.isOnline}
              messages={messages}
              onCallClick={() =>
                toast({ title: "Call feature", description: "Coming soon" })
              }
              onVideoCallClick={() =>
                toast({ title: "Video call feature", description: "Coming soon" })
              }
              onInfoClick={() =>
                toast({ title: "User info", description: currentConversation.userName })
              }
            />
            <MessagingMessageInput
              onSendMessage={handleSendMessage}
              placeholder="Type a message..."
            />
          </div>
        ) : (
          <div className="hidden md:flex md:col-span-2 items-center justify-center">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-3" />
                <p className="text-xs sm:text-sm text-muted-foreground text-center">
                  Select a conversation to start messaging
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
