import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import {
  Mic, MicOff, X, Plus, MapPin, FileText,
  Image, Play, ChevronLeft, Send, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  rowToChannelMessage, channelMessageToRow, buildAuthors,
  type ChannelMessage, type ChannelAuthor, type FamilyMessageRow, type ChannelMessageInput,
} from "@/lib/familyChannel";
import { haptic } from "@/lib/haptic";
import { useToast } from "@/hooks/use-toast";
import { compressAndUpload } from "@/lib/imageUpload";
import { openInMaps } from "@/lib/maps";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { format, isToday, isYesterday } from "date-fns";
import { de as deLocale, fr as frLocale, it as itLocale, es as esLocale, pt as ptLocale, type Locale } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

// ChannelMessage / row types now live in @/lib/familyChannel (shared, tested).

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
const MAX_MESSAGES = 200;

// Module-level cache so re-entering the channel paints instantly instead of
// re-running 4 sequential queries on every mount (the "slow going back to the
// channel" lag). State hydrates from this synchronously; the load effect then
// refreshes it in the background.
const channelCache: {
  familyId: string | null;
  messages: ChannelMessage[];
  authors: Record<string, ChannelAuthor>;
} = { familyId: null, messages: [], authors: {} };

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

function groupByDate(messages: ChannelMessage[], t: (key: string) => string, fmt: (date: Date, pattern: string) => string) {
  const groups: { label: string; messages: ChannelMessage[] }[] = [];
  let currentLabel = "";
  for (const msg of messages) {
    const d = new Date(msg.timestamp);
    const label = isToday(d) ? t('familyAgenda.today').toUpperCase() : isYesterday(d) ? t('familyAgenda.yesterday').toUpperCase() : fmt(d, "PP").toUpperCase();
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
      void openInMaps(`${msg.lat},${msg.lon}`);
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

const EventCard = ({ msg, t }: { msg: ChannelMessage; t: (key: string) => string }) => {
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
        {t('common.view')}
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
  t,
  fmt,
}: {
  msg: ChannelMessage;
  onImageExpand: (url: string) => void;
  t: (key: string) => string;
  fmt: (date: Date, pattern: string) => string;
}) => {
  const ts = fmt(new Date(msg.timestamp), "p");

  if (msg.type === "event") {
    return (
      <div className="flex justify-center my-1">
        <EventCard msg={msg} t={t} />
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
// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
const FamilyAgenda = () => {
  const { t, i18n } = useTranslation();
  const dateFnsLocale: Locale | undefined = ({ de: deLocale, fr: frLocale, it: itLocale, es: esLocale, pt: ptLocale } as Record<string, Locale>)[i18n.language.split('-')[0]];
  const fmt = (date: Date, pattern: string) => format(date, pattern, { locale: dateFnsLocale });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Messages — shared via the family_messages table (loaded + realtime below).
  // Seed from the module cache so re-entering the channel renders immediately.
  const [messages, setMessages] = useState<ChannelMessage[]>(channelCache.messages);
  const [familyId, setFamilyId] = useState<string | null>(channelCache.familyId);
  const [authors, setAuthors] = useState<Record<string, ChannelAuthor>>(channelCache.authors);

  // Swipe-left-to-delete for your own messages (mirrors the journal pattern).
  const DELETE_W = 72;
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const swipeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const swipeTouch = useRef<{ startX: number; id: string; el: HTMLDivElement } | null>(null);
  const resetSwipe = (id: string) => {
    const el = swipeRefs.current.get(id);
    if (el) { el.style.transition = 'transform 0.2s ease'; el.style.transform = 'translateX(0)'; }
  };
  const onSwipeStart = (e: React.TouchEvent, id: string) => {
    if (openSwipeId && openSwipeId !== id) { resetSwipe(openSwipeId); setOpenSwipeId(null); }
    const el = swipeRefs.current.get(id);
    if (el) swipeTouch.current = { startX: e.touches[0].clientX, id, el };
  };
  const onSwipeMove = (e: React.TouchEvent) => {
    if (!swipeTouch.current) return;
    const { startX, id, el } = swipeTouch.current;
    const base = openSwipeId === id ? -DELETE_W : 0;
    const x = Math.min(0, Math.max(e.touches[0].clientX - startX + base, -DELETE_W));
    el.style.transition = 'none';
    el.style.transform = `translateX(${x}px)`;
  };
  const onSwipeEnd = (e: React.TouchEvent) => {
    if (!swipeTouch.current) return;
    const { startX, id, el } = swipeTouch.current;
    const delta = e.changedTouches[0].clientX - startX;
    el.style.transition = 'transform 0.2s ease';
    if (delta < -40) { el.style.transform = `translateX(-${DELETE_W}px)`; setOpenSwipeId(id); }
    else { el.style.transform = 'translateX(0)'; if (openSwipeId === id) setOpenSwipeId(null); }
    swipeTouch.current = null;
  };
  const deleteMessage = async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    setOpenSwipeId(null);
    channelCache.messages = channelCache.messages.filter(m => m.id !== id);
    const { error } = await supabase.from('family_messages').delete().eq('id', id);
    if (error) toast({ title: t('common.error'), variant: 'destructive' });
  };

  // Input
  const [text, setText] = useState("");

  // Voice
  const speech = useSpeechRecognition();
  const isListening = speech.isListening;
  const [liveTranscript, setLiveTranscript] = useState("");
  const capturedRef = useRef("");

  // Attachment tray
  const [trayOpen, setTrayOpen] = useState(false);

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

  // ── Load family roster + messages, then subscribe to realtime ──────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: mine } = await supabase
        .from('family_members').select('family_id')
        .eq('user_id', user.id).eq('is_active', true).maybeSingle();
      const fid = mine?.family_id;
      if (cancelled || !fid) return;
      setFamilyId(fid);
      channelCache.familyId = fid;

      // Author lookup: member full_name + profile display_name, stable colour.
      const { data: members } = await supabase
        .from('family_members').select('user_id, full_name')
        .eq('family_id', fid).eq('is_active', true);
      const ids = (members ?? []).map(m => m.user_id).filter(Boolean) as string[];
      const { data: profiles } = ids.length
        ? await supabase.from('profiles').select('user_id, display_name').in('user_id', ids)
        : { data: [] as { user_id: string; display_name: string | null }[] };
      const authorMap = buildAuthors(members ?? [], profiles ?? []);
      if (cancelled) return;
      setAuthors(authorMap);
      channelCache.authors = authorMap;

      const { data: rows } = await supabase
        .from('family_messages')
        .select('id, family_id, sender_id, content, media_url, type, metadata, created_at')
        .eq('family_id', fid)
        .order('created_at', { ascending: true })
        .limit(MAX_MESSAGES);
      if (cancelled) return;
      const mapped = (rows ?? []).map(r => rowToChannelMessage(r as FamilyMessageRow, authorMap, user.id));
      setMessages(mapped);
      channelCache.messages = mapped;

      // Realtime: append inserts from OTHER members (mine are already optimistic).
      channel = supabase
        .channel(`family-${fid}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'family_messages', filter: `family_id=eq.${fid}` }, (payload) => {
          const row = payload.new as FamilyMessageRow;
          if (row.sender_id === user.id) return;
          setMessages(prev => prev.some(m => m.id === row.id) ? prev : [...prev, rowToChannelMessage(row, authorMap, user.id)]);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'family_messages', filter: `family_id=eq.${fid}` }, (payload) => {
          const oldId = (payload.old as { id?: string })?.id;
          if (oldId) setMessages(prev => prev.filter(m => m.id !== oldId));
        })
        .subscribe();
    })();

    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [user]);

  // ── Scroll to bottom ────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // The EZ orb opens the standard EZCapture in channel mode (App.tsx); when it
  // posts, it dispatches the new row so we can show it instantly (own realtime
  // events are skipped, and navigating to this same route won't reload).
  useEffect(() => {
    const handler = (e: Event) => {
      const row = (e as CustomEvent).detail as FamilyMessageRow;
      if (!user || !row?.id) return;
      setMessages(prev => prev.some(m => m.id === row.id) ? prev : [...prev, rowToChannelMessage(row, authors, user.id)]);
    };
    window.addEventListener('eazy-channel-message-sent', handler);
    return () => window.removeEventListener('eazy-channel-message-sent', handler);
  }, [authors, user]);

  // ── Helpers ─────────────────────────────────
  // Prefer the resolved family author (so my bubble matches what others see);
  // fall back to the on-device onboarding name until the roster loads.
  const me: ChannelAuthor = (user && authors[user.id]) || getUserIdentity();

  const addMessage = useCallback((partial: ChannelMessageInput) => {
    const tempId = crypto.randomUUID();
    const optimistic: ChannelMessage = {
      id: tempId,
      authorName: me.name,
      authorInitials: me.initials,
      authorColor: me.color,
      isMe: true,
      timestamp: new Date().toISOString(),
      ...partial,
    };
    setMessages(prev => [...prev, optimistic]);
    haptic("light");
    // Persist to the shared channel; swap the temp row for the real DB row.
    if (familyId && user) {
      const row = channelMessageToRow(partial, familyId, user.id);
      supabase.from('family_messages').insert(row).select('id, created_at').single()
        .then(({ data }) => {
          if (data) setMessages(prev => prev.map(m => m.id === tempId ? { ...optimistic, id: data.id, timestamp: data.created_at } : m));
        });
    }
    return optimistic;
  }, [me.name, me.initials, me.color, familyId, user]);

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

  // ── Grouped messages ─────────────────────────
  const groups = groupByDate(messages, t, fmt);

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
                msg.isMe && msg.type !== 'event' ? (
                  <div key={msg.id} className="relative overflow-hidden">
                    {/* Delete — revealed by swiping the message left */}
                    <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center rounded-2xl"
                      style={{ width: DELETE_W, background: '#C0392B' }}>
                      <button onClick={() => deleteMessage(msg.id)} aria-label={t('common.delete')}
                        className="w-full h-full flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-white" />
                      </button>
                    </div>
                    <div
                      data-msg-swipe={msg.id}
                      ref={el => { if (el) swipeRefs.current.set(msg.id, el); else swipeRefs.current.delete(msg.id); }}
                      style={{ background: BG, willChange: 'transform' }}
                      onTouchStart={e => onSwipeStart(e, msg.id)}
                      onTouchMove={onSwipeMove}
                      onTouchEnd={onSwipeEnd}
                    >
                      <MessageRow msg={msg} onImageExpand={setPreviewUrl} t={t} fmt={fmt} />
                    </div>
                  </div>
                ) : (
                  <MessageRow
                    key={msg.id}
                    msg={msg}
                    onImageExpand={setPreviewUrl}
                    t={t}
                    fmt={fmt}
                  />
                )
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

      {/* ── Attachment tray ───────────────────── */}
      {trayOpen && (
        <div style={{ flexShrink: 0, animation: "slideUp 0.2s ease" }}>
          <div
            className="mx-4 mb-2 rounded-2xl p-4 shadow-xl"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="grid grid-cols-3 gap-3">
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
            onClick={() => setTrayOpen(p => !p)}
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

    </div>
  );
};

export default FamilyAgenda;
