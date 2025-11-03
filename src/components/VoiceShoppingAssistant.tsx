import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoiceShoppingAssistantProps {
  onItemsAdded: (items: string[]) => void;
}

export const VoiceShoppingAssistant = ({ onItemsAdded }: VoiceShoppingAssistantProps) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Recording started",
        description: "Speak your shopping items...",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      
      reader.onerror = () => {
        setIsProcessing(false);
        toast({
          title: "Error reading audio",
          description: "Failed to process the audio file. Please try again.",
          variant: "destructive",
        });
      };
      
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result as string;
          const base64Data = base64Audio.split(',')[1];

          // Call the edge function
          const { data, error } = await supabase.functions.invoke('shopping-voice-assistant', {
            body: { audioBase64: base64Data }
          });

          if (error) {
            throw error;
          }

          if (data.items && data.items.length > 0) {
            onItemsAdded(data.items);
            toast({
              title: "Items added!",
              description: `Added ${data.items.length} item(s) to your shopping list: ${data.items.join(', ')}`,
            });
          } else {
            toast({
              title: "No items detected",
              description: data.transcription ? `I heard: "${data.transcription}"` : "Please try speaking more clearly.",
              variant: "destructive",
            });
          }
        } catch (error: any) {
          console.error('Error processing audio:', error);
          toast({
            title: "Error processing audio",
            description: error.message || "Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error: any) {
      console.error('Error processing audio:', error);
      setIsProcessing(false);
      
      toast({
        title: "Error processing audio",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant={isRecording ? "destructive" : "outline"}
        size="icon"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className="h-10 w-10"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          Recording...
        </div>
      )}
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Processing audio...
        </div>
      )}
    </div>
  );
};
