import { useState, useRef, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Mic, Sparkles, ChevronLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptic";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import * as chrono from "chrono-node";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { createAppleEvent } from "@/lib/appleCalendar";
import { classifyText, guardAIType, type CaptureType } from "@/lib/intentClassifier";
import { normalizeCHDE, isSwissGermanLocale } from "@/lib/normalizeLocale";
import { warmDialectCache, getDbRules } from "@/lib/dialectRulesCache";

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

// Stable type definitions — labels resolved via t() at render time
const TYPE_DEFS: { id: CaptureType; icon: string; labelKey: string }[] = [
  { id: 'event',             icon: '📅', labelKey: 'ezCapture.typeEvent'    },
  { id: 'task',              icon: '✓',  labelKey: 'ezCapture.typeTask'     },
  { id: 'shopping',          icon: '🛒', labelKey: 'ezCapture.typeShopping' },
  { id: 'shopping_personal', icon: '🛒', labelKey: 'ezCapture.typeMyList'   },
  { id: 'reminder',          icon: '🔔', labelKey: 'ezCapture.typeReminder' },
  { id: 'journal',           icon: '📝', labelKey: 'ezCapture.typeJournal'  },
];

// Maps each CaptureType to its AI message translation key prefix
const AI_KEY: Record<CaptureType, string> = {
  event:             'aiEvent',
  task:              'aiTask',
  shopping:          'aiShopping',
  shopping_personal: 'aiPersonal',
  reminder:          'aiReminder',
  ritual:            'aiRitual',
  journal:           'aiJournal',
};

const LOCALE_TO_LANG: Record<string, string> = {
  en: 'en-US', de: 'de-DE', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT',
  'en-US': 'en-US', 'en-GB': 'en-GB',
  'de-DE': 'de-DE', 'de-CH': 'de-CH', 'de-AT': 'de-DE',
  'fr-FR': 'fr-FR', 'fr-CH': 'fr-FR', 'fr-BE': 'fr-FR',
  'it-IT': 'it-IT', 'it-CH': 'it-IT',
  'es-ES': 'es-ES', 'es-MX': 'es-MX', 'es-US': 'es-US',
  'pt-PT': 'pt-PT', 'pt-BR': 'pt-BR',
};

const LANG_NAMES: Record<string, string> = {
  en: 'English', de: 'German', 'de-CH': 'Swiss German',
  fr: 'French', it: 'Italian', es: 'Spanish', pt: 'Portuguese',
};

const getUserLocale = (): string => {
  const saved = localStorage.getItem('i18nextLng') || navigator.language || 'en';
  const base = saved.split('-')[0];
  return LOCALE_TO_LANG[saved] || LOCALE_TO_LANG[base] || 'en-US';
};

const getUserLanguageLabel = (): string => {
  const saved = localStorage.getItem('eazy-family-language') ||
    (localStorage.getItem('i18nextLng') || 'en').split('-')[0];
  return LANG_NAMES[saved] || 'English';
};

const cleanCaptureTitle = (raw: string): string => {
  let s = raw
    .replace(/^(please\s+)?(add|create|schedule|set\s+up|put|book|make|remind\s+me\s+to?)\s+/i, '')
    .replace(/^(an?\s+)?(task|reminder|event|note|appointment)\s*(to\s+|:\s*|for\s+)?/i, '')
    .replace(/\s+(on|to|in)\s+(my\s+|our\s+|the\s+)?(calendar|schedule|shopping\s+list|grocery\s+list|list)\b.*/i, '')
    .replace(/\s+for\s+(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|next\s+week)\s*$/i, '')
    .replace(/\s+on\s+(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\s*$/i, '')
    .replace(/\s+at\s+\d+\s*(am|pm|:\d+)?\s*$/i, '')
    .replace(/\s+\d{1,2}(:\d{2})?\s*(am|pm)\s*$/i, '')
    .trim();
  s = s.replace(/\s+(for|at|on|by|the|to|in|of)\s*$/i, '').trim();
  s = s.replace(/\s+(for|at|on|by|the|to|in|of)\s*$/i, '').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  const { t } = useTranslation();

  // Resolve type labels at render time so they follow the active language
  const TYPES = TYPE_DEFS.map(d => ({ ...d, label: t(d.labelKey) }));

  // Returns the AI strip message for the current type and user name
  const getAIMessage = (captureType: CaptureType): string => {
    const key = AI_KEY[captureType] || 'aiEvent';
    return userName
      ? t(`ezCapture.${key}Greet`, { name: userName })
      : t(`ezCapture.${key}`);
  };

  const [text, setText] = useState('');
  const setTextTracked = (val: string | ((prev: string) => string)) => {
    setText(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      latestTextRef.current = next;
      return next;
    });
  };
  const [type, setType] = useState<CaptureType>(defaultType ?? 'event');
  const [userLockedType, setUserLockedType] = useState<CaptureType | null>(defaultType ?? null);
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
  const isSingleShot = speech.isSingleShot;

  useEffect(() => {
    haptic('medium');
    setTimeout(() => textareaRef.current?.focus(), 150);
    if (isSwissGermanLocale()) warmDialectCache();
  }, []);

  useEffect(() => {
    if (!text.trim() || userLockedType) return;
    const t = isSwissGermanLocale() ? normalizeCHDE(text, getDbRules()) : text;
    setType(classifyText(t));
  }, [text]);

  const parseSnapshotRef = useRef<{ rawInput: string; aiResult: ParsedEntry } | null>(null);
  const handleParseAndPreviewRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const shouldRestartRef = useRef(false);
  const consecutiveFailsRef = useRef(0);
  const [intendingToListen, setIntendingToListen] = useState(false);
  const sessionBaseRef = useRef('');
  const latestTextRef = useRef('');

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
            toast({ title: t('ezCapture.micDenied'), description: t('ezCapture.micDeniedDesc') });
            return;
          }
          if (error === 'not-supported') {
            shouldRestartRef.current = false;
            setIntendingToListen(false);
            toast({ title: t('ezCapture.voiceUnavailable') });
            return;
          }
          if (error === 'transcription-failed') {
            shouldRestartRef.current = false;
            setIntendingToListen(false);
            toast({ title: t('ezCapture.transcriptionFailed'), description: t('ezCapture.transcriptionFailedDesc') });
            return;
          }
          consecutiveFailsRef.current++;
          if (consecutiveFailsRef.current >= 3) {
            shouldRestartRef.current = false;
            setIntendingToListen(false);
            toast({ title: t('ezCapture.voiceError'), description: t('ezCapture.voiceErrorDesc') });
          }
        },
        onEnd: () => {
          if (shouldRestartRef.current && !isSingleShot) {
            const delay = Capacitor.isNativePlatform() ? 700 : 300;
            setTimeout(run, delay);
          } else {
            shouldRestartRef.current = false;
            setIntendingToListen(false);
            if (latestTextRef.current.trim()) {
              setTimeout(() => handleParseAndPreviewRef.current?.(), 50);
            }
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

      const today = format(new Date(), 'yyyy-MM-dd');
      const dayOfWeek = format(new Date(), 'EEEE');
      const isSwissDE = isSwissGermanLocale();
      const userLanguage = getUserLanguageLabel();
      const langHint = isSwissDE
        ? `Swiss German (dialect pre-normalized to Standard German). Keep the title in German — do not translate to English.`
        : `${userLanguage}. Parse date/time expressions correctly for this language. Keep the title in the user's language — do not translate to English.`;

      const systemContext = `You are an NLP parser for a family scheduling app. Parse the user's input and return ONLY a valid JSON object — no markdown, no code fences, no explanation.

User's input language: ${langHint}

TYPE CLASSIFICATION — pick exactly one:
- "shopping": items to BUY for the family/shared list. Triggered by: "our shopping list", "the shopping list", "family list", "grocery list", or no possessive ("buy milk", "pick up bread").
- "shopping_personal": items to BUY for YOUR OWN personal list. Triggered by: "my shopping list", "my list", "my groceries", "for me". Example: "add wine to my list" → shopping_personal.
- "task": actions or chores to DO. Triggered by: clean, wash, water, organise, fix, repair, mow, vacuum, call, email, book, finish, return, tidy, take out, drop off — and their equivalents in ${userLanguage}. IMPORTANT: "Clean the terrace", "water the plants", "call dentist" are TASKS, not shopping items — even if phrased as "add X to my list".
- "event": time-specific appointment, meeting, or occurrence with a date/time.
- "reminder": "remind me to X".
- "ritual": habit, gratitude, or reflection entry.
- "journal": diary or feelings entry.

JSON fields:
- type: one of the types above
- title: ONLY the core subject — NEVER include date, time, location, command words, or list-destination phrases. Strip ALL of: leading verbs ("add", "create", "schedule", "remind me to", "put", "book" and equivalents in ${userLanguage}), trailing destinations ("to my shopping list", "to our shopping list", "to the list", "to my list", "on the calendar", "on the schedule" and equivalents in ${userLanguage}), date/time phrases. For type "shopping" or "shopping_personal", ALWAYS separate multiple items with commas. For type "task", separate multiple tasks with commas.
- date: "YYYY-MM-DD" or null. Resolve ALL date references including ordinals. Today is ${today} — resolve to the NEXT occurrence if the date has not yet passed, otherwise the following month.
- time: "HH:MM" 24h or null.
- endTime: "HH:MM" 24h or null
- location: string or null
- assignees: array of first names or null
- reminder: human-readable string or null
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
          messages: [{ role: 'user', content: isSwissGermanLocale() ? normalizeCHDE(latestTextRef.current.trim(), getDbRules()) : latestTextRef.current.trim() }],
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
    if (!latestTextRef.current.trim()) return;
    haptic('medium');
    if (isListening) stopListening();
    setStep('processing');

    const rawInput = latestTextRef.current.trim();
    const processText = isSwissGermanLocale() ? normalizeCHDE(rawInput, getDbRules()) : rawInput;

    const result = await parseWithAI();

    if (result && result.title) {
      if (result.type) {
        result.type = guardAIType(result.type, processText, result.date ?? null, result.time ?? null);
      }
      if (result.type && !userLockedType) setType(result.type);

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
      parseSnapshotRef.current = { rawInput, aiResult: { ...result, title: cleanedTitle, date: resolvedDate } };
    } else {
      const raw = processText;
      const chronoParsed = chrono.parse(raw, new Date())[0];
      const fallbackDate = chronoParsed ? format(chronoParsed.start.date(), 'yyyy-MM-dd') : null;
      const fallbackHour = chronoParsed?.start.get('hour');
      const fallbackMin = chronoParsed?.start.get('minute') ?? 0;
      const fallbackTime = fallbackHour != null
        ? `${String(fallbackHour).padStart(2, '0')}:${String(fallbackMin).padStart(2, '0')}`
        : null;
      const withoutDate = chronoParsed
        ? (raw.slice(0, chronoParsed.index) + raw.slice(chronoParsed.index + chronoParsed.text.length))
            .replace(/\b(am|pm|a\.m\.|p\.m\.|o'?clock)\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim()
        : raw;

      const hasPM = /\b(pm|p\.m\.)\b/i.test(raw);
      const correctedHour = fallbackHour != null && hasPM && fallbackHour < 12 ? fallbackHour + 12 : fallbackHour;
      const correctedTime = correctedHour != null
        ? `${String(correctedHour).padStart(2, '0')}:${String(fallbackMin).padStart(2, '0')}`
        : null;
      const fallbackType: CaptureType = userLockedType ?? classifyText(raw);
      setParsed({
        type: fallbackType,
        title: cleanCaptureTitle(withoutDate) || cleanCaptureTitle(raw),
        date: fallbackDate, time: correctedTime, endTime: null,
        location: null, assignees: null, reminder: null,
        notes: null, mood: null,
      });
    }
    setStep('preview');
    haptic('light');
  };

  handleParseAndPreviewRef.current = handleParseAndPreview;

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
        let appleCalendarId: string | undefined;
        if (entryType === 'event' && localStorage.getItem('eazy-apple-calendar-enabled') === 'true') {
          appleCalendarId = (await createAppleEvent({
            title: parsed.title,
            startDate,
            endDate,
            allDay: !parsed.time,
            location: parsed.location || undefined,
          })) ?? undefined;
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
          ...(appleCalendarId ? { appleCalendarId } : {}),
        };
        const existing = JSON.parse(localStorage.getItem('eazy-family-calendar-items') || '[]');
        localStorage.setItem('eazy-family-calendar-items', JSON.stringify([...existing, newEvent]));
        window.dispatchEvent(new CustomEvent('eazy-calendar-updated'));
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: entryType === 'reminder' ? t('ezCapture.toastReminderSet') : t('ezCapture.toastCalendarAdded') });
        onClose(); navigate('/app/calendar');

      } else if (entryType === 'task') {
        if (!user || !session) return;
        const taskItems = parsed.title.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
        const dueDate = parsed.date
          ? new Date(`${parsed.date}T${parsed.time ?? '00:00:00'}`).toISOString()
          : null;
        await Promise.all(taskItems.map(ti =>
          supabase.from('tasks').insert({ title: ti, type: 'task', user_id: user.id, completed: false, due_date: dueDate })
        ));
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: taskItems.length > 1
          ? t('ezCapture.toastTasksAdded', { count: taskItems.length })
          : t('ezCapture.toastTaskAdded')
        });
        onClose(); navigate('/app/lists');

      } else if (entryType === 'shopping' || entryType === 'shopping_personal') {
        if (!user || !session) return;
        const dbType = entryType === 'shopping_personal' ? 'shopping_personal' : 'shopping';
        const items = parsed.title.split(/[,;\n]|\band\b/i).map(s => s.trim()).filter(Boolean);
        await Promise.all(items.map(item =>
          supabase.from('tasks').insert({ title: item, type: dbType, user_id: user.id, completed: false })
        ));
        haptic('light'); setTimeout(() => haptic('light'), 150);
        const listLabel = t(dbType === 'shopping_personal' ? 'ezCapture.listPersonal' : 'ezCapture.listFamily');
        toast({ title: items.length === 1
          ? t('ezCapture.toastItemAdded', { list: listLabel })
          : t('ezCapture.toastItemsAdded', { count: items.length, list: listLabel })
        });
        onClose(); navigate('/app/lists?tab=shopping');

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
        toast({ title: t('ezCapture.toastRitualCaptured') });
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
        toast({ title: t('ezCapture.toastJournalSaved') });
        onClose(); navigate('/app/rituals');
      }

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
      toast({ title: t('ezCapture.toastError'), variant: 'destructive' });
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

  const activeType = userLockedType || parsed?.type || type;

  // Build textarea placeholder based on voice state
  const placeholder = isTranscribing
    ? t('ezCapture.placeholderTranscribing')
    : isListening
      ? (isSingleShot ? t('ezCapture.placeholderListeningSingleShot') : t('ezCapture.placeholderListening'))
      : t('ezCapture.placeholder');

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(28, 20, 18, 0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">

          {/* ── CAPTURE STEP ── */}
          {step === 'capture' && (
            <div className="rounded-3xl p-6 space-y-5" style={{ background: CARD, boxShadow: '0 8px 48px rgba(28,20,18,0.22)' }}>
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>{t('ezCapture.header')}</h2>
                <p className="text-sm" style={{ color: MUTED }}>{t('ezCapture.subheader')}</p>
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => setTextTracked(e.target.value)}
                  placeholder={placeholder}
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

              {/* Type pills */}
              <div className="flex flex-wrap gap-1">
                {TYPES.map(tp => (
                  <button
                    key={tp.id}
                    onClick={() => { setType(tp.id); setUserLockedType(tp.id); }}
                    className="flex items-center gap-0.5 rounded-full font-medium transition-all"
                    style={{
                      padding: '1px 8px',
                      fontSize: '11px',
                      lineHeight: '18px',
                      background: type === tp.id ? '#964735' : MUTED_BG,
                      color: type === tp.id ? '#FFFFFF' : MUTED,
                      border: `1px solid ${type === tp.id ? '#964735' : BORDER}`,
                    }}
                  >
                    <span style={{ fontSize: '10px' }}>{tp.icon}</span>
                    {tp.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-full text-sm font-semibold"
                  style={{ background: MUTED_BG, color: MUTED, border: `1px solid ${BORDER}` }}
                >
                  {t('ezCapture.cancel')}
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
                  {t('ezCapture.create')}
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
                <p className="font-bold" style={{ color: INK }}>{t('ezCapture.processingTitle')}</p>
                <p className="text-sm" style={{ color: MUTED }}>{t('ezCapture.processingSubtitle')}</p>
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
                  <h2 className="font-bold text-lg" style={{ color: INK }}>{t('ezCapture.confirm')}</h2>
                </div>

                {/* Type badge */}
                <div className="flex">
                  {(() => {
                    const tp = TYPES.find(tp => tp.id === activeType);
                    return tp ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background: '#964735', color: '#FFFFFF' }}>
                        <span style={{ fontSize: '12px' }}>{tp.icon}</span> {tp.label}
                      </span>
                    ) : null;
                  })()}
                </div>

                {/* "Did you mean?" */}
                {(() => {
                  if (userLockedType || !parsed) return null;
                  const rawForClassify = latestTextRef.current || text;
                  const suggested = classifyText(isSwissGermanLocale() ? normalizeCHDE(rawForClassify, getDbRules()) : rawForClassify);
                  if (suggested === activeType) return null;
                  const suggestedMeta = TYPES.find(tp => tp.id === suggested);
                  if (!suggestedMeta) return null;
                  return (
                    <div
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl text-xs"
                      style={{ background: '#FEF3EE', border: '1px solid #F5C8B8' }}
                    >
                      <span style={{ color: '#7A6660' }}>
                        {t('ezCapture.didYouMean')} <span style={{ fontWeight: 600, color: '#964735' }}>{suggestedMeta.icon} {suggestedMeta.label}</span>?
                      </span>
                      <button
                        onClick={() => {
                          setParsed(p => p ? { ...p, type: suggested } : p);
                          setType(suggested);
                          setUserLockedType(suggested);
                        }}
                        className="rounded-full px-2.5 py-1 font-semibold flex-shrink-0"
                        style={{ background: '#964735', color: '#fff', fontSize: '11px' }}
                      >
                        {t('ezCapture.switch')}
                      </button>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <div className="p-3 rounded-2xl" style={{ background: MUTED_BG }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: MUTED }}>{t('ezCapture.fieldTitle')}</p>
                    <textarea
                      rows={2}
                      value={parsed.title}
                      onChange={e => setParsed(p => p ? { ...p, title: e.target.value.replace(/\n/g, ' ') } : p)}
                      className="w-full bg-transparent outline-none font-semibold text-sm resize-none"
                      style={{ color: INK, lineHeight: '1.5' }}
                    />
                  </div>

                  {(activeType === 'event' || activeType === 'reminder') && (
                    <div className="p-3 rounded-2xl" style={{ background: MUTED_BG }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: MUTED }}>{t('ezCapture.fieldWhen')}</p>
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
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>{t('ezCapture.fieldLocation')}</p>
                      <p className="font-medium text-sm" style={{ color: INK }}>{parsed.location}</p>
                    </div>
                  )}

                  {parsed.assignees && parsed.assignees.length > 0 && (
                    <div className="p-3 rounded-2xl" style={{ background: MUTED_BG }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>{t('ezCapture.fieldWith')}</p>
                      <p className="font-medium text-sm" style={{ color: INK }}>{parsed.assignees.join(', ')}</p>
                    </div>
                  )}

                  {parsed.reminder && (
                    <div className="p-3 rounded-2xl" style={{ background: MUTED_BG }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>{t('ezCapture.fieldReminder')}</p>
                      <p className="font-medium text-sm" style={{ color: INK }}>{parsed.reminder}</p>
                    </div>
                  )}

                  {parsed.mood && (
                    <div className="p-3 rounded-2xl" style={{ background: MUTED_BG }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>{t('ezCapture.fieldMood')}</p>
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
                  {t('ezCapture.confirmSave')}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* AI message strip */}
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
            {step === 'capture' && `"${userName ? t('ezCapture.aiCaptureGreet', { name: userName }) : t('ezCapture.aiCapture')}"`}
            {step === 'processing' && `"${t('ezCapture.aiProcessing')}"`}
            {step === 'preview' && parsed && `"${getAIMessage(activeType)}"`}
          </p>
        </div>
      </div>
    </div>
  );
};
