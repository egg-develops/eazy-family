import { useState } from "react";
import { Search, Plus, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface Props {
  conversations: Conversation[];
  onConversationClick: (id: string) => void;
  onStartNewConversation: () => void;
}

const MessagingConversationList = ({ conversations, onConversationClick, onStartNewConversation }: Props) => {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter(c =>
    c.userName.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="shadow-custom-md h-full" role="navigation" aria-label="Conversations">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Messages</CardTitle>
          <Button size="icon" variant="ghost" onClick={onStartNewConversation} aria-label="New conversation">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search conversations"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No conversations found
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onConversationClick(conv.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left border-b border-border/50"
                aria-label={`Chat with ${conv.userName}${conv.unreadCount > 0 ? `, ${conv.unreadCount} unread` : ""}`}
              >
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {conv.userName.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  {conv.isOnline && (
                    <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 fill-green-500 text-green-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{conv.userName}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(conv.lastMessageTime)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                </div>
                {conv.unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 min-w-[20px] h-5 flex items-center justify-center">
                    {conv.unreadCount}
                  </Badge>
                )}
              </button>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MessagingConversationList;
