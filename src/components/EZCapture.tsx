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

const TYPES: { id: CaptureType; label: string; icon: string }[] = [
  { id: 'event',    label: 'Event',    icon: '📅' },
  { id: 'task',     label: 'Task',     icon: '✓'  },
  { id: 'shopping', label: 'Shopping', icon: '🛒' },
  { id: 'reminder', label: 'Reminder', icon: '🔔' },
  { id: 'ritual',   label: 'Ritual',   icon: '✨' },
  { id: 'journal',  label: 'Journal',  icon: '📝' },
];

const LOCALE_TO_LANG: Record<string, string> = {
  en: 'en-US', de: 'de-DE', fr: 'fr-FR', it: 'it-IT',
  'en-US': 'en-US', 'en-GB': 'en-GB',
  'de-DE': 'de-DE', 'de-CH': 'de-DE', 'de-AT': 'de-DE',
  'fr-FR': 'fr-FR', 'fr-CH': 'fr-FR', 'fr-BE': 'fr-FR',
  'it-IT': 'it-IT', 'it-CH': 'it-IT',
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
  const [type, setType] = useState<CaptureType>(defaultType ?? 'event');
  const [step, setStep] = useState<Step>('capture');
  const [parsed, setParsed] = useState<ParsedEntry | null>(null);
  const [rawDebug, setRawDebug] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const userName = getUserFirstName();
  const speech = useSpeechRecognition();
  const isListening = speech.isListening;

  useEffect(() => {
    haptic('medium');
    setTimeout(() => textareaRef.current?.focus(), 150);
  }, []);

  // Auto-detect type from keywords as user types
  useEffect(() => {
    if (!text.trim()) return;
    const lower = text.toLowerCase();
    if (/\b(buy|get|pick up|need|grab)\b/.test(lower)) { setType('shopping'); return; }
    if (/\b(remind|don't forget|remember)\b/.test(lower)) { setType('reminder'); return; }
    if (/\b(feel|journal|today i|grateful|reflection|dear diary)\b/.test(lower)) { setType('journal'); return; }
    if (/\b(ritual|morning|evening|routine|meditat|exercise|habit)\b/.test(lower)) { setType('ritual'); return; }
    if (/\b(task|todo|to-do|finish|complete)\b/.test(lower)) { setType('task'); return; }
    if (/\b(tomorrow|today|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+am|\d+pm|at \d)\b/.test(lower)) { setType('event'); }
  }, [text]);

  const stopListening = () => {
    speech.stop();
  };

  const startListening = () => {
    speech.start({
      lang: getUserLocale(),
      continuous: true,
      onResult: (transcript) => setText(transcript),
      onError: (error) => {
        if (error === 'not-allowed') {
          toast({ title: 'Microphone access denied', description: 'Allow microphone access in Settings.' });
        } else if (error === 'not-supported') {
          toast({ title: 'Voice input not supported in this browser' });
        }
      },
    });
    haptic('light');
  };

  const parseWithAI = async (): Promise<ParsedEntry | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setRawDebug('ERROR: no auth session'); return null; }

      // Bug fix: use local date, not UTC
      const today = format(new Date(), 'yyyy-MM-dd');
      const dayOfWeek = format(new Date(), 'EEEE');
      const systemContext = `You are an NLP parser for a family scheduling app. Parse the user's input and return ONLY a valid JSON object — no markdown, no code fences, no explanation. JSON fields: type ("event"|"task"|"shopping"|"reminder"|"ritual"|"journal"), title (string, clean and concise), date ("YYYY-MM-DD" or null), time ("HH:MM" 24h or null), endTime ("HH:MM" 24h or null), location (string or null), assignees (array of first names or null), reminder (human-readable string like "1 week before" or null), notes (string or null), mood (string or null, only for journal). Today is ${today} (${dayOfWeek}). Resolve relative dates like "tomorrow", "next Monday", "in 2 weeks" from this date. Return ONLY the raw JSON object.`;

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

      if (!response.ok || !response.body) {
        setRawDebug(`ERROR: HTTP ${response.status}`);
        return null;
      }

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

      setRawDebug(fullContent || '(empty response)');
      const cleaned = fullContent.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleaned) as ParsedEntry;
    } catch (e) {
      setRawDebug(`ERROR: ${e}`);
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
      setParsed(result);
    } else {
      // Fallback: chrono-node extracts date/time from raw text
      const chronoParsed = chrono.parse(text.trim(), new Date())[0];
      const fallbackDate = chronoParsed ? format(chronoParsed.start.date(), 'yyyy-MM-dd') : null;
      const fallbackHour = chronoParsed?.start.get('hour');
      const fallbackMin = chronoParsed?.start.get('minute') ?? 0;
      const fallbackTime = fallbackHour != null
        ? `${String(fallbackHour).padStart(2, '0')}:${String(fallbackMin).padStart(2, '0')}`
        : null;
      setParsed({
        type,
        title: text.trim(),
        date: fallbackDate, time: fallbackTime, endTime: null,
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
          allDay: !parsed.time,
          type: 'event',
          color: '#D97B66',
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
        });
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: '✓ Task added' });
        onClose(); navigate('/app/todos');

      } else if (entryType === 'shopping') {
        if (!user || !session) return;
        const items = parsed.title.split(/[,;]/).map(s => s.trim()).filter(Boolean);
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
      {/* Center card */}
      <div onClick={e => e.stopPropagation()} className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">

          {/* ── CAPTURE STEP ── */}
          {step === 'capture' && (
            <div className="rounded-3xl p-6 space-y-5" style={{ background: '#FFFFFF', boxShadow: '0 8px 48px rgba(28,20,18,0.22)' }}>
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#1C1C18' }}>What's on your mind?</h2>
                <p className="text-sm" style={{ color: '#7A6660' }}>Capture thoughts — Schedule tasks</p>
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Speak or type anything — event, task, note, reminder…"
                  rows={4}
                  className="w-full resize-none rounded-2xl p-4 pr-12 text-sm outline-none"
                  style={{
                    background: '#F7F3ED',
                    border: `1.5px solid ${text ? '#D97B66' : '#DAC1BB'}`,
                    color: '#1C1C18',
                    lineHeight: '1.6',
                    transition: 'border-color 0.2s',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParseAndPreview(); }}
                />
                {/* Mic button with pulse ring when active */}
                <div className="absolute bottom-3 right-3 w-7 h-7">
                  {isListening && (
                    <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(150,71,53,0.35)' }} />
                  )}
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className="relative w-7 h-7 rounded-full flex items-center justify-center transition-all"
                    style={{ background: isListening ? '#D97B66' : '#964735' }}
                  >
                    <Mic className="w-3.5 h-3.5 text-white" />
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
                      background: type === t.id ? '#964735' : '#F1EDE7',
                      color: type === t.id ? '#FFFFFF' : '#55433F',
                      border: `1px solid ${type === t.id ? '#964735' : '#DAC1BB'}`,
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
                  style={{ background: '#F1EDE7', color: '#7A6660', border: '1px solid #DAC1BB' }}
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
            <div className="rounded-3xl p-8 flex flex-col items-center gap-5" style={{ background: '#FFFFFF', boxShadow: '0 8px 48px rgba(28,20,18,0.22)' }}>
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full animate-spin" style={{ border: '3px solid #F1EDE7', borderTopColor: '#964735' }} />
                <img src="/logo.png" alt="" className="absolute inset-0 m-auto w-8 h-8 object-contain" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold" style={{ color: '#1C1C18' }}>Parsing with AI…</p>
                <p className="text-sm" style={{ color: '#7A6660' }}>Understanding your intent</p>
              </div>
            </div>
          )}

          {/* ── PREVIEW STEP ── */}
          {step === 'preview' && parsed && (
            <div className="rounded-3xl overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 8px 48px rgba(28,20,18,0.22)' }}>
              <div className="px-6 pt-6 pb-4 space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep('capture')}
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#F1EDE7' }}
                  >
                    <ChevronLeft className="w-4 h-4" style={{ color: '#55433F' }} />
                  </button>
                  <h2 className="font-bold text-lg" style={{ color: '#1C1C18' }}>Confirm</h2>
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
                  <div className="p-3 rounded-2xl" style={{ background: '#F7F3ED' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#B5A09A' }}>Title</p>
                    <p className="font-semibold text-sm" style={{ color: '#1C1C18' }}>{parsed.title}</p>
                  </div>

                  {(parsed.date || parsed.time) && (
                    <div className="p-3 rounded-2xl" style={{ background: '#F7F3ED' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#B5A09A' }}>When</p>
                      <p className="font-medium text-sm" style={{ color: '#1C1C18' }}>
                        {formatPreviewDate(parsed.date, parsed.time)}
                        {parsed.endTime && ` → ${formatPreviewDate(parsed.date, parsed.endTime)?.split('·')[1]?.trim() ?? parsed.endTime}`}
                      </p>
                    </div>
                  )}

                  {parsed.location && (
                    <div className="p-3 rounded-2xl" style={{ background: '#F7F3ED' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#B5A09A' }}>Location</p>
                      <p className="font-medium text-sm" style={{ color: '#1C1C18' }}>{parsed.location}</p>
                    </div>
                  )}

                  {parsed.assignees && parsed.assignees.length > 0 && (
                    <div className="p-3 rounded-2xl" style={{ background: '#F7F3ED' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#B5A09A' }}>With</p>
                      <p className="font-medium text-sm" style={{ color: '#1C1C18' }}>{parsed.assignees.join(', ')}</p>
                    </div>
                  )}

                  {parsed.reminder && (
                    <div className="p-3 rounded-2xl" style={{ background: '#F7F3ED' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#B5A09A' }}>Reminder</p>
                      <p className="font-medium text-sm" style={{ color: '#1C1C18' }}>{parsed.reminder}</p>
                    </div>
                  )}

                  {parsed.mood && (
                    <div className="p-3 rounded-2xl" style={{ background: '#F7F3ED' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#B5A09A' }}>Mood</p>
                      <p className="font-medium text-sm" style={{ color: '#1C1C18' }}>{parsed.mood}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Debug panel — shows raw AI response to surface parsing failures */}
              {rawDebug && (
                <div className="mx-6 mb-4">
                  <details>
                    <summary className="text-xs cursor-pointer select-none" style={{ color: '#B5A09A' }}>
                      🔍 Debug: AI response
                    </summary>
                    <pre className="mt-1 p-2 rounded-xl text-xs overflow-auto" style={{ maxHeight: '100px', background: '#F7F3ED', color: '#55433F', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {rawDebug}
                    </pre>
                  </details>
                </div>
              )}

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
          style={{ background: 'rgba(253, 249, 243, 0.95)', border: '1px solid #DAC1BB' }}
        >
          <img
            src="/logo.png"
            alt=""
            className="w-8 h-8 rounded-full flex-shrink-0 object-contain"
            style={{ background: '#D97B66', padding: '3px' }}
          />
          <p className="text-sm" style={{ color: '#55433F', fontStyle: 'italic' }}>
            {step === 'capture' && `"${userName ? `Hey ${userName}, speak` : 'Speak'} or type anything — I'll figure out the rest."`}
            {step === 'processing' && '"Reading between the lines…"'}
            {step === 'preview' && parsed && `"${AI_MESSAGES[activeType](userName)}"`}
          </p>
        </div>
      </div>
    </div>
  );
};
