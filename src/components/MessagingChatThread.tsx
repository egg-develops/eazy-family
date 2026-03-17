import { useRef, useEffect } from "react";
import { Phone, Video, Info, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isCurrentUser: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

interface Props {
  userName: string;
  userAvatar?: string;
  isOnline?: boolean;
  messages: Message[];
  onCallClick: () => void;
  onVideoCallClick: () => void;
  onInfoClick: () => void;
}

const MessagingChatThread = ({ userName, userAvatar, isOnline, messages, onCallClick, onVideoCallClick, onInfoClick }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const initials = userName.split(" ").map(n => n[0]).join("");

  return (
    <Card className="shadow-custom-md flex-1" role="log" aria-label={`Chat with ${userName}`}>
      {/* Header */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {isOnline && (
                <Circle className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 fill-green-500 text-green-500" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{userName}</h3>
              <p className="text-xs text-muted-foreground">{isOnline ? "Online" : "Offline"}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={onCallClick} aria-label="Voice call">
              <Phone className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onVideoCallClick} aria-label="Video call">
              <Video className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onInfoClick} aria-label="User info">
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="p-0">
        <ScrollArea className="h-[350px] p-4" ref={scrollRef}>
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    msg.isCurrentUser
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {formatTime(msg.timestamp)}
                    {msg.isCurrentUser && msg.status && (
                      <span className="ml-1">
                        {msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓✓" : "✓"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MessagingChatThread;
