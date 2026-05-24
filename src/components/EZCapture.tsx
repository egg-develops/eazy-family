import { useState, useRef, useEffect } from "react";
import { Mic, Sparkles, ChevronLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptic";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import * as chrono from "chrono-node";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

type CaptureType = 'event' | 'task' | 'shopping' | 'reminder' | 'ritual' | 'journal';
type Step = 'capture' | 'processing' | 'preview';

interface EZCaptureProps {
  onClose: () => void;
  defaultType?: CaptureType;
}

interface ParsedEntry {
  type: CaptureType;
  title: string;
  date: string | null;
  time: string | null;
  endTime: string | null;
  location: string | null;
  assignees: string[] | null;
  reminder: string | null;
  notes: string | null;
  mood: string | null;
}

const CARD = 'hsl(var(--card))';
const MUTED_BG = 'hsl(var(--muted))';
const BORDER = 'hsl(var(--border))';
const INK = 'hsl(var(--foreground))';
const MUTED = 'hsl(var(--muted-foreground))';

const TYPES: { id: CaptureType; label: string; icon: string }[] = [
  { id: 'event',    label: 'Event',    icon: '📅' },
  { id: 'task',     label: 'Task',     icon: '✓'  },
  { id: 'shopping', label: 'Shopping', icon: '🛒' },
  { id: 'reminder', label: 'Reminder', icon: '🔔' },
  { id: 'journal',  label: 'Journal',  icon: '📝' },
];

const LOCALE_TO_LANG: Record<string, string> = {
  en: 'en-US', de: 'de-DE', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT',
  'en-US': 'en-US', 'en-GB': 'en-GB',
  'de-DE': 'de-DE', 'de-CH': 'de-DE', 'de-AT': 'de-DE',
  'fr-FR': 'fr-FR', 'fr-CH': 'fr-FR', 'fr-BE': 'fr-FR',
  'it-IT': 'it-IT', 'it-CH': 'it-IT',
  'es-ES': 'es-ES', 'es-MX': 'es-MX', 'es-US': 'es-US',
  'pt-PT': 'pt-PT', 'pt-BR': 'pt-BR',
};

const AI_MESSAGES: Record<CaptureType, (name: string) => string> = {
  event:    (n) => n ? `I'll add this to your calendar, ${n}.` : "I'll add this to your calendar.",
  task:     (n) => n ? `Got it, ${n}. Adding to your task list.` : "Got it. Adding to your task list.",
  shopping: (n) => n ? `On the list, ${n}. Anything else?` : "On the list. Anything else?",
  reminder: (n) => n ? `I'll make sure you don't forget, ${n}.` : "I'll make sure you don't forget.",
  ritual:   (n) => n ? `Beautiful ritual, ${n}. I'll track this.` : "Beautiful ritual. I'll track this.",
  journal:  (n) => n ? `Your thoughts are safe with me, ${n}.` : "Your thoughts are safe with me.",
};

const getUserLocale = (): string => {
  const saved = localStorage.getItem('i18nextLng') || navigator.language || 'en';
  const base = saved.split('-')[0];
  return LOCALE_TO_LANG[saved] || LOCALE_TO_LANG[base] || 'en-US';
};

const cleanCaptureTitle = (raw: string): string => {
  const cleaned = raw
    .replace(/^(please\s+)?(add|create|schedule|set\s+up|put|book|make|remind\s+me\s+to?)\s+/i, '')
    // Strip type-word prefixes the AI may leave: "task to", "a reminder to", "event for", etc.
    .replace(/^(an?\s+)?(task|reminder|event|note|appointment)\s*(to\s+|:\s*|for\s+)?/i, '')
    .replace(/\s+(on|to|in)\s+(the\s+)?(calendar|schedule|shopping\s+list|grocery\s+list|list)\b.*/i, '')
    .replace(/\s+for\s+(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|next\s+week)\s*$/i, '')
    .replace(/\s+on\s+(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\s*$/i, '')
    .replace(/\s+at\s+\d+\s*(am|pm|:\d+)?\s*$/i, '')
    .replace(/\s+(for|at|on|by|the)\s*$/i, '')
    .trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const getUserFirstName = (): string => {
  try {
    const s = localStorage.getItem('eazy-family-onboarding');
    if (s) {
      const d = JSON.parse(s);
      const fn = (d.firstName || d.name || '') as string;
      return fn.split(' ')[0] || '';
    }
  } catch {}
  return '';
};

export const EZCapture = ({ onClose, defaultType }: EZCaptureProps) => {
  const [text, setText] = useState('');
  const setTextTracked = (val: string | ((prev: string) => string)) => {
    setText(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      latestTextRef.current = next;
      return next;
    });
  };
  const [type, setType] = useState<CaptureType>(defaultType ?? 'event');
  const [step, setStep] = useState<Step>('capture');
  const [parsed, setParsed] = useState<ParsedEntry | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const userName = getUserFirstName();
  const speech = useSpeechRecognition();
  const isListening = speech.isListening;
  const isTranscribing = speech.isTranscribing;

  useEffect(() => {
    haptic('medium');
    setTimeout(() => textareaRef.current?.focus(), 150);
  }, []);

  // Auto-detect type from keywords as user types
  useEffect(() => {
    if (!text.trim()) return;
    const lower = text.toLowerCase();
    if (/\b(buy|get|pick up|need|grab)\b/.test(lower) || /\b(add|put)\b.+\b(shopping list|grocery list|groceries|list)\b/.test(lower)) { setType('shopping'); return; }
    if (/\b(remind|don't forget|remember)\b/.test(lower)) { setType('reminder'); return; }
    if (/\b(feel|journal|today i|grateful|reflection|dear diary)\b/.test(lower)) { setType('journal'); return; }
    if (/\b(task|todo|to-do|finish|complete)\b/.test(lower)) { setType('task'); return; }
    if (/\b(tomorrow|today|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+am|\d+pm|at \d)\b/.test(lower)) { setType('event'); }
  }, [text]);

  const parseSnapshotRef = useRef<{ rawInput: string; aiResult: ParsedEntry } | null>(null);

  const shouldRestartRef = useRef(false);
  const consecutiveFailsRef = useRef(0);
  const [intendingToListen, setIntendingToListen] = useState(false);
  // Tracks text present at the start of a speech session so partial results
  // can be displayed with replace semantics (each partial is the full session transcript)
  const sessionBaseRef = useRef('');
  const latestTextRef = useRef('');

  // Stop voice and clean up on unmount — prevents orphaned sessions from
  // corrupting iOS audio state after the modal closes
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      speech.stop();
    };
  }, []);

  const stopListening = () => {
    shouldRestartRef.current = false;
    consecutiveFailsRef.current = 0;
    setIntendingToListen(false);
    speech.stop();
  };

  const startListening = () => {
    shouldRestartRef.current = true;
    consecutiveFailsRef.current = 0;
    setIntendingToListen(true);
    haptic('light');

    const run = () => {
      if (!shouldRestartRef.current) return;
      // Snapshot current text so replace-semantics can layer the session transcript on top
      sessionBaseRef.current = latestTextRef.current.trim();
      speech.start({
        lang: getUserLocale(),
        onResult: (transcript) => {
          consecutiveFailsRef.current = 0;
          const base = sessionBaseRef.current;
          setTextTracked(base ? `${base} ${transcript}` : transcript);
        },
        onError: (error) => {
          if (error === 'not-allowed') {
            shouldRestartRef.current = false;
            setIntendingToListen(false);
            toast({ title: 'Microphone access denied', description: 'Allow microphone access in Settings.' });
            return;
          }
          if (error === 'not-supported') {
            shouldRestartRef.current = false;
            setIntendingToListen(false);
            toast({ title: 'Voice input not supported in this browser' });
            return;
          }
          consecutiveFailsRef.current++;
          if (consecutiveFailsRef.current >= 3) {
            shouldRestartRef.current = false;
            setIntendingToListen(false);
            toast({ title: 'Voice unavailable', description: 'Tap the mic to try again.' });
          }
        },
        onEnd: () => {
          if (shouldRestartRef.current) {
            setTimeout(run, 300);
          } else {
            setIntendingToListen(false);
          }
        },
      });
    };

    run();
  };

  const parseWithAI = async (): Promise<ParsedEntry | null> => {
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 15000));
    return Promise.race([parseWithAIInner(), timeout]);
  };

  const parseWithAIInner = async (): Promise<ParsedEntry | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      // Bug fix: use local date, not UTC
      const today = format(new Date(), 'yyyy-MM-dd');
      const dayOfWeek = format(new Date(), 'EEEE');
      const systemContext = `You are an NLP parser for a family scheduling app. Parse the user's input and return ONLY a valid JSON object — no markdown, no code fences, no explanation.

JSON fields:
- type: "event"|"task"|"shopping"|"reminder"|"ritual"|"journal"
- title: ONLY the subject/topic — NEVER include date, time, location, or command words. Strip ALL date/time phrases including ordinals AND strip leading action verbs / task command words ("add", "add task to", "remind me to", "create", "schedule", "task to", "task:"). Examples: "Doctor appointment next Thursday at 4pm" → "Doctor appointment". "Video appointment for the 29th at 3pm" → "video appointment". "Add milk and eggs to the shopping list" → "milk, eggs". "Add task to return library books on Wednesday" → "Return library books". "Remind me to call dentist tomorrow" → "Call dentist". Keep it short. For type "shopping", ALWAYS separate each item with a comma — even if the input has no commas. Example: "oatmeal bananas raisins" → "oatmeal, bananas, raisins".
- date: "YYYY-MM-DD" or null. Resolve ALL date references including ordinals like "the 29th", "29th", "May 5th". Today is ${today} — resolve to the NEXT occurrence if the date has not yet passed in the current month, otherwise the following month.
- time: "HH:MM" 24h or null. "4 o'clock pm" → "16:00", "half past 3" → "15:30", "3pm" → "15:00".
- endTime: "HH:MM" 24h or null
- location: string or null
- assignees: array of first names or null
- reminder: human-readable string like "1 week before" or null
- notes: string or null
- mood: string or null (journal only)

Today is ${today} (${dayOfWeek}). Return ONLY the raw JSON object.`;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const response = await fetch(`${supabaseUrl}/functions/v1/eazy-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text.trim() }],
          systemPrompt: systemContext,
        }),
      });

      if (!response.ok || !response.body) return null;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) fullContent += content;
            } catch {}
          }
        }
      }

      const cleaned = fullContent.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleaned) as ParsedEntry;
    } catch {
      return null;
    }
  };

  const handleParseAndPreview = async () => {
    if (!text.trim()) return;
    haptic('medium');
    if (isListening) stopListening();
    setStep('processing');

    const result = await parseWithAI();

    if (result && result.title) {
      if (result.type) setType(result.type);

      // Post-process: if a date phrase is still present in the AI's title (e.g. "the 29th"),
      // extract it via chrono and use it as the date (overriding a wrong AI date).
      let cleanedTitle = cleanCaptureTitle(result.title);
      let resolvedDate = result.date;
      const now = new Date();
      const residualDate = chrono.parse(cleanedTitle, now)[0];
      if (residualDate) {
        resolvedDate = format(residualDate.start.date(), 'yyyy-MM-dd');
        cleanedTitle = (
          cleanedTitle.slice(0, residualDate.index) +
          cleanedTitle.slice(residualDate.index + residualDate.text.length)
        )
          .replace(/\s+(for|at|on|by|the)\s*$/i, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        if (!cleanedTitle) cleanedTitle = cleanCaptureTitle(result.title);
      }

      setParsed({ ...result, title: cleanedTitle, date: resolvedDate });
      parseSnapshotRef.current = { rawInput: text.trim(), aiResult: { ...result, title: cleanedTitle, date: resolvedDate } };
    } else {
      // Fallback: chrono-node extracts date/time; strip the matched date text from the title
      const raw = text.trim();
      const chronoParsed = chrono.parse(raw, new Date())[0];
      const fallbackDate = chronoParsed ? format(chronoParsed.start.date(), 'yyyy-MM-dd') : null;
      const fallbackHour = chronoParsed?.start.get('hour');
      const fallbackMin = chronoParsed?.start.get('minute') ?? 0;
      const fallbackTime = fallbackHour != null
        ? `${String(fallbackHour).padStart(2, '0')}:${String(fallbackMin).padStart(2, '0')}`
        : null;
      // Remove the date/time substring chrono matched so it doesn't end up in the title.
      // Also strip orphaned time words (e.g. "pm" left after chrono pulls "at 4 o'clock").
      const withoutDate = chronoParsed
        ? (raw.slice(0, chronoParsed.index) + raw.slice(chronoParsed.index + chronoParsed.text.length))
            .replace(/\b(am|pm|a\.m\.|p\.m\.|o'?clock)\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim()
        : raw;

      // chrono misreads "X o'clock pm" as AM — fix up if original text had pm/p.m.
      const hasPM = /\b(pm|p\.m\.)\b/i.test(raw);
      const correctedHour = fallbackHour != null && hasPM && fallbackHour < 12 ? fallbackHour + 12 : fallbackHour;
      const correctedTime = correctedHour != null
        ? `${String(correctedHour).padStart(2, '0')}:${String(fallbackMin).padStart(2, '0')}`
        : null;
      setParsed({
        type,
        title: cleanCaptureTitle(withoutDate) || cleanCaptureTitle(raw),
        date: fallbackDate, time: correctedTime, endTime: null,
        location: null, assignees: null, reminder: null,
        notes: null, mood: null,
      });
    }
    setStep('preview');
    haptic('light');
  };

  const handleConfirm = async () => {
    if (!parsed) return;
    haptic('medium');
    const entryType = parsed.type || type;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (entryType === 'event' || entryType === 'reminder') {
        let startDate: Date;
        if (parsed.date && parsed.time) {
          startDate = new Date(`${parsed.date}T${parsed.time}`);
        } else if (parsed.date) {
          startDate = new Date(`${parsed.date}T00:00:00`);
        } else {
          startDate = new Date();
        }
        let endDate = new Date(startDate.getTime() + 3600000);
        if (parsed.endTime && parsed.date) {
          const ed = new Date(`${parsed.date}T${parsed.endTime}`);
          if (ed > startDate) endDate = ed;
        }
        const newEvent = {
          id: crypto.randomUUID(),
          title: parsed.title,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          ...(entryType === 'reminder' ? { dueDate: startDate.toISOString(), completed: false } : {}),
          allDay: !parsed.time,
          type: entryType,
          color: entryType === 'reminder' ? '#6E8FE5' : '#D97B66',
          location: parsed.location || undefined,
          notes: parsed.notes || undefined,
        };
        const existing = JSON.parse(localStorage.getItem('eazy-family-calendar-items') || '[]');
        localStorage.setItem('eazy-family-calendar-items', JSON.stringify([...existing, newEvent]));
        window.dispatchEvent(new CustomEvent('eazy-calendar-updated'));
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: entryType === 'reminder' ? 'Reminder set' : '✓ Added to Calendar' });
        onClose(); navigate('/app/calendar');

      } else if (entryType === 'task') {
        if (!user || !session) return;
        await supabase.from('tasks').insert({
          title: parsed.title,
          type: 'task',
          user_id: user.id,
          completed: false,
          due_date: parsed.date
            ? new Date(`${parsed.date}T${parsed.time ?? '00:00:00'}`).toISOString()
            : null,
        });
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: '✓ Task added' });
        onClose(); navigate('/app/todos');

      } else if (entryType === 'shopping') {
        if (!user || !session) return;
        const items = parsed.title.split(/[,;\n]|\band\b/i).map(s => s.trim()).filter(Boolean);
        await Promise.all(items.map(item =>
          supabase.from('tasks').insert({ title: item, type: 'shopping', user_id: user.id, completed: false })
        ));
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: `✓ ${items.length} item${items.length > 1 ? 's' : ''} added` });
        onClose(); navigate('/app/shopping');

      } else if (entryType === 'ritual') {
        const entry = {
          id: crypto.randomUUID(),
          title: parsed.title,
          date: new Date().toISOString(),
          type: 'ritual',
          notes: parsed.notes || undefined,
        };
        const ex = JSON.parse(localStorage.getItem('eazy-rituals') || '[]');
        localStorage.setItem('eazy-rituals', JSON.stringify([entry, ...ex]));
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: '✓ Ritual captured' });
        onClose(); navigate('/app/rituals');

      } else if (entryType === 'journal') {
        const entry = {
          id: crypto.randomUUID(),
          text: parsed.title + (parsed.notes ? `\n\n${parsed.notes}` : ''),
          date: new Date().toISOString(),
          mood: parsed.mood || undefined,
        };
        const ex = JSON.parse(localStorage.getItem('eazy-journal-entries') || '[]');
        localStorage.setItem('eazy-journal-entries', JSON.stringify([entry, ...ex]));
        window.dispatchEvent(new CustomEvent('eazy-journal-updated'));
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: '✓ Journal entry saved' });
        onClose(); navigate('/app/rituals');
      }

      // Fire-and-forget telemetry — never blocks or surfaces errors to the user
      if (parseSnapshotRef.current && session) {
        const snap = parseSnapshotRef.current;
        const final = parsed;
        const wasCorrected =
          snap.aiResult.title !== final.title ||
          snap.aiResult.type !== final.type ||
          snap.aiResult.date !== final.date ||
          snap.aiResult.time !== final.time;
        supabase.from('parse_events').insert({
          user_id: session.user.id,
          raw_input: snap.rawInput,
          ai_result: snap.aiResult,
          final_result: final,
          was_corrected: wasCorrected,
          locale: localStorage.getItem('eazy-family-language') || 'en',
        }).then(() => {});
      }
    } catch {
      toast({ title: 'Something went wrong', variant: 'destructive' });
    }
  };

  const formatPreviewDate = (date: string | null, time: string | null): string | null => {
    if (!date) return null;
    try {
      const d = new Date(`${date}T${time || '00:00'}`);
      if (time) return format(d, 'EEE, MMM d · h:mm a');
      return format(d, 'EEE, MMM d');
    } catch { return date; }
  };

  const activeType = parsed?.type || type;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(28, 20, 18, 0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {/* Center card — stopPropagation only on the card itself, not the whole flex area */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">

          {/* ── CAPTURE STEP ── */}
          {step === 'capture' && (
            <div className="rounded-3xl p-6 space-y-5" style={{ background: CARD, boxShadow: '0 8px 48px rgba(28,20,18,0.22)' }}>
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>What's on your mind?</h2>
                <p className="text-sm" style={{ color: MUTED }}>Capture thoughts — Schedule tasks</p>
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => setTextTracked(e.target.value)}
                  placeholder={isTranscribing ? "Transcribing your voice…" : isListening ? "Recording… tap mic again to stop & transcribe" : "Speak or type anything — event, task, note, reminder…"}
                  rows={4}
                  className="w-full resize-none rounded-2xl p-4 pr-12 text-sm outline-none"
                  style={{
                    background: MUTED_BG,
                    border: `1.5px solid ${text ? '#D97B66' : BORDER}`,
                    color: INK,
                    lineHeight: '1.6',
                    transition: 'border-color 0.2s',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParseAndPreview(); }}
                />
                {/* Mic button — pulse when recording, spinner when transcribing */}
                <div className="absolute bottom-3 right-3 w-7 h-7">
                  {(intendingToListen || isListening) && !isTranscribing && (
                    <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(150,71,53,0.35)' }} />
                  )}
                  <button
                    onClick={(intendingToListen || isListening) ? stopListening : startListening}
                    disabled={isTranscribing}
                    className="relative w-7 h-7 rounded-full flex items-center justify-center transition-all"
                    style={{ background: (intendingToListen || isListening || isTranscribing) ? '#D97B66' : '#964735' }}
                  >
                    {isTranscribing
                      ? <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      : <Mic className="w-3.5 h-3.5 text-white" />
                    }
                  </button>
                </div>
              </div>

              {/* Type chips */}
              <div className="flex flex-wrap gap-1">
                {TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className="flex items-center gap-0.5 rounded-full font-medium transition-all"
                    style={{
                      padding: '1px 8px',
                      fontSize: '11px',
                      lineHeight: '18px',
                      background: type === t.id ? '#964735' : MUTED_BG,
                      color: type === t.id ? '#FFFFFF' : MUTED,
                      border: `1px solid ${type === t.id ? '#964735' : BORDER}`,
                    }}
                  >
                    <span style={{ fontSize: '10px' }}>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-full text-sm font-semibold"
                  style={{ background: MUTED_BG, color: MUTED, border: `1px solid ${BORDER}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleParseAndPreview}
                  disabled={!text.trim()}
                  className="flex-1 py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: text.trim() ? '#964735' : '#DAC1BB',
                    color: '#FFFFFF',
                    cursor: text.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  Create
                </button>
              </div>
            </div>
          )}

          {/* ── PROCESSING STEP ── */}
          {step === 'processing' && (
            <div className="rounded-3xl p-8 flex flex-col items-center gap-5" style={{ background: CARD, boxShadow: '0 8px 48px rgba(28,20,18,0.22)' }}>
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full animate-spin" style={{ border: `3px solid ${MUTED_BG}`, borderTopColor: '#964735' }} />
                <img src="/logo.png" alt="" className="absolute inset-0 m-auto w-8 h-8 object-contain" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold" style={{ color: INK }}>Parsing with AI…</p>
                <p className="text-sm" style={{ color: MUTED }}>Understanding your intent</p>
              </div>
            </div>
          )}

          {/* ── PREVIEW STEP ── */}
          {step === 'preview' && parsed && (
            <div className="rounded-3xl overflow-hidden" style={{ background: CARD, boxShadow: '0 8px 48px rgba(28,20,18,0.22)' }}>
              <div className="px-6 pt-6 pb-4 space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep('capture')}
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: MUTED_BG }}
                  >
                    <ChevronLeft className="w-4 h-4" style={{ color: MUTED }} />
                  </button>
                  <h2 className="font-bold text-lg" style={{ color: INK }}>Confirm</h2>
                </div>

                {/* Type badge */}
                <div className="flex">
                  {(() => {
                    const t = TYPES.find(t => t.id === activeType);
                    return t ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background: '#964735', color: '#FFFFFF' }}>
                        <span style={{ fontSize: '12px' }}>{t.icon}</span> {t.label}
                      </span>
                    ) : null;
                  })()}
                </div>

                <div className="space-y-2">
                  {/* Editable title — textarea so long names wrap rather than overflow */}
                  <div className="p-3 rounded-2xl" style={{ background: MUTED_BG }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Title</p>
                    <textarea
                      rows={2}
                      value={parsed.title}
                      onChange={e => setParsed(p => p ? { ...p, title: e.target.value.replace(/\n/g, ' ') } : p)}
                      className="w-full bg-transparent outline-none font-semibold text-sm resize-none"
                      style={{ color: INK, lineHeight: '1.5' }}
                    />
                  </div>

                  {/* Editable date + time — always shown for event/reminder, shown when parsed for others */}
                  {(activeType === 'event' || activeType === 'reminder' || parsed.date || parsed.time) && (
                    <div className="p-3 rounded-2xl" style={{ background: MUTED_BG }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: MUTED }}>When</p>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={parsed.date ?? ''}
                          onChange={e => setParsed(p => p ? { ...p, date: e.target.value || null } : p)}
                          className="flex-1 rounded-xl px-3 py-2 text-sm outline-none border"
                          style={{ background: CARD, color: INK, borderColor: BORDER }}
                        />
                        <input
                          type="time"
                          value={parsed.time ?? ''}
                          onChange={e => setParsed(p => p ? { ...p, time: e.target.value || null } : p)}
                          className="flex-1 rounded-xl px-3 py-2 text-sm outline-none border"
                          style={{ background: CARD, color: INK, borderColor: BORDER }}
                        />
                      </div>
                    </div>
                  )}

                  {parsed.location && (
                    <div className="p-3 rounded-2xl" style={{ background: MUTED_BG }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>Location</p>
                      <p className="font-medium text-sm" style={{ color: INK }}>{parsed.location}</p>
                    </div>
                  )}

                  {parsed.assignees && parsed.assignees.length > 0 && (
                    <div className="p-3 rounded-2xl" style={{ background: MUTED_BG }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>With</p>
                      <p className="font-medium text-sm" style={{ color: INK }}>{parsed.assignees.join(', ')}</p>
                    </div>
                  )}

                  {parsed.reminder && (
                    <div className="p-3 rounded-2xl" style={{ background: MUTED_BG }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>Reminder</p>
                      <p className="font-medium text-sm" style={{ color: INK }}>{parsed.reminder}</p>
                    </div>
                  )}

                  {parsed.mood && (
                    <div className="p-3 rounded-2xl" style={{ background: MUTED_BG }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>Mood</p>
                      <p className="font-medium text-sm" style={{ color: INK }}>{parsed.mood}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 pb-6">
                <button
                  onClick={handleConfirm}
                  className="w-full py-3.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: '#964735', color: '#FFFFFF' }}
                >
                  <Check className="w-4 h-4" />
                  Confirm & Save
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* AI message strip above nav */}
      <div onClick={e => e.stopPropagation()} className="px-4 pb-28">
        <div
          className="px-4 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <img
            src="/logo.png"
            alt=""
            className="w-8 h-8 rounded-full flex-shrink-0 object-contain"
            style={{ background: '#D97B66', padding: '3px' }}
          />
          <p className="text-sm" style={{ color: MUTED, fontStyle: 'italic' }}>
            {step === 'capture' && `"${userName ? `Hey ${userName}, speak` : 'Speak'} or type anything — I'll figure out the rest."`}
            {step === 'processing' && '"Reading between the lines…"'}
            {step === 'preview' && parsed && `"${AI_MESSAGES[activeType](userName)}"`}
          </p>
        </div>
      </div>
    </div>
  );
};
