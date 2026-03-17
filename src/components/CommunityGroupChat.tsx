import { useState } from "react";
import { Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  isCurrentUser: boolean;
}

interface Props {
  groupName: string;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
}

const CommunityGroupChat = ({ groupName, messages, onSendMessage }: Props) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
  };

  return (
    <Card className="shadow-custom-md" role="log" aria-label={`${groupName} chat`}>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg">{groupName}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] p-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isCurrentUser ? "justify-end" : "justify-start"}`}>
                <div className="flex items-start gap-2 max-w-[75%]">
                  {!msg.isCurrentUser && (
                    <Avatar className="w-7 h-7 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{msg.author[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`rounded-2xl px-3 py-2 ${msg.isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {!msg.isCurrentUser && <p className="text-xs font-medium mb-0.5">{msg.author}</p>}
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="border-t p-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            aria-label="Group message input"
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim()} aria-label="Send">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommunityGroupChat;
