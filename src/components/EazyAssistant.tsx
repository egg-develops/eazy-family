import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { TextLoop } from "@/components/ui/text-loop";
import { error as logError } from "@/lib/logger";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const EazyAssistant = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Web Speech API setup
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Not supported", description: "Voice input is not supported in this browser.", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // Check if message is a shopping list action
  const handleShoppingListAction = async (content: string): Promise<boolean> => {
    const addPatterns = [
      /add (.+) to (?:the |my |our )?shopping list/i,
      /put (.+) on (?:the |my |our )?shopping list/i,
      /shopping list:?\s*(.+)/i,
    ];

    for (const pattern of addPatterns) {
      const match = content.match(pattern);
      if (match && user?.id) {
        const items = match[1].split(/,|and/).map(i => i.trim()).filter(Boolean);
        for (const item of items) {
          await supabase.from('tasks').insert({
            title: item,
            type: 'shopping',
            user_id: user.id,
          });
        }
        return true;
      }
    }
    return false;
  };

  const streamChat = async (userMessage: string) => {
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    // Check for shopping list actions
    const isShoppingAction = await handleShoppingListAction(userMessage);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eazy-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messages: newMessages,
            context: isShoppingAction ? "User added items to shopping list. Confirm the action." : undefined,
          }),
        }
      );

      if (!response.ok || !response.body) {
        if (response.status === 429) {
          toast({ title: "Rate limit exceeded", description: "Please try again in a moment.", variant: "destructive" });
        } else if (response.status === 401) {
          toast({ title: "Authentication error", description: "Please sign in and try again.", variant: "destructive" });
        } else {
          let errorMsg = "The AI assistant is currently unavailable.";
          try {
            const errJson = await response.json();
            if (errJson.error?.includes('ANTHROPIC_API_KEY')) errorMsg = "AI key not configured. Please contact support.";
          } catch { /* ignore */ }
          toast({ title: "Assistant unavailable", description: errorMsg, variant: "destructive" });
        }
        throw new Error("Failed to start stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      logError("Chat error:", error);
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    streamChat(userMessage);
  };

  if (!isOpen) {
    return (
      <Card
        className="p-6 shadow-custom-lg cursor-pointer hover:shadow-custom-xl transition-shadow bg-primary relative overflow-hidden"
        onClick={() => setIsOpen(true)}
        role="button"
        aria-label="Open Eazy Assistant"
      >
        <div className="flex items-center justify-between text-primary-foreground">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-xl font-bold">Eazy Assistant</h3>
            </div>
            <div className="text-primary-foreground/90 text-sm min-h-[40px] pt-3">
              <TextLoop interval={3}>
                {[
                  "Add milk and eggs to our shopping list",
                  "Best family friendly restaurants nearby?",
                  "Rainy day activities with two children",
                  "Quick dinner recipe with 5 ingredients",
                  "Add an event to our family calendar",
                ].map((text) => (
                  <span key={text} className="block">{text}</span>
                ))}
              </TextLoop>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-custom-lg overflow-hidden">
      <div className="bg-primary p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary-foreground">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold">Eazy Assistant</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="text-primary-foreground hover:bg-primary-foreground/20"
          aria-label="Close assistant"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="h-[300px] p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Ask me anything! Try "Add milk to shopping list" 🛒</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Button
            onClick={isListening ? stopListening : startListening}
            size="icon"
            variant={isListening ? "destructive" : "outline"}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder={isListening ? "Listening..." : "How can I help you?"}
            disabled={isLoading}
            className="flex-1 bg-background"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
