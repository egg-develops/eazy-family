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
import { initialLockedType } from "@/lib/ezCaptureType";
import { normalizeCHDE, isSwissGermanLocale } from "@/lib/normalizeLocale";
import { warmDialectCache, getDbRules } from "@/lib/dialectRulesCache";
import {
  buildCalendarCaptureItem,
  buildShoppingCaptureRows,
  buildTaskCaptureRows,
  isFeatureHelpQuery,
  resolveAssignees,
  type EZParsedEntry,
  type FamilyMemberLite,
} from "@/lib/ezCapturePersistence";

type Step = 'capture' | 'processing' | 'preview' | 'guide';

interface EZCaptureProps {
  onClose: () => void;
  defaultType?: CaptureType;
}

type ParsedEntry = EZParsedEntry;

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
    // EN: leading command words
    .replace(/^(please\s+)?(add|create|schedule|set\s+up|put|book|make|remind\s+me\s+to?)\s+/i, '')
    // DE: leading command words
    .replace(/^(bitte\s+)?(hinzufügen|erstellen|planen|eintragen|erinnere\s+mich\s+an?)\s+/i, '')
    // FR: leading command words
    .replace(/^(s'il\s+te\s+plaît\s+)?(ajouter|créer|planifier|mettre|rappelle-moi\s+de?)\s+/i, '')
    // IT: leading command words
    .replace(/^(per\s+favore\s+)?(aggiungere|creare|pianificare|mettere|ricordami\s+di?)\s+/i, '')
    // ES: leading command words
    .replace(/^(por\s+favor\s+)?(añadir|agregar|crear|planificar|poner|recuérdame\s+que?)\s+/i, '')
    // PT: leading command words
    .replace(/^(por\s+favor\s+)?(adicionar|criar|agendar|colocar|lembra-me\s+de?)\s+/i, '')
    // EN: leading type words
    .replace(/^(an?\s+)?(task|reminder|event|note|appointment)\s*(to\s+|:\s*|for\s+)?/i, '')
    // EN: trailing list destinations
    .replace(/\s+(on|to|in)\s+(my\s+|our\s+|the\s+)?(calendar|schedule|shopping\s+list|grocery\s+list|list)\b.*/i, '')
    // DE: trailing list destinations
    .replace(/\s+(auf\s+(die|meine|unsere)\s+)?(einkaufsliste|liste|kalender)\b.*/i, '')
    // FR: trailing list destinations
    .replace(/\s+(à\s+(ma|notre|la)\s+)?(liste|liste\s+de\s+courses|calendrier|agenda)\b.*/i, '')
    // IT: trailing list destinations
    .replace(/\s+(alla\s+(mia|nostra|la)\s+)?(lista|lista\s+della\s+spesa|calendario|agenda)\b.*/i, '')
    // ES: trailing list destinations
    .replace(/\s+(a\s+(mi|nuestra|la)\s+)?(lista|lista\s+de\s+compras|calendario|agenda)\b.*/i, '')
    // PT: trailing list destinations
    .replace(/\s+(à\s+(minha|nossa|a)\s+)?(lista|lista\s+de\s+compras|calendário|agenda)\b.*/i, '')
    // EN: trailing date/time phrases
    .replace(/\s+for\s+(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|next\s+week)\s*$/i, '')
    .replace(/\s+on\s+(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\s*$/i, '')
    .replace(/\s+at\s+\d+\s*(am|pm|:\d+)?\s*$/i, '')
    .replace(/\s+\d{1,2}(:\d{2})?\s*(am|pm)\s*$/i, '')
    .trim();
  // Strip trailing prepositions (EN + common romance lang equivalents)
  s = s.replace(/\s+(for|at|on|by|the|to|in|of|pour|pour|par|le|la|les|per|por|para|von|für|an|auf)\s*$/i, '').trim();
  s = s.replace(/\s+(for|at|on|by|the|to|in|of|pour|par|le|la|les|per|por|para|von|für|an|auf)\s*$/i, '').trim();
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

  const [guideQuestion, setGuideQuestion] = useState('');
  const [guideAnswer, setGuideAnswer] = useState('');
  const [guideStreaming, setGuideStreaming] = useState(false);

  const [text, setText] = useState('');
  const setTextTracked = (val: string | ((prev: string) => string)) => {
    setText(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      latestTextRef.current = next;
      return next;
    });
  };
  const [type, setType] = useState<CaptureType>(defaultType ?? 'event');
  // defaultType is a per-screen STARTING hint, not a lock — see initialLockedType.
  // Locking from defaultType disabled auto-classification entirely (the Home EZ
  // orb passes 'event', which pinned every capture to a calendar Event).
  const [userLockedType, setUserLockedType] = useState<CaptureType | null>(
    initialLockedType(defaultType)
  );
  const [step, setStep] = useState<Step>('capture');
  const [parsed, setParsed] = useState<ParsedEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The tap on the EZ orb that opens this overlay also produces a synthesized
  // `click` a few ms later. Because the overlay mounts under that same point,
  // that click lands on the backdrop and would instantly close it (open→close
  // in one frame, so the window never visibly appears). Ignore backdrop-dismiss
  // clicks that arrive within this window — a real dismiss tap can't be that fast.
  const openedAtRef = useRef(Date.now());
  const handleBackdropClose = () => {
    if (Date.now() - openedAtRef.current < 400) return;
    onClose();
  };
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
    if (isSwissGermanLocale()) warmDialectCache();
  }, []);

  // Family roster — so voice assignees ("assign to Mia") resolve to member ids.
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberLite[]>([]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: mine } = await supabase
          .from('family_members').select('family_id')
          .eq('user_id', user.id).eq('is_active', true).maybeSingle();
        if (cancelled || !mine?.family_id) return;
        setFamilyId(mine.family_id);
        const { data } = await supabase
          .from('family_members').select('user_id, full_name')
          .eq('family_id', mine.family_id).eq('is_active', true);
        if (cancelled || !data) return;
        setFamilyMembers(data.filter(m => m.user_id).map(m => ({ user_id: m.user_id as string, name: m.full_name || '' })));
      } catch { /* assignment is best-effort; never block capture */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Find (or create) a shared family list to drop assigned tasks into, so they
  // render as rows with an assignee pill instead of as an empty list header.
  const ensureFamilyTaskList = async (famId: string, uid: string): Promise<string | null> => {
    try {
      const { data: existing } = await supabase
        .from('tasks').select('id')
        .eq('type', 'shared').eq('family_id', famId).is('parent_id', null)
        .order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (existing?.id) return existing.id;
      const { data: created } = await supabase
        .from('tasks')
        .insert({ title: 'Family To-Dos 🏡', type: 'shared', user_id: uid, family_id: famId, completed: false, visible_to: 'family' })
        .select('id').single();
      return created?.id ?? null;
    } catch { return null; }
  };

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
  // Native speech recognition can revise earlier words downward on its final
  // result, making the last partial shorter than what the user saw mid-speech.
  // Track the longest transcript seen in the session and use that on auto-process.
  const longestTranscriptRef = useRef('');
  // Continuous (journaling) mode: long-form entries have natural pauses to
  // think. Single-shot engines (native + Whisper) end on the first pause, which
  // truncates the entry — so in continuous mode we transparently restart the
  // recognizer on each natural end and only finish when the user taps stop.
  const continuousRef = useRef(false);

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
    longestTranscriptRef.current = latestTextRef.current;
    // Journaling captures long-form thoughts with pauses — keep listening across
    // pauses until the user explicitly stops, instead of cutting off after one
    // utterance the way quick capture does.
    continuousRef.current = defaultType === 'journal' || type === 'journal';
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
          const full = base ? `${base} ${transcript}` : transcript;
          if (full.length > longestTranscriptRef.current.length) {
            longestTranscriptRef.current = full;
          }
          setTextTracked(full);
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
          // Restart on natural end when in continuous mode (journaling) even on
          // single-shot engines — a pause must not end the entry. The session
          // only truly ends when the user taps stop (which clears
          // shouldRestartRef before calling speech.stop()).
          if (shouldRestartRef.current && (!isSingleShot || continuousRef.current)) {
            const delay = Capacitor.isNativePlatform() ? 700 : 300;
            setTimeout(run, delay);
          } else {
            shouldRestartRef.current = false;
            setIntendingToListen(false);
            // Use the longest transcript seen — native speech recognition can
            // revise its final result to be shorter than earlier partials.
            const best = longestTranscriptRef.current.length > latestTextRef.current.length
              ? longestTranscriptRef.current
              : latestTextRef.current;
            if (best.trim()) {
              if (best !== latestTextRef.current) setTextTracked(best);
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
- title: ONLY the core subject — NEVER include date, time, location, command words, list-destination phrases, or assignment phrases. Strip ALL of: leading verbs ("add", "create", "schedule", "remind me to", "put", "book" and equivalents in ${userLanguage}), trailing destinations ("to my shopping list", "to our shopping list", "to the list", "to my list", "on the calendar", "on the schedule" and equivalents in ${userLanguage}), assignment phrases ("assign to X", "ask X to", "tell X to", "have X", "for X"), date/time phrases. For type "shopping" or "shopping_personal", ALWAYS separate multiple items with commas. For type "task", separate multiple tasks with commas.
- date: "YYYY-MM-DD" or null. Resolve ALL date references including ordinals. Today is ${today} — resolve to the NEXT occurrence if the date has not yet passed, otherwise the following month.
- time: "HH:MM" 24h or null.
- endTime: "HH:MM" 24h or null
- location: string or null
- assignees: array of first names of who should do it, or null. Extract from phrases like "assign to X", "ask X to", "tell X to", "have X", "get X to", "for X", "X should" (and equivalents in ${userLanguage}). Use ONLY the person's name in this array, never in the title.
- reminder: human-readable string or null
- notes: string or null
- mood: string or null (journal only)

Today is ${today} (${dayOfWeek}). Date resolution rules:
- "this week" = a date within the 7 days starting from today (${today}), not before today.
- "next week" = a date 7–14 days from today.
- "this weekend" = the nearest upcoming Saturday.
- Never resolve a relative date to a date in the past.

Return ONLY the raw JSON object.`;

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

  const fetchGuideAnswer = async (question: string) => {
    setGuideQuestion(question);
    setGuideAnswer('');
    setGuideStreaming(true);
    setStep('guide');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setGuideAnswer(t('ezCapture.guideSignInRequired')); setGuideStreaming(false); return; }

      supabase.from('guide_queries').insert({ user_id: session.user.id, question }).then(() => {});

      const userLanguage = getUserLanguageLabel();
      const systemPrompt = `You are Eazy, the in-app assistant for eazy.family. Answer questions about the app accurately. Respond ONLY in ${userLanguage} — even if the question is in a different language. Only describe features that exist — never invent UI elements.

NAVIGATION — there is NO hamburger menu, NO sidebar, NO drawer:
- The EZ button is the round logo button fixed at the bottom centre of the screen.
- Tap EZ button → opens the EZ Capture overlay (speak or type anything — event, task, shopping, reminder, or journal entry).
- Swipe up on the EZ button → a navigation menu slides up: Home, Calendar, Family, Lists, Rituals, Settings.
- There is no other menu.

SCREENS:
- Home: family overview, upcoming events, quick stats, conflict alerts.
- Calendar: add/view family events in day, week, 3-day, month, or year view. Tap + to add an event, or use the mic button in the title field for voice-to-title.
- Family: shared family agenda (upcoming shared events and tasks) plus Family Channel (private group messaging). They are separate sections.
- Lists: To-Do tasks and Shopping lists. Shopping has a shared Family List and a personal My List.
- Rituals: daily habits to check off, plus a personal journal. Tap the EZ button on this screen to add a journal entry by voice or text.
- Settings: language, calendar sync, morning digest, invite family, subscription, account.

FEATURES:
- EZ Capture: tap the EZ button, then speak or type ("dentist Tuesday 3pm", "add milk", "clean the terrace", "I felt proud today"). EZ classifies it, shows a confirmation screen, and saves it. The type badge on the confirm screen is tappable to change the detected type.
- Voice: tap the mic icon in EZ Capture. Speak naturally — EZ auto-processes when you stop.
- Journal: on the Rituals screen, tap the EZ button → speak or type your thoughts → confirm. Entry saves immediately.
- Calendar voice-to-title: in the Add Event form, tap the mic button next to the title field.
- Calendar Sync: Settings → Calendar Sync → connect Google, Apple, or Outlook.
- Morning Digest: daily summary email. Toggle in Settings → Morning Digest.
- Invite Family: Settings → Invite Family.
- Language: Settings → Language. Supports English, German, French, Italian, Spanish, Portuguese.
- Subscription: 14-day free trial, then monthly or annual plan. Manage in Settings → Account.

STYLE:
- 2-4 sentences max. Warm and direct.
- Plain text only — no asterisks, no bullet points, no headers.
- If the question is unrelated to eazy.family, say you can only help with the app.
- ALWAYS respond in ${userLanguage}, regardless of the question's language.`;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const response = await fetch(`${supabaseUrl}/functions/v1/eazy-chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: question }], systemPrompt }),
      });

      if (!response.ok || !response.body) throw new Error('no response');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) setGuideAnswer(prev => prev + content);
            } catch {}
          }
        }
      }
    } catch {
      setGuideAnswer(t('ezCapture.guideError'));
    } finally {
      setGuideStreaming(false);
    }
  };

  const handleParseAndPreview = async () => {
    if (!latestTextRef.current.trim()) return;
    haptic('medium');
    if (isListening) stopListening();

    const rawInput = latestTextRef.current.trim();
    if (isFeatureHelpQuery(rawInput)) {
      await fetchGuideAnswer(rawInput);
      return;
    }

    setStep('processing');

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
    if (!parsed || isSubmitting) return;
    setIsSubmitting(true);
    haptic('medium');
    const entryType = parsed.type || type;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (entryType === 'event' || entryType === 'reminder') {
        const rawInput = parseSnapshotRef.current?.rawInput ?? latestTextRef.current;
        const attendeeUserIds = resolveAssignees(parsed.assignees, familyMembers, { userId: user?.id ?? '', name: userName });
        const eventDraft = buildCalendarCaptureItem(parsed, {
          id: crypto.randomUUID(),
          now: new Date(),
          rawInput,
          userId: user?.id,
          attendeeUserIds,
        });
        let appleCalendarId: string | undefined;
        if (entryType === 'event' && localStorage.getItem('eazy-apple-calendar-enabled') === 'true') {
          appleCalendarId = (await createAppleEvent({
            title: parsed.title,
            startDate: new Date(eventDraft.startDate),
            endDate: new Date(eventDraft.endDate),
            allDay: !parsed.time,
            location: parsed.location || undefined,
          })) ?? undefined;
        }
        const newEvent = appleCalendarId
          ? { ...eventDraft, appleCalendarId }
          : eventDraft;
        const existing = JSON.parse(localStorage.getItem('eazy-family-calendar-items') || '[]');
        localStorage.setItem('eazy-family-calendar-items', JSON.stringify([...existing, newEvent]));
        window.dispatchEvent(new CustomEvent('eazy-calendar-updated'));
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: entryType === 'reminder' ? t('ezCapture.toastReminderSet') : t('ezCapture.toastCalendarAdded') });
        onClose(); navigate('/app/calendar');

      } else if (entryType === 'task') {
        if (!user || !session) return;
        const assignedUserIds = resolveAssignees(parsed.assignees, familyMembers, { userId: user.id, name: userName });
        // Assigning to another member → drop it into a shared family list so the
        // assignee can see it and it shows with their pill.
        const assignedToOthers = assignedUserIds.some(id => id !== user.id);
        const parentId = (assignedToOthers && familyId) ? await ensureFamilyTaskList(familyId, user.id) : null;
        const rows = buildTaskCaptureRows(parsed, user.id, { assignedUserIds, familyId, parentId });
        const { error } = await supabase.from('tasks').insert(rows);
        if (error) throw error;
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: rows.length > 1
          ? t('ezCapture.toastTasksAdded', { count: rows.length })
          : t('ezCapture.toastTaskAdded')
        });
        onClose(); navigate(parentId ? '/app/lists?tab=tasks' : '/app/lists');

      } else if (entryType === 'shopping' || entryType === 'shopping_personal') {
        if (!user || !session) return;
        const assignedUserIds = entryType === 'shopping'
          ? resolveAssignees(parsed.assignees, familyMembers, { userId: user.id, name: userName })
          : [];
        const rows = buildShoppingCaptureRows(parsed, user.id, { assignedUserIds, familyId });
        const { error } = await supabase.from('tasks').insert(rows);
        if (error) throw error;
        haptic('light'); setTimeout(() => haptic('light'), 150);
        const listLabel = t(entryType === 'shopping_personal' ? 'ezCapture.listPersonal' : 'ezCapture.listFamily');
        toast({ title: rows.length === 1
          ? t('ezCapture.toastItemAdded', { list: listLabel })
          : t('ezCapture.toastItemsAdded', { count: rows.length, list: listLabel })
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
        const text = parsed.title + (parsed.notes ? `\n\n${parsed.notes}` : '');
        const entry = { id: crypto.randomUUID(), text: text.trim(), date: new Date().toISOString() };
        const existing = JSON.parse(localStorage.getItem('eazy-journal-entries') || '[]');
        localStorage.setItem('eazy-journal-entries', JSON.stringify([entry, ...existing]));
        window.dispatchEvent(new CustomEvent('eazy-journal-updated'));
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: t('ezCapture.toastJournalSaved') });
        onClose();
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
      setIsSubmitting(false);
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
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Journal-specific header copy
  const isJournalMode = defaultType === 'journal' || activeType === 'journal';

  // Build textarea placeholder based on voice state and context
  const placeholder = isTranscribing
    ? t('ezCapture.placeholderTranscribing')
    : isListening
      ? ((isSingleShot && !isJournalMode) ? t('ezCapture.placeholderListeningSingleShot') : t('ezCapture.placeholderListening'))
      : isJournalMode
        ? ''
        : t('ezCapture.placeholderGuide');

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(28, 20, 18, 0.6)', backdropFilter: 'blur(8px)' }}
      onClick={handleBackdropClose}
    >
      <style>{`@keyframes ez-blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">

          {/* ── CAPTURE STEP ── */}
          {step === 'capture' && (
            <div className="rounded-3xl p-6 space-y-5" style={{ background: CARD, boxShadow: '0 8px 48px rgba(28,20,18,0.22)' }}>
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>
                  {isJournalMode ? t('ezCapture.headerJournal', 'Share your thoughts') : t('ezCapture.header')}
                </h2>
                <p className="text-sm" style={{ color: MUTED }}>
                  {isJournalMode ? t('ezCapture.subheaderJournal', 'Your space, your words') : t('ezCapture.subheader')}
                </p>
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => setTextTracked(e.target.value)}
                  placeholder={placeholder}
                  rows={4}
                  className="w-full resize-none rounded-2xl p-4 pr-14 text-sm outline-none"
                  style={{
                    background: MUTED_BG,
                    border: `1.5px solid ${text ? '#D97B66' : BORDER}`,
                    color: INK,
                    lineHeight: '1.6',
                    transition: 'border-color 0.2s',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParseAndPreview(); }}
                />
                <div className="absolute bottom-2 right-2 w-10 h-10">
                  {(intendingToListen || isListening) && !isTranscribing && (
                    <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(150,71,53,0.35)' }} />
                  )}
                  <button
                    onClick={(intendingToListen || isListening) ? stopListening : startListening}
                    disabled={isTranscribing}
                    className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all"
                    style={{ background: isTranscribing ? '#6E8FE5' : (intendingToListen || isListening) ? '#D97B66' : '#964735' }}
                  >
                    {isTranscribing
                      ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      : <Mic className="w-4 h-4 text-white" />
                    }
                  </button>
                </div>
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
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: MUTED_BG }}
                  >
                    <ChevronLeft className="w-5 h-5" style={{ color: MUTED }} />
                  </button>
                  <h2 className="font-bold text-lg" style={{ color: INK }}>{t('ezCapture.confirm')}</h2>
                </div>

                {/* Type badge — tap to change */}
                <div>
                  {!showTypePicker ? (
                    <button
                      onClick={() => setShowTypePicker(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-opacity active:opacity-70"
                      style={{ background: '#964735', color: '#FFFFFF' }}
                    >
                      <span style={{ fontSize: '12px' }}>{TYPES.find(tp => tp.id === activeType)?.icon}</span>
                      {TYPES.find(tp => tp.id === activeType)?.label}
                      <span style={{ fontSize: '10px', opacity: 0.75, marginLeft: 2 }}>▾</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {TYPES.map(tp => (
                        <button
                          key={tp.id}
                          onClick={() => {
                            setParsed(p => p ? { ...p, type: tp.id } : p);
                            setType(tp.id);
                            setUserLockedType(tp.id);
                            setShowTypePicker(false);
                          }}
                          className="flex items-center gap-1 rounded-full font-semibold transition-all"
                          style={{
                            padding: '8px 12px',
                            fontSize: '12px',
                            background: activeType === tp.id ? '#964735' : MUTED_BG,
                            color: activeType === tp.id ? '#FFFFFF' : MUTED,
                            border: `1.5px solid ${activeType === tp.id ? '#964735' : BORDER}`,
                          }}
                        >
                          <span style={{ fontSize: '11px' }}>{tp.icon}</span> {tp.label}
                        </button>
                      ))}
                    </div>
                  )}
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
                      className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl text-xs"
                      style={{ background: '#FEF0E6', border: '1.5px solid #E8A882' }}
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
                      style={{ color: INK, lineHeight: '1.5', maxHeight: '80px', overflowY: 'auto' }}
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
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
                  style={{ background: '#964735', color: '#FFFFFF' }}
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? '…' : t('ezCapture.confirmSave')}
                </button>
              </div>
            </div>
          )}

          {/* ── GUIDE STEP ── */}
          {step === 'guide' && (
            <div className="rounded-3xl overflow-hidden" style={{ background: CARD, boxShadow: '0 8px 48px rgba(28,20,18,0.22)' }}>
              <div className="px-6 pt-6 pb-4 space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setStep('capture'); setText(''); latestTextRef.current = ''; }}
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: MUTED_BG }}
                  >
                    <ChevronLeft className="w-5 h-5" style={{ color: MUTED }} />
                  </button>
                  <h2 className="font-bold text-lg" style={{ color: INK }}>{t('ezCapture.guideTitle')}</h2>
                </div>

                <div className="p-3 rounded-2xl" style={{ background: MUTED_BG }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: MUTED }}>{t('ezCapture.guideQuestion')}</p>
                  <p className="text-sm font-medium" style={{ color: INK }}>{guideQuestion}</p>
                </div>

                <div style={{ minHeight: 80 }}>
                  {!guideAnswer && guideStreaming && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#964735', borderTopColor: 'transparent' }} />
                      <span className="text-sm" style={{ color: MUTED }}>{t('ezCapture.guideLooking')}</span>
                    </div>
                  )}
                  {guideAnswer && (
                    <p className="text-sm leading-relaxed" style={{ color: INK }}>
                      {guideAnswer}
                      {guideStreaming && (
                        <span style={{ display: 'inline-block', width: 2, height: '0.9em', background: '#964735', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'ez-blink 0.8s step-end infinite' }} />
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-6 pb-6 flex gap-2">
                <button
                  onClick={() => { setStep('capture'); setText(''); latestTextRef.current = ''; }}
                  className="flex-1 py-2 rounded-full text-sm font-semibold"
                  style={{ background: MUTED_BG, color: MUTED, border: `1px solid ${BORDER}` }}
                >
                  {t('ezCapture.guideAskAnother')}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5"
                  style={{ background: '#964735', color: '#FFFFFF' }}
                >
                  <Check className="w-4 h-4" />
                  {t('ezCapture.guideGotIt')}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
