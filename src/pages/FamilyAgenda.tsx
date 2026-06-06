import { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { useTranslation } from 'react-i18next';
import {
  Mic, MicOff, X, Plus, MapPin, FileText, BarChart2,
  Image, Play, ChevronLeft, Send,
} from "lucide-react";
import { ChannelEZCapture } from "@/components/ChannelEZCapture";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptic";
import { useToast } from "@/hooks/use-toast";
import { compressAndUpload } from "@/lib/imageUpload";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { format, isToday, isYesterday } from "date-fns";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────
// Data model
// ─────────────────────────────────────────────
interface ChannelMessage {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  isMe: boolean;
  type: "text" | "voice" | "image" | "location" | "document" | "poll" | "event";
  timestamp: string;
  content?: string;
  transcript?: string;
  duration?: number;
  imageUrl?: string;
  locationName?: string;
  lat?: number;
  lon?: number;
  fileName?: string;
  fileSize?: string;
  fileData?: string;
  pollQuestion?: string;
  pollOptions?: string[];
  pollVotes?: Record<string, number>;
  myVote?: number;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const TC = "hsl(var(--primary))";
const TL = "#D97B66";
const BORDER = "hsl(var(--border))";
const MUTED = "hsl(var(--muted-foreground))";
const SAGE = "#44664F";
const SAGE_BG = "#EEF4F0";
const BG = "hsl(var(--background))";
const CARD = "hsl(var(--card))";
const INK = "hsl(var(--foreground))";
const LS_KEY = "eazy-family-channel-messages";
const MAX_MESSAGES = 200;

function getUserIdentity() {
  try {
    const s = localStorage.getItem("eazy-family-onboarding");
    if (s) {
      const d = JSON.parse(s);
      const name: string = d.firstName || d.name || "Me";
      return { name, initials: name.slice(0, 2).toUpperCase(), color: TC };
    }
  } catch { /* ignore */ }
  return { name: "Me", initials: "ME", color: TC };
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function groupByDate(messages: ChannelMessage[]) {
  const groups: { label: string; messages: ChannelMessage[] }[] = [];
  let currentLabel = "";
  for (const msg of messages) {
    const d = new Date(msg.timestamp);
    const label = isToday(d) ? "TODAY" : isYesterday(d) ? "YESTERDAY" : format(d, "MMM d, yyyy").toUpperCase();
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

// ─────────────────────────────────────────────
// Waveform bars (static decoration)
// ─────────────────────────────────────────────
const WAVEFORM_HEIGHTS = [8, 14, 20, 16, 24, 12, 18, 10];
const WaveformBars = ({ color = SAGE }: { color?: string }) => (
  <div className="flex items-center gap-0.5" style={{ height: "24px" }}>
    {WAVEFORM_HEIGHTS.map((h, i) => (
      <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "2px", background: color, opacity: 0.7 }} />
    ))}
  </div>
);

// ─────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────
const Avatar = ({ initials, color, size = 28 }: { initials: string; color: string; size?: number }) => (
  <div
    className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
    style={{ width: size, height: size, background: color, fontSize: size * 0.38, lineHeight: 1 }}
  >
    {initials}
  </div>
);

// ─────────────────────────────────────────────
// Individual message renderers
// ─────────────────────────────────────────────
const TextBubble = ({ msg }: { msg: ChannelMessage }) => (
  <div
    className="rounded-2xl px-3.5 py-2.5 text-sm"
    style={{
      background: msg.isMe ? TC : CARD,
      color: msg.isMe ? "#fff" : INK,
      border: msg.isMe ? "none" : `1px solid ${BORDER}`,
      borderTopRightRadius: msg.isMe ? "4px" : undefined,
      borderTopLeftRadius: !msg.isMe ? "4px" : undefined,
      maxWidth: "72%",
      wordBreak: "break-word",
    }}
  >
    {msg.content}
  </div>
);

const VoiceBubble = ({ msg }: { msg: ChannelMessage }) => {
  const handlePlay = () => {
    if (!msg.transcript) return;
    const utt = new SpeechSynthesisUtterance(msg.transcript);
    window.speechSynthesis.speak(utt);
  };
  return (
    <div
      className="rounded-2xl px-3.5 py-2.5 flex items-center gap-2"
      style={{
        background: msg.isMe ? TC : CARD,
        border: msg.isMe ? "none" : `1px solid ${BORDER}`,
        borderTopRightRadius: msg.isMe ? "4px" : undefined,
        borderTopLeftRadius: !msg.isMe ? "4px" : undefined,
        maxWidth: "72%",
      }}
    >
      <button
        onClick={handlePlay}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: msg.isMe ? "rgba(255,255,255,0.25)" : SAGE_BG }}
      >
        <Play className="w-4 h-4" style={{ color: msg.isMe ? "#fff" : SAGE, marginLeft: "1px" }} />
      </button>
      <WaveformBars color={msg.isMe ? "rgba(255,255,255,0.6)" : SAGE} />
      <span className="text-xs font-medium flex-shrink-0" style={{ color: msg.isMe ? "rgba(255,255,255,0.8)" : MUTED }}>
        {formatDuration(msg.duration || 0)}
      </span>
    </div>
  );
};

const ImageBubble = ({ msg, onExpand }: { msg: ChannelMessage; onExpand: (url: string) => void }) => (
  <div style={{ maxWidth: "70%" }}>
    <img
      src={msg.imageUrl}
      alt="shared"
      onClick={() => msg.imageUrl && onExpand(msg.imageUrl)}
      className="rounded-2xl cursor-pointer object-cover"
      style={{ maxWidth: "100%", maxHeight: "260px", border: `1px solid ${BORDER}` }}
    />
  </div>
);

const LocationBubble = ({ msg }: { msg: ChannelMessage }) => (
  <button
    className="rounded-2xl px-3.5 py-2.5 flex items-start gap-2 text-left"
    style={{ background: SAGE_BG, border: `1px solid ${BORDER}`, maxWidth: "72%" }}
    onClick={() => {
      if (msg.lat === undefined || msg.lon === undefined) return;
      const coord = `${msg.lat},${msg.lon}`;
      const url = Capacitor.getPlatform() === 'android'
        ? `https://maps.google.com/?q=${coord}`
        : `https://maps.apple.com/?q=${coord}`;
      window.open(url, '_system');
    }}
  >
    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: SAGE }} />
    <div>
      <p className="text-sm font-semibold" style={{ color: INK }}>{msg.locationName || "Location"}</p>
      <p className="text-xs" style={{ color: SAGE }}>Tap to open in Maps</p>
    </div>
  </button>
);

