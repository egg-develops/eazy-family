import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { error as logError } from "@/lib/logger";
import { useTranslation } from "react-i18next";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface VoiceShoppingAssistantProps {
  onItemsAdded: (items: string[]) => void;
  listenerDescription?: string;
  mode?: 'shopping' | 'task' | 'shared';
}

export const VoiceShoppingAssistant = ({ onItemsAdded, listenerDescription = "Speak your items", mode = 'shopping' }: VoiceShoppingAssistantProps) => {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const speech = useSpeechRecognition();

  const speechLang = i18n.language === "de" ? "de-CH"
    : i18n.language === "fr" ? "fr-CH"
    : i18n.language === "it" ? "it-CH"
    : i18n.language === "en-GB" ? "en-GB"
    : "en-US";

  const parseItemsLocally = (transcript: string): string[] =>
    transcript
      .replace(/\b(please|add|buy|get|need|pick up|some|a few|a|an|the)\b/gi, ' ')
      .split(/,|;|\band\b|\balso\b/i)
      .map(s => s.trim())
      .filter(s => s.length > 1);

  const processTranscript = async (transcript: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopping-voice-assistant', {
        body: { text: transcript, mode }
      });

      if (!error && data?.items && data.items.length > 0) {
        onItemsAdded(data.items);
        toast({ title: t('voice.itemsAdded'), description: t('voice.itemsAddedDesc', { count: data.items.length, items: data.items.join(', ') }) });
        return;
      }

      const items = parseItemsLocally(transcript);
      if (items.length > 0) {
        onItemsAdded(items);
        toast({ title: t('voice.itemsAdded'), description: t('voice.itemsAddedDesc', { count: items.length, items: items.join(', ') }) });
      } else {
        toast({ title: t('voice.noItems'), description: `${t('voice.heard')}: "${transcript}". ${t('voice.tryAgain')}`, variant: "destructive" });
      }
    } catch (error: unknown) {
      logError('Error processing transcript:', error);
      const items = parseItemsLocally(transcript);
      if (items.length > 0) {
        onItemsAdded(items);
        toast({ title: t('voice.itemsAdded'), description: items.join(', ') });
      } else {
        toast({ title: t('voice.processingError'), description: t('voice.processingErrorDesc'), variant: "destructive" });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicPress = () => {
    if (speech.isListening) {
      speech.stop();
      return;
    }
    speech.start({
      lang: speechLang,
      onResult: (transcript, isFinal) => {
        if (isFinal && transcript.trim()) processTranscript(transcript.trim());
      },
      onError: (error) => {
        if (error === 'not-allowed' || error === 'permission-denied') {
          toast({ title: t('voice.micAccessDenied'), description: t('voice.allowMicAccess'), variant: "destructive" });
        } else if (error === 'not-supported') {
          toast({ title: t('voice.notAvailable'), description: t('voice.speechNotSupported'), variant: "destructive" });
        } else if (error !== 'no-speech') {
          toast({ title: t('voice.voiceErrorTitle'), description: t('voice.captureError'), variant: "destructive" });
        }
      },
      onEnd: () => {},
    });
    toast({ title: t('voice.listening'), description: listenerDescription });
  };

  return (
    <div className="flex gap-2 items-center">
      <Button
        variant={speech.isListening ? "destructive" : "outline"}
        size="icon"
        onClick={handleMicPress}
        disabled={isProcessing}
        className="h-10 w-10 relative"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : speech.isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        {!speech.isListening && !isProcessing && (
          <Sparkles className="absolute -top-1 -right-1 w-3 h-3" style={{ color: "#FFC861" }} />
        )}
      </Button>
      {speech.isListening && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          {t('voice.listening')}
        </div>
      )}
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {t('voice.processing')}
        </div>
      )}
    </div>
  );
};
