import { useState } from "react";
import { Send, Paperclip, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  onSendMessage: (content: string, attachments?: any[]) => void;
  placeholder?: string;
}

const MessagingMessageInput = ({ onSendMessage, placeholder = "Type a message..." }: Props) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage(message.trim());
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="shadow-custom-md">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="flex-shrink-0" aria-label="Attach file">
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1"
            aria-label="Message input"
          />
          <Button size="icon" variant="ghost" className="flex-shrink-0" aria-label="Emoji">
            <Smile className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim()}
            className="bg-primary text-primary-foreground flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MessagingMessageInput;