const DocumentBubble = ({ msg }: { msg: ChannelMessage }) => {
  const handleOpen = () => {
    if (!msg.fileData) return;
    const byteString = atob(msg.fileData);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    // Infer MIME type from extension
    const ext = (msg.fileName || '').split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', txt: 'text/plain', csv: 'text/csv' };
    const mime = mimeMap[ext] || 'application/octet-stream';
    const blob = new Blob([ab], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = msg.fileName || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <button
      onClick={handleOpen}
      className="rounded-2xl px-3.5 py-2.5 flex items-center gap-3 text-left"
      style={{ background: CARD, border: `1px solid ${BORDER}`, maxWidth: "72%" }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: SAGE_BG }}>
        <FileText className="w-4 h-4" style={{ color: SAGE }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: INK, maxWidth: "180px" }}>{msg.fileName}</p>
        <p className="text-xs" style={{ color: MUTED }}>{msg.fileSize} · Document</p>
      </div>
    </button>
  );
};

const PollBubble = ({
  msg,
  onVote,
}: {
  msg: ChannelMessage;
  onVote: (msgId: string, optionIndex: number) => void;
}) => {
  const totalVotes = Object.values(msg.pollVotes || {}).reduce((a, b) => a + b, 0);
  return (
    <div
      className="rounded-2xl px-3.5 py-3 space-y-2"
      style={{ background: CARD, border: `1px solid ${BORDER}`, maxWidth: "72%", minWidth: "200px" }}
    >
      <p className="text-sm font-semibold" style={{ color: INK }}>{msg.pollQuestion}</p>
      {(msg.pollOptions || []).map((opt, i) => {
        const votes = (msg.pollVotes || {})[String(i)] || 0;
        const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        const isMyVote = msg.myVote === i;
        return (
          <button
            key={i}
            onClick={() => onVote(msg.id, i)}
            className="w-full text-left rounded-xl overflow-hidden relative"
            style={{ border: `1px solid ${isMyVote ? TC : BORDER}` }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-xl"
              style={{ width: `${pct}%`, background: isMyVote ? `${TC}22` : `${SAGE}15`, transition: "width 0.3s ease" }}
            />
            <div className="relative flex items-center justify-between px-2.5 py-2">
              <span className="text-sm" style={{ color: isMyVote ? TC : INK, fontWeight: isMyVote ? 600 : 400 }}>{opt}</span>
              <span className="text-xs font-medium ml-2" style={{ color: MUTED }}>{pct}%</span>
            </div>
          </button>
        );
      })}
      <p className="text-xs" style={{ color: MUTED }}>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
    </div>
  );
};

const EventCard = ({ msg }: { msg: ChannelMessage }) => {
  const navigate = useNavigate();
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
      style={{ background: CARD, border: `1px solid ${BORDER}`, maxWidth: "85%" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: SAGE_BG }}>
        <span style={{ fontSize: "18px" }}>🗓️</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: INK }}>{msg.eventTitle}</p>
        <p className="text-xs mt-0.5" style={{ color: MUTED }}>{msg.eventDate}{msg.eventLocation ? ` · ${msg.eventLocation}` : ""}</p>
      </div>
      <button
        onClick={() => navigate("/app/calendar")}
        className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ background: SAGE_BG, color: SAGE }}
      >
        View
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────
// Message row
// ─────────────────────────────────────────────
const MessageRow = ({
  msg,
  onImageExpand,
  onVote,
}: {
  msg: ChannelMessage;
  onImageExpand: (url: string) => void;
  onVote: (msgId: string, optionIndex: number) => void;
}) => {
  const ts = format(new Date(msg.timestamp), "h:mm a");

  if (msg.type === "event") {
    return (
      <div className="flex justify-center my-1">
        <EventCard msg={msg} />
      </div>
    );
  }

  const bubble = (() => {
    switch (msg.type) {
      case "text": return <TextBubble msg={msg} />;
      case "voice": return <VoiceBubble msg={msg} />;
      case "image": return <ImageBubble msg={msg} onExpand={onImageExpand} />;
      case "location": return <LocationBubble msg={msg} />;
      case "document": return <DocumentBubble msg={msg} />;
      case "poll": return <PollBubble msg={msg} onVote={onVote} />;
      default: return null;
    }
  })();

  if (msg.isMe) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-end gap-1.5">
          {bubble}
          <Avatar initials={msg.authorInitials} color={msg.authorColor} size={28} />
        </div>
        <span className="text-xs mr-9" style={{ color: MUTED }}>{ts}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <p className="text-xs font-semibold ml-9 mb-0.5" style={{ color: INK }}>{msg.authorName}</p>
      <div className="flex items-end gap-1.5">
        <Avatar initials={msg.authorInitials} color={msg.authorColor} size={28} />
        {bubble}
      </div>
      <span className="text-xs ml-9" style={{ color: MUTED }}>{ts}</span>
    </div>
  );
};

