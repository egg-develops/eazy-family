import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import MessagingConversationList from "@/components/MessagingConversationList";
import MessagingChatThread from "@/components/MessagingChatThread";
import MessagingMessageInput from "@/components/MessagingMessageInput";
import { Card, CardContent } from "@/components/ui/card";

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
}

const Messaging = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "1",
      userId: "user-1",
      userName: "Sarah Johnson",
      lastMessage: "Sounds great! See you tomorrow.",
      lastMessageTime: new Date(Date.now() - 3600000),
      unreadCount: 0,
      isOnline: true,
      isVerified: true,
    },
    {
      id: "2",
      userId: "user-2",
      userName: "Mike Wilson",
      lastMessage: "Got the details, thanks!",
      lastMessageTime: new Date(Date.now() - 7200000),
      unreadCount: 2,
      isOnline: false,
    },
  ]);

  const [messages, setMessages] = useState<Message[]>([
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
    {
      id: "msg-3",
      content: "Same here! Want to grab coffee tomorrow?",
      timestamp: new Date(Date.now() - 180000),
      isCurrentUser: false,
      status: 'read',
    },
  ]);

  const handleSendMessage = (content: string, attachments?: any[]) => {
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
  };

  const handleStartNewConversation = () => {
    toast({
      title: "Start new conversation",
      description: "Feature coming soon",
    });
  };

  const currentConversation = conversations.find(
    (conv) => conv.id === selectedConversation
  );

  return (
    <div className="flex gap-4 h-full">
      {/* Conversation List */}
      <div className="w-full md:w-1/3">
        <MessagingConversationList
          conversations={conversations}
          onConversationClick={handleConversationClick}
          onStartNewConversation={handleStartNewConversation}
        />
      </div>

      {/* Chat Thread */}
      {selectedConversation && currentConversation ? (
        <div className="w-full md:w-2/3 flex flex-col gap-4">
          <MessagingChatThread
            userName={currentConversation.userName}
            userAvatar={currentConversation.userAvatar}
            isOnline={currentConversation.isOnline}
            messages={messages}
            onCallClick={() =>
              toast({
                title: "Call feature",
                description: "Coming soon in Phase 2",
              })
            }
            onVideoCallClick={() =>
              toast({
                title: "Video call feature",
                description: "Coming soon in Phase 2",
              })
            }
            onInfoClick={() =>
              toast({
                title: "User info",
                description: currentConversation.userName,
              })
            }
          />

          <MessagingMessageInput
            onSendMessage={handleSendMessage}
            placeholder="Type a message..."
          />
        </div>
      ) : (
        <div className="w-full md:w-2/3 flex items-center justify-center">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">
                Select a conversation to start messaging
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Messaging;
