import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, X, Send, MapPin, BarChart2, Loader2 } from "lucide-react";
import { voiceService } from "@/services/VoiceService";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptic";
import { error as logError } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface ChannelAction {
  type: "message" | "poll" | "location";
  content?: string;
  pollQuestion?: string;
  pollOptions?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onCreatePoll: (question: string, options: string[]) => void;
  onShareLocation: () => void;
}

const TC = "#964735";
const MUTED = "hsl(var(--muted-foreground))";

// Parse voice input into a channel action using the existing AI endpoint
async function parseChannelIntent(text: string): Promise<ChannelAction> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

    const systemPrompt = `You are an intent classifier for a family messaging app. Given the user's voice input, return ONLY a JSON object — no markdown, no explanation.

Intent types:
- "location": user wants to share their location. Triggered by: "share my location", "send my location", "where I am", "my location"
- "poll": user wants to create a vote/poll. Triggered by: "create a poll", "vote for", "options", "choices", "what should we"
- "message": anything else — send as a text message

JSON fields:
- type: "location" | "poll" | "message"
- content: the message text (for type "message"), cleaned of command words
- pollQuestion: the poll question (for type "poll")
- pollOptions: array of option strings (for type "poll"), minimum 2

Return ONLY the raw JSON object.`;

    const res = await fetch(`${supabaseUrl}/functions/v1/eazy-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ userMessage: text, systemPrompt }),
    });

    if (!res.ok) throw new Error("AI parse failed");
    const data = await res.json();
    const raw = data.response ?? data.content ?? data.text ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as ChannelAction;
  } catch (e) {
    logError("[ChannelEZCapture] parseChannelIntent failed:", e);
    return { type: "message", content: text };
  }
}

export function ChannelEZCapture({ open, onClose, onSendMessage, onCreatePoll, onShareLocation }: Props) {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [action, setAction] = useState<ChannelAction | null>(null);

  const transcriptAccumRef = useRef("");
  const autoRestartRef = useRef(false);
  const restartCountRef = useRef(0);
  const MAX_RESTARTS = 6; // up to ~30s of pause-tolerant listening

  const stopAll = useCallback(() => {
    autoRestartRef.current = false;
    voiceService.stopListening();
    setIsListening(false);
  }, []);

  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setProcessing(true);
    haptic("light");
    const result = await parseChannelIntent(text);
    setAction(result);
    setProcessing(false);
  }, []);

  const startListening = useCallback(() => {
    autoRestartRef.current = true;
    restartCountRef.current = 0;
    transcriptAccumRef.current = "";
    setTranscript("");
    setAction(null);
    haptic("light");
    voiceService.startListening(navigator.language || "en-US");
  }, []);

  // Subscribe to voice events when open
  useEffect(() => {
    if (!open) {
      stopAll();
      setTranscript("");
      setAction(null);
      transcriptAccumRef.current = "";
      return;
    }

    const unsubState = voiceService.onStateChange(({ isListening: l, isTranscribing: t }) => {
      setIsListening(l);
      setIsTranscribing(t);
    });

    const unsubResult = voiceService.onResult((text, isFinal) => {
      if (isFinal) {
        // Accumulate finals across pause-restarts
        const combined = transcriptAccumRef.current
          ? `${transcriptAccumRef.current} ${text}`
          : text;
        transcriptAccumRef.current = combined;
        setTranscript(combined);
      } else {
        // Show interim below accumulated text
        const display = transcriptAccumRef.current
          ? `${transcriptAccumRef.current} ${text}`
          : text;
        setTranscript(display);
      }
    });

    const unsubEnd = voiceService.onEnd(() => {
      // Auto-restart on pause to handle natural speaking pauses
      if (autoRestartRef.current && restartCountRef.current < MAX_RESTARTS) {
        restartCountRef.current++;
        setTimeout(() => {
          if (autoRestartRef.current) {
            voiceService.startListening(navigator.language || "en-US");
          }
        }, 300);
      } else {
        autoRestartRef.current = false;
        setIsListening(false);
        if (transcriptAccumRef.current.trim()) {
          processTranscript(transcriptAccumRef.current);
        }
      }
    });

    startListening();

    return () => {
      unsubState();
      unsubResult();
      unsubEnd();
      stopAll();
    };
  }, [open]);

  const handleConfirm = () => {
    if (!action) return;
    haptic("medium");
    if (action.type === "location") {
      onShareLocation();
    } else if (action.type === "poll" && action.pollQuestion && action.pollOptions?.length) {
      onCreatePoll(action.pollQuestion, action.pollOptions);
    } else if (action.type === "message" && action.content) {
      onSendMessage(action.content);
    }
    onClose();
  };

  const handleStopAndProcess = () => {
    autoRestartRef.current = false;
    stopAll();
    if (transcriptAccumRef.current.trim()) {
      processTranscript(transcriptAccumRef.current);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) { stopAll(); onClose(); } }}
    >
      <div
        className="w-full rounded-t-3xl px-5 pt-5 pb-8 space-y-5"
        style={{ background: "hsl(var(--card))", maxHeight: "70vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
            Family Channel
          </p>
          <button onClick={() => { stopAll(); onClose(); }} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "hsl(var(--muted))" }}>
            <X className="w-4 h-4" style={{ color: MUTED }} />
          </button>
        </div>

        {/* Mic / transcript area */}
        {!action && !processing && (
          <div className="flex flex-col items-center gap-4 py-4">
            <button
              onClick={isListening ? handleStopAndProcess : startListening}
              className="w-20 h-20 rounded-full flex items-center justify-center relative"
              style={{ background: isListening ? TC : "hsl(var(--muted))" }}
            >
              {isListening && (
                <span
                  className="absolute inset-0 rounded-full"
                  style={{ background: TC, opacity: 0.3, animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite" }}
                />
              )}
              {isListening
                ? <MicOff className="w-8 h-8 text-white relative z-10" />
                : <Mic className="w-8 h-8 relative z-10" style={{ color: MUTED }} />
              }
            </button>

            {transcript ? (
              <p className="text-sm text-center leading-relaxed px-2" style={{ color: "hsl(var(--foreground))" }}>
                "{transcript}"
              </p>
            ) : (
              <p className="text-sm text-center" style={{ color: MUTED }}>
                {isListening ? "Listening… speak naturally, pauses are fine" : "Tap to speak"}
              </p>
            )}

            {transcript && !isListening && (
              <button
                onClick={() => processTranscript(transcriptAccumRef.current)}
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-white"
                style={{ background: TC }}
              >
                Continue
              </button>
            )}
          </div>
        )}

        {/* Processing */}
        {processing && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: TC }} />
            <p className="text-sm" style={{ color: MUTED }}>Understanding your message…</p>
          </div>
        )}

        {/* Action preview */}
        {action && !processing && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
              {action.type === "location" && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: TC }} />
                  <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>Share my current location</p>
                </div>
              )}
              {action.type === "poll" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 flex-shrink-0" style={{ color: TC }} />
                    <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{action.pollQuestion}</p>
                  </div>
                  {action.pollOptions?.map((opt, i) => (
                    <p key={i} className="text-xs pl-6" style={{ color: MUTED }}>• {opt}</p>
                  ))}
                </div>
              )}
              {action.type === "message" && (
                <p className="text-sm" style={{ color: "hsl(var(--foreground))" }}>{action.content}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setAction(null); setTranscript(""); transcriptAccumRef.current = ""; startListening(); }}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                style={{ background: "hsl(var(--muted))", color: MUTED }}
              >
                Redo
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: TC }}
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        )}

        {/* Quick action hints */}
        {!action && !processing && !transcript && (
          <div className="flex gap-2 flex-wrap">
            {['"Share my location"', '"Create a poll for…"', '"Send a message…"'].map(hint => (
              <span key={hint} className="text-xs px-2.5 py-1 rounded-full" style={{ background: "hsl(var(--muted))", color: MUTED }}>
                {hint}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