// ─────────────────────────────────────────────
// Poll creator
// ─────────────────────────────────────────────
const PollCreator = ({
  onCreate,
  onCancel,
}: {
  onCreate: (question: string, options: string[]) => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const addOption = () => {
    if (options.length < 4) setOptions(p => [...p, ""]);
  };
  const setOption = (i: number, val: string) => {
    setOptions(p => p.map((o, idx) => idx === i ? val : o));
  };
  const valid = question.trim() && options.filter(o => o.trim()).length >= 2;

  return (
    <div className="mx-4 mb-3 rounded-2xl p-4 shadow-lg" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: INK }}>{t('familyAgenda.createPoll')}</p>
        <button onClick={onCancel} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--muted))' }}><X className="w-4 h-4" style={{ color: MUTED }} /></button>
      </div>
      <input
        className="w-full text-sm rounded-xl px-3 py-2 mb-3 outline-none"
        style={{ border: `1px solid ${BORDER}`, color: INK }}
        placeholder={t('familyAgenda.askQuestion')}
        value={question}
        onChange={e => setQuestion(e.target.value)}
        autoFocus
      />
      {options.map((opt, i) => (
        <input
          key={i}
          className="w-full text-sm rounded-xl px-3 py-2 mb-2 outline-none"
          style={{ border: `1px solid ${BORDER}`, color: INK }}
          placeholder={`${t('familyAgenda.optionPlaceholder')} ${i + 1}`}
          value={opt}
          onChange={e => setOption(i, e.target.value)}
        />
      ))}
      <div className="flex items-center gap-2 mt-1">
        {options.length < 4 && (
          <button
            onClick={addOption}
            className="text-[11px] px-2.5 py-1 rounded-full"
            style={{ background: SAGE_BG, color: SAGE }}
          >
            {t('familyAgenda.addOption')}
          </button>
        )}
        <button
          onClick={() => valid && onCreate(question.trim(), options.filter(o => o.trim()))}
          disabled={!valid}
          className="text-[11px] px-3 py-1 rounded-full font-semibold text-white ml-auto"
          style={{ background: valid ? TC : BORDER }}
        >
          {t('familyAgenda.createPollBtn')}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
