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
import * as chrono from "chrono-node";
import { cloudSet } from "@/lib/preferencesSync";
import { useTranslation } from "react-i18next";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function calendarItems(): any[] {
  try { return JSON.parse(localStorage.getItem("eazy-family-calendar-items") || "[]"); }
  catch { return []; }
}

function saveCalendarItems(items: any[]) {
  cloudSet("eazy-family-calendar-items", JSON.stringify(items));
}

function formatConfirmDate(date: Date, certainHour: boolean): string {
  const dateLabel = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  if (!certainHour) return dateLabel;
  const timeLabel = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} at ${timeLabel}`;
}

function fuzzyMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const na = norm(a), nb = norm(b);
  return na.includes(nb) || nb.includes(na);
}

// ── Component ──────────────────────────────────────────────────────────────

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
  const { i18n } = useTranslation();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── Voice input ───────────────────────────────────────────────────────────
  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: "Not supported", description: "Voice input is not supported in this browser.", variant: "destructive" });
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = i18n.language === "de" ? "de-DE"
      : i18n.language === "fr" ? "fr-FR"
      : i18n.language === "it" ? "it-IT"
      : i18n.language === "en-GB" ? "en-GB"
      : "en-US";
    recognition.onresult = (e: any) => { setInput(prev => prev + (prev ? " " : "") + e.results[0][0].transcript); setIsListening(false); };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };
  const stopListening = () => { recognitionRef.current?.stop(); setIsListening(false); };

  // ── Shopping: add ─────────────────────────────────────────────────────────
  const handleShoppingAdd = async (content: string): Promise<boolean> => {
    const patterns = [
      // English
      /add (.+) to (?:the |my |our )?shopping list/i,
      /put (.+) on (?:the |my |our )?shopping list/i,
      /shopping list:?\s*(.+)/i,
      // German
      /(?:füge?|leg|steck)\s+(.+?)\s+(?:zur|in die|auf die)\s+(?:einkaufsliste|liste)/i,
      /(?:füge?|leg)\s+(.+?)\s+(?:auf die\s+)?einkaufsliste/i,
      // French
      /(?:ajoute?|mets|rajoute?)\s+(.+?)\s+(?:à la liste de courses|sur la liste d'achats|dans la liste)/i,
      /liste (?:de courses|d'achats):?\s*(.+)/i,
      // Italian
      /(?:aggiungi|metti)\s+(.+?)\s+(?:alla lista della spesa|alla lista)/i,
      /lista della spesa:?\s*(.+)/i,
    ];
    for (const p of patterns) {
      const match = content.match(p);
      if (match && user?.id) {
        const items = match[1].split(/,|and/).map(i => i.trim()).filter(Boolean);
        for (const item of items) await supabase.from("tasks").insert({ title: item, type: "shopping", user_id: user.id });
        return true;
      }
    }
    return false;
  };

  // ── Shopping: view ────────────────────────────────────────────────────────
  const handleShoppingView = async (content: string): Promise<string | null> => {
    const isQuery = /(?:what(?:'s| is) on|show|read|list|check|see)\s+(?:my |our |the )?shopping list/i.test(content)
      || /shopping list\??$/i.test(content)
      || /(?:was steht|zeig|zeige)\s+(?:auf der |die )?einkaufsliste/i.test(content)
      || /(?:montre|affiche|liste)\s+(?:ma |la )?liste (?:de courses|d'achats)/i.test(content)
      || /(?:mostra|visualizza)\s+(?:la )?lista della spesa/i.test(content);
    if (!isQuery || !user?.id) return null;
    const { data } = await supabase.from("tasks").select("title").eq("type", "shopping").eq("user_id", user.id).eq("completed", false).order("created_at", { ascending: false });
    if (!data || data.length === 0) return "Your shopping list is empty. Try adding something: \"Add milk to the shopping list\"";
    const list = data.map(t => `• ${t.title}`).join("\n");
    return `Here's what's on your shopping list:\n\n${list}`;
  };

  // ── Calendar: add (with recurring support) ───────────────────────────────
  const handleCalendarAdd = (content: string): string | null => {
    const intentPatterns = [
      // English
      /(?:add|schedule|create|put|set up)\s+(.+?)\s+(?:to|on|in|for)\s+(?:the\s+)?(?:family\s+)?calendar/i,
      /(?:add|schedule|create|put|set up)\s+(.+?)\s+(?:on|for|at)\s+(.+)/i,
      /calendar[:\s]+(.+)/i,
      // German
      /(?:füge?|erstelle?|plan|trag ein)\s+(.+?)\s+(?:zum|in den|im|für den)\s+kalender/i,
      /(?:füge?|erstelle?|plan)\s+(.+?)\s+(?:am|um|für)\s+(.+)/i,
      // French
      /(?:ajoute?|crée?|planifie?|mets)\s+(.+?)\s+(?:au|dans le)\s+calendrier/i,
      /(?:ajoute?|crée?|planifie?)\s+(.+?)\s+(?:le|à)\s+(.+)/i,
      // Italian
      /(?:aggiungi|crea|pianifica|metti)\s+(.+?)\s+(?:al|nel)\s+calendario/i,
      /(?:aggiungi|crea|pianifica)\s+(.+?)\s+(?:il|a|per)\s+(.+)/i,
    ];

    // Skip if it's a delete/cancel intent (all languages)
    if (/^(?:cancel|remove|delete|storniere?|lösche?|annule?|supprime?)\b/i.test(content.trim())) return null;

    let rawTitle: string | null = null;
    for (const p of intentPatterns) {
      const match = content.match(p);
      if (match) { rawTitle = match[1].trim(); break; }
    }
    if (!rawTitle) return null;

    // Detect recurring pattern
    const recurMatch = content.match(/every\s+(day|daily|monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|weekday)/i);
    const repeat = recurMatch
      ? (/(day|daily|week|weekday)/.test(recurMatch[1]) ? "daily" : "weekly")
      : "never";

    const parsed = chrono.parse(content, new Date(), { forwardDate: true });
    if (!parsed.length) {
      return "I couldn't work out the date for that event. Try: \"Add dentist appointment Monday 5 May at 3pm\" or \"Swimming lessons every Tuesday at 4pm\"";
    }

    const result = parsed[0];
    const startDate = result.start.date();
    const endDate = result.end ? result.end.date() : new Date(startDate.getTime() + 60 * 60 * 1000);
    const cleanTitle = rawTitle.replace(result.text, "").replace(/\s+(on|at|for|the|every)\s*\w*\s*$/i, "").trim() || rawTitle;
    const title = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    const confirmDate = formatConfirmDate(startDate, result.start.isCertain("hour"));
    const repeatLabel = repeat === "weekly" ? ", repeating weekly" : repeat === "daily" ? ", repeating daily" : "";

    try {
      const existing = calendarItems();
      const newEvent = {
        id: Date.now().toString(),
        title,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        allDay: !result.start.isCertain("hour"),
        type: "event",
        color: "hsl(220 70% 50%)",
        repeat,
      };
      saveCalendarItems([...existing, newEvent]);
      return `Done! I've added **${title}** to your calendar for **${confirmDate}**${repeatLabel}. ✅`;
    } catch {
      return "Something went wrong saving the event. Please try adding it manually in the Calendar tab.";
    }
  };

  // ── Calendar: remove ─────────────────────────────────────────────────────
  const handleCalendarRemove = (content: string): string | null => {
    if (!/^(?:cancel|remove|delete)\b/i.test(content.trim())) return null;

    const stripped = content.replace(/^(?:cancel|remove|delete)\s+/i, "").trim();
    const parsed = chrono.parse(stripped, new Date(), { forwardDate: true });
    const dateText = parsed[0]?.text ?? "";
    const titleHint = stripped.replace(dateText, "").replace(/\s+(on|at|for|the)\s*$/i, "").trim();

    const existing = calendarItems();
    if (existing.length === 0) return "You don't have any upcoming events to remove.";

    const matchDate = parsed[0]?.start.date();
    const matches = existing.filter((e: any) => {
      const titleOk = titleHint ? fuzzyMatch(e.title, titleHint) : true;
      const dateOk = matchDate
        ? Math.abs(new Date(e.startDate).getTime() - matchDate.getTime()) < 24 * 60 * 60 * 1000
        : true;
      return titleOk && dateOk;
    });

    if (matches.length === 0) return `I couldn't find an event matching "${titleHint || stripped}". Check the Calendar tab for exact names.`;
    if (matches.length > 1 && !matchDate && !titleHint) return `Found ${matches.length} events. Please be more specific — add a date or the event name.`;

    const removed = matches[0];
    saveCalendarItems(existing.filter((e: any) => e.id !== removed.id));
    const when = formatConfirmDate(new Date(removed.startDate), true);
    return `Done! I've removed **${removed.title}** (${when}) from your calendar. 🗑️`;
  };

  // ── Local fallback for LLM unavailability ─────────────────────────────────
  const getLocalResponse = (msg: string, isShoppingAdd: boolean): string | null => {
    const m = msg.toLowerCase();
    if (isShoppingAdd) return "Done! I've added those items to your shopping list. 🛒";
    if (/\b(hi|hello|hey)\b/.test(m)) return "Hi there! I'm Eazy Assistant. I can help with your shopping list, calendar events, and general questions. How can I help?";
    if (/calendar|event|schedule/.test(m) && /\b(see|show|view|check)\b/.test(m)) return "Go to the Calendar tab to see all your family's upcoming events and appointments.";
    if (/\b(recipe|cook|dinner|meal|food)\b/.test(m)) return "For quick family meals, try sheet-pan recipes — one pan, 30 minutes. Chicken thighs with veggies is always a crowd-pleaser. Need something specific?";
    if (/\b(activity|activities|rainy|kids|children)\b/.test(m)) return "Great indoor activities: board games, baking together, movie marathon with homemade popcorn, or a living-room fort! Want more ideas?";
    if (/\b(restaurant|eat out|dining)\b/.test(m)) return "Check the Events page — it has local family-friendly spots. You can also search Google Maps for 'family restaurants near me'.";
    if (/\b(add|remind|reminder)\b/.test(m)) return "To add a task or reminder, go to the To-Do List and tap the + button. For calendar events, use the Calendar tab.";
    return null;
  };

  // ── Main send handler ────────────────────────────────────────────────────
  const streamChat = async (userMessage: string) => {
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    // Local actions — resolve without calling the LLM
    const calendarRemoveReply = handleCalendarRemove(userMessage);
    if (calendarRemoveReply) {
      setMessages(prev => [...prev, { role: "assistant", content: calendarRemoveReply }]);
      setIsLoading(false);
      return;
    }

    const calendarAddReply = handleCalendarAdd(userMessage);
    if (calendarAddReply) {
      setMessages(prev => [...prev, { role: "assistant", content: calendarAddReply }]);
      setIsLoading(false);
      return;
    }

    const shoppingViewReply = await handleShoppingView(userMessage);
    if (shoppingViewReply) {
      setMessages(prev => [...prev, { role: "assistant", content: shoppingViewReply }]);
      setIsLoading(false);
      return;
    }

    const isShoppingAdd = await handleShoppingAdd(userMessage);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eazy-chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            messages: newMessages,
            context: isShoppingAdd ? "User added items to shopping list. Confirm the action." : undefined,
          }),
        }
      );

      if (!response.ok || !response.body) {
        const localReply = getLocalResponse(userMessage, isShoppingAdd);
        if (localReply) { setMessages(prev => [...prev, { role: "assistant", content: localReply }]); return; }
        if (response.status === 429) toast({ title: "Rate limit exceeded", description: "Please try again in a moment.", variant: "destructive" });
        else if (response.status === 401) toast({ title: "Authentication error", description: "Please sign in and try again.", variant: "destructive" });
        else toast({ title: "Assistant unavailable", description: "The AI assistant is temporarily unavailable.", variant: "destructive" });
        return;
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
          if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
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
      const localReply = getLocalResponse(userMessage, isShoppingAdd);
      if (localReply) setMessages(prev => [...prev, { role: "assistant", content: localReply }]);
      else toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    setInput("");
    streamChat(msg);
  };

  const suggestions = i18n.language === "de" ? [
    "Milch und Eier zur Einkaufsliste hinzufügen",
    "Zahnarzt Montag 5. Mai um 15:00 Uhr einplanen",
    "Schwimmunterricht jeden Dienstag um 16:00 Uhr",
    "Was steht auf der Einkaufsliste?",
    "Einkaufsliste: Brot, Butter, Äpfel",
    "Schnelles Abendessen mit 5 Zutaten",
  ] : i18n.language === "fr" ? [
    "Ajouter lait et œufs à la liste de courses",
    "Dentiste lundi 5 mai à 15h",
    "Cours de natation chaque mardi à 16h",
    "Qu'est-ce qui est sur la liste de courses?",
    "Liste de courses: pain, beurre, pommes",
    "Recette dîner rapide avec 5 ingrédients",
  ] : i18n.language === "it" ? [
    "Aggiungi latte e uova alla lista della spesa",
    "Dentista lunedì 5 maggio alle 15:00",
    "Nuoto ogni martedì alle 16:00",
    "Cosa c'è nella lista della spesa?",
    "Lista della spesa: pane, burro, mele",
    "Ricetta cena veloce con 5 ingredienti",
  ] : [
    "Add milk and eggs to our shopping list",
    "Schedule dentist Monday 5 May at 3pm",
    "Swimming lessons every Tuesday at 4pm",
    "What's on our shopping list?",
    "Add this event to my calendar",
    "Quick dinner recipe with 5 ingredients",
  ];

  // ── Collapsed state ───────────────────────────────────────────────────────
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
                {suggestions.map((text) => (
                  <span key={text} className="block">{text}</span>
                ))}
              </TextLoop>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // ── Open state ────────────────────────────────────────────────────────────
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

      <ScrollArea className="h-[180px] sm:h-[300px] p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-4 text-sm">
                {i18n.language === "de" ? "Wie kann ich helfen?" : i18n.language === "fr" ? "Comment puis-je vous aider?" : i18n.language === "it" ? "Come posso aiutarti?" : "Ask me anything"}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-accent transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
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
