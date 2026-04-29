import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { error as logError } from "@/lib/logger";

interface VoiceShoppingAssistantProps {
  onItemsAdded: (items: string[]) => void;
  listenerDescription?: string;
}

export const VoiceShoppingAssistant = ({ onItemsAdded, listenerDescription = "Speak your shopping items" }: VoiceShoppingAssistantProps) => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Not supported",
        description: "Voice input is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      await processTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      logError('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        // Silently ignore — user just didn't say anything
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access in your browser settings and try again.",
          variant: "destructive",
        });
        return;
      }
      if (event.error === 'audio-capture') {
        toast({
          title: "No microphone found",
          description: "Make sure a microphone is connected and try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Voice error",
        description: "Could not capture speech. Please try again.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);

    toast({
      title: "Listening...",
      description: listenerDescription,
    });
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  // Client-side fallback: split transcript on commas, "and", "also", semicolons
  const parseItemsLocally = (transcript: string): string[] => {
    return transcript
      .replace(/\b(please|add|buy|get|need|pick up|some|a few|a|an|the)\b/gi, ' ')
      .split(/,|;|\band\b|\balso\b/i)
      .map(s => s.trim())
      .filter(s => s.length > 1);
  };

  const processTranscript = async (transcript: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopping-voice-assistant', {
        body: { text: transcript }
      });

      if (!error && data?.items && data.items.length > 0) {
        onItemsAdded(data.items);
        toast({
          title: "Items added!",
          description: `Added ${data.items.length} item(s): ${data.items.join(', ')}`,
        });
        return;
      }

      // Fallback: parse locally
      const items = parseItemsLocally(transcript);
      if (items.length > 0) {
        onItemsAdded(items);
        toast({
          title: "Items added!",
          description: `Added ${items.length} item(s): ${items.join(', ')}`,
        });
      } else {
        toast({
          title: "No items detected",
          description: `I heard: "${transcript}". Try saying items separated by "and".`,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      logError('Error processing transcript:', error);
      // Still try local parse on error
      const items = parseItemsLocally(transcript);
      if (items.length > 0) {
        onItemsAdded(items);
        toast({ title: "Items added!", description: items.join(', ') });
      } else {
        toast({
          title: "Error processing voice",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Button
        variant={isListening ? "destructive" : "outline"}
        size="icon"
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
        className="h-10 w-10"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      {isListening && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          Listening...
        </div>
      )}
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Processing...
        </div>
      )}
    </div>
  );
};