const FamilyAgenda = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Messages
  const [messages, setMessages] = useState<ChannelMessage[]>(() => {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return [];
  });

  // Input
  const [text, setText] = useState("");

  // Voice
  const speech = useSpeechRecognition();
  const isListening = speech.isListening;
  const [liveTranscript, setLiveTranscript] = useState("");
  const capturedRef = useRef("");

  // Attachment tray
  const [trayOpen, setTrayOpen] = useState(false);

  // Channel EZ Capture (voice → message/poll/location)
  const [channelEZOpen, setChannelEZOpen] = useState(false);

  // Poll creator
  const [pollCreatorOpen, setPollCreatorOpen] = useState(false);

  // Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Uploading
  const [uploading, setUploading] = useState(false);

  // Refs
  const bottomRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);

  // Quiet hours
  const hour = new Date().getHours();
  const isQuietHours = hour < 7 || hour >= 21;

  // ── Persist ─────────────────────────────────
  useEffect(() => {
    const capped = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(LS_KEY, JSON.stringify(capped));
  }, [messages]);

  // ── Scroll to bottom ────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── EZ button → open Channel EZ Capture ─────
  useEffect(() => {
    const handler = () => { setChannelEZOpen(true); };
    window.addEventListener('ez-family-channel-tray', handler);
    return () => window.removeEventListener('ez-family-channel-tray', handler);
  }, []);

  // ── Helpers ─────────────────────────────────
  const me = getUserIdentity();

  const addMessage = useCallback((partial: Omit<ChannelMessage, "id" | "authorName" | "authorInitials" | "authorColor" | "isMe" | "timestamp">) => {
    const msg: ChannelMessage = {
      id: crypto.randomUUID(),
      authorName: me.name,
      authorInitials: me.initials,
      authorColor: me.color,
      isMe: true,
      timestamp: new Date().toISOString(),
      ...partial,
    };
    setMessages(prev => [...prev, msg]);
    haptic("light");
    return msg;
  }, [me.name, me.initials, me.color]);

  // ── Text send ───────────────────────────────
  const sendText = () => {
    if (!text.trim()) return;
    addMessage({ type: "text", content: text.trim() });
    setText("");
  };

  // ── Voice recording ─────────────────────────
  const finalizeVoiceMessage = () => {
    const final = capturedRef.current.trim();
    if (final) {
      const wordCount = final.split(/\s+/).length;
      const duration = Math.max(1, Math.round(wordCount / 2));
      addMessage({ type: "voice", transcript: final, duration });
    }
    capturedRef.current = "";
    setLiveTranscript("");
  };

  const startListening = () => {
    capturedRef.current = "";
    setLiveTranscript("");
    speech.start({
      lang: navigator.language || "en-US",
      onResult: (transcript) => {
        const combined = capturedRef.current
          ? `${capturedRef.current} ${transcript}`
          : transcript;
        capturedRef.current = combined;
        setLiveTranscript(combined);
      },
      onError: (error) => {
        if (error === "not-supported") {
          toast({ title: t('familyAgenda.voiceNotSupported') });
        } else if (error === "not-allowed") {
          toast({ title: t('familyAgenda.micDenied'), description: t('familyAgenda.micDeniedDesc') });
        }
        capturedRef.current = "";
        setLiveTranscript("");
      },
      onEnd: finalizeVoiceMessage,
    });
    haptic("light");
  };

  const stopListening = () => speech.stop();

  const handleMicToggle = () => {
    if (isListening) stopListening();
    else startListening();
  };

  // ── Photo/Camera upload ─────────────────────
  const handleImageFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `channel/${crypto.randomUUID()}.${ext}`;
      const url = await compressAndUpload(file, "user-uploads", path);
      addMessage({ type: "image", imageUrl: url });
    } catch {
      toast({ title: t('familyAgenda.imageUploadFailed'), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ── Location ────────────────────────────────
  const shareLocation = () => {
    if (!navigator.geolocation) { toast({ title: t('familyAgenda.geolocationNotSupported') }); return; }
    setTrayOpen(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        let locationName = "My Location";
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { "Accept-Language": "en", "User-Agent": "EazyFamily/1.0" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const street = addr.road || addr.pedestrian || addr.street || '';
          const houseNo = addr.house_number ? ` ${addr.house_number}` : '';
          const city = addr.city || addr.town || addr.village || addr.county || '';
          locationName = street
            ? `${street}${houseNo}${city ? `, ${city}` : ''}`
            : city || locationName;
        } catch { /* use fallback */ }
        addMessage({ type: "location", locationName, lat, lon });
      },
      () => toast({ title: t('familyAgenda.couldNotGetLocation'), description: t('familyAgenda.checkLocationPermissions') })
    );
  };

  // ── Document ────────────────────────────────
  const handleDocFile = async (file: File) => {
    if (!file) return;
    const sizeStr = formatFileSize(file.size);
    let fileData: string | undefined;
    if (file.size < 500 * 1024) {
      // Store as base64
      fileData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip data:... prefix
        };
        reader.readAsDataURL(file);
      });
    }
    addMessage({ type: "document", fileName: file.name, fileSize: sizeStr, fileData });
  };

  // ── Poll ────────────────────────────────────
  const handleCreatePoll = (question: string, options: string[]) => {
    const pollVotes: Record<string, number> = {};
    options.forEach((_, i) => { pollVotes[String(i)] = 0; });
    addMessage({ type: "poll", pollQuestion: question, pollOptions: options, pollVotes });
    setPollCreatorOpen(false);
    setTrayOpen(false);
  };

  const handleVote = (msgId: string, optionIndex: number) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const prevVote = m.myVote;
      const newVotes = { ...(m.pollVotes || {}) };
      // Remove old vote
      if (prevVote !== undefined) {
        newVotes[String(prevVote)] = Math.max(0, (newVotes[String(prevVote)] || 1) - 1);
      }
      // Add new vote (toggle off if same)
      if (prevVote === optionIndex) {
        return { ...m, pollVotes: newVotes, myVote: undefined };
      }
      newVotes[String(optionIndex)] = (newVotes[String(optionIndex)] || 0) + 1;
      return { ...m, pollVotes: newVotes, myVote: optionIndex };
    }));
    haptic("light");
  };

  // ── Grouped messages ─────────────────────────
  const groups = groupByDate(messages);

  // ── Render ───────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: BG, zIndex: 40 }}
    >
      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { handleImageFile(f); setTrayOpen(false); } e.target.value = ""; }}
      />
      <input
        ref={docInputRef}
        type="file"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { handleDocFile(f); setTrayOpen(false); } e.target.value = ""; }}
      />

      {/* ── Header ───────────────────────────────── */}
      <div
        style={{
          paddingTop: "env(safe-area-inset-top)",
          background: BG,
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
      >
        <div className="flex items-center justify-between px-4" style={{ height: "56px" }}>
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ flexShrink: 0 }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: TC }} />
          </button>
          <p className="font-bold text-xl" style={{ color: INK }}>{t('familyAgenda.title')}</p>
          <div className="w-9 h-9 flex-shrink-0" />
        </div>
      </div>

      {/* ── Quiet hours banner — in flow, not fixed ── */}
      {isQuietHours && (
        <div className="flex justify-center py-2" style={{ background: BG, flexShrink: 0 }}>
          <div
            className="px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5"
            style={{ background: SAGE_BG, color: SAGE }}
          >
            🌙 {t('familyAgenda.quietHours')}
          </div>
        </div>
      )}

      {/* ── Scrollable message area ───────────────── */}
      <div
        ref={messagesAreaRef}
        className="flex-1 overflow-y-auto"
        style={{ padding: "12px 16px 16px" }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-full gap-3 text-center py-16">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <path d="M32 28 Q32 21 38 21 L68 21 Q74 21 74 28 L74 50 Q74 57 68 57 L58 57 L54 63 L54 57 L38 57 Q32 57 32 50 Z" fill="#D97B66" opacity="0.2"/>
              <path d="M6 18 Q6 10 13 10 L52 10 Q59 10 59 18 L59 46 Q59 54 52 54 L30 54 L20 64 L20 54 L13 54 Q6 54 6 46 Z" fill="#FDF3EE" stroke="#964735" strokeWidth="2.5"/>
              <circle cx="20" cy="32" r="3.5" fill="#D97B66"/>
              <circle cx="32" cy="32" r="3.5" fill="#964735"/>
              <circle cx="44" cy="32" r="3.5" fill="#D97B66"/>
            </svg>
            <p className="font-semibold" style={{ color: INK }}>{t('familyAgenda.emptyChannel')}</p>
            <p className="text-sm" style={{ color: MUTED, maxWidth: "240px" }}>
              {t('familyAgenda.emptyChannelDesc')}
            </p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ background: BORDER }} />
              <span className="text-xs font-semibold px-2" style={{ color: MUTED }}>{group.label}</span>
              <div className="flex-1 h-px" style={{ background: BORDER }} />
            </div>
            <div className="space-y-3">
              {group.messages.map(msg => (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  onImageExpand={setPreviewUrl}
                  onVote={handleVote}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Live voice transcript */}
        {isListening && liveTranscript && (
          <div className="flex flex-col items-end gap-0.5 mt-3">
            <div className="flex items-end gap-1.5">
              <div
                className="rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm italic"
                style={{ background: `${TC}33`, color: INK, maxWidth: "72%" }}
              >
                {liveTranscript}
              </div>
              <Avatar initials={me.initials} color={me.color} size={28} />
            </div>
          </div>
        )}

        <div ref={bottomRef} style={{ height: "1px" }} />
      </div>

      {/* ── Poll creator ─────────────────────────── */}
      {pollCreatorOpen && (
        <div style={{ flexShrink: 0 }}>
          <PollCreator
            onCreate={handleCreatePoll}
            onCancel={() => setPollCreatorOpen(false)}
          />
        </div>
      )}

      {/* ── Attachment tray ───────────────────── */}
      {trayOpen && !pollCreatorOpen && (
        <div style={{ flexShrink: 0, animation: "slideUp 0.2s ease" }}>
          <div
            className="mx-4 mb-2 rounded-2xl p-4 shadow-xl"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="grid grid-cols-4 gap-3">
              {/* PHOTOS */}
              <button
                className="flex flex-col items-center gap-2"
                onClick={() => photoInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: SAGE_BG }}>
                  <Image className="w-5 h-5" style={{ color: SAGE }} />
                </div>
                <span className="text-xs font-medium" style={{ color: MUTED }}>{t('familyAgenda.photos')}</span>
              </button>

              {/* LOCATION */}
              <button
                className="flex flex-col items-center gap-2"
                onClick={shareLocation}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#FEF3F0" }}>
                  <MapPin className="w-5 h-5" style={{ color: TC }} />
                </div>
                <span className="text-xs font-medium" style={{ color: MUTED }}>{t('familyAgenda.location')}</span>
              </button>

              {/* DOCUMENT */}
              <button
                className="flex flex-col items-center gap-2"
                onClick={() => docInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#F3F0FE" }}>
                  <FileText className="w-5 h-5" style={{ color: "#6B5EAD" }} />
                </div>
                <span className="text-xs font-medium" style={{ color: MUTED }}>{t('familyAgenda.document')}</span>
              </button>

              {/* POLL */}
              <button
                className="flex flex-col items-center gap-2"
                onClick={() => { setPollCreatorOpen(true); setTrayOpen(false); }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#FEF9E7" }}>
                  <BarChart2 className="w-5 h-5" style={{ color: "#B8860B" }} />
                </div>
                <span className="text-xs font-medium" style={{ color: MUTED }}>{t('familyAgenda.poll')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Input bar ─────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingTop: "8px",
          paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
          background: BG,
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <div
          className="flex items-center gap-2 rounded-full px-3 py-2"
          style={{ background: BG, border: `1px solid ${BORDER}` }}
        >
          {/* +/× toggle */}
          <button
            onClick={() => { setTrayOpen(p => !p); if (pollCreatorOpen) setPollCreatorOpen(false); }}
            className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ background: trayOpen ? `${TC}15` : "transparent" }}
          >
            {trayOpen
              ? <X className="w-5 h-5" style={{ color: TC }} />
              : <Plus className="w-5 h-5" style={{ color: MUTED }} />
            }
          </button>

          {/* Text input */}
          <input
            ref={textInputRef}
            value={isListening ? liveTranscript : text}
            onChange={e => { if (!isListening) setText(e.target.value); }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
            placeholder={isListening ? t('familyAgenda.listening') : ""}
            disabled={isListening || uploading}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: INK, minWidth: 0 }}
          />

          {/* Send button — only visible when there is text */}
          {text.trim() && (
            <button
              onClick={sendText}
              className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
              style={{ background: TC }}
            >
              <Send className="w-4 h-4 text-white" style={{ marginLeft: "1px" }} />
            </button>
          )}
        </div>

        {/* Uploading indicator */}
        {uploading && (
          <p className="text-xs text-center mt-1" style={{ color: MUTED }}>{t('familyAgenda.uploading')}</p>
        )}
      </div>

      {/* ── Full-screen image preview ─────────── */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.9)" }}
          onClick={() => setPreviewUrl(null)}
        >
          <img
            src={previewUrl}
            alt="preview"
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      {/* Channel EZ Capture — voice → message/poll/location */}
      <ChannelEZCapture
        open={channelEZOpen}
        onClose={() => setChannelEZOpen(false)}
        onSendMessage={(text) => { addMessage({ type: "text", content: text }); }}
        onCreatePoll={(question, options) => { handleCreatePoll(question, options); }}
        onShareLocation={() => { shareLocation(); }}
      />
    </div>
  );
};

export default FamilyAgenda;
