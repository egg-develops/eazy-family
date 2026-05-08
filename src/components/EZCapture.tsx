import { useState, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptic";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import * as chrono from "chrono-node";

type CaptureType = 'event' | 'task' | 'shopping' | 'reminder' | 'ritual' | 'journal';

interface EZCaptureProps {
  onClose: () => void;
}

const TYPES: { id: CaptureType; label: string; emoji: string }[] = [
  { id: 'event',    label: 'Event',    emoji: '📅' },
  { id: 'task',     label: 'Task',     emoji: '✓'  },
  { id: 'shopping', label: 'Shopping', emoji: '🛒' },
  { id: 'reminder', label: 'Reminder', emoji: '🔔' },
  { id: 'ritual',   label: 'Ritual',   emoji: '✨' },
  { id: 'journal',  label: 'Journal',  emoji: '📝' },
];

export const EZCapture = ({ onClose }: EZCaptureProps) => {
  const [text, setText] = useState('');
  const [type, setType] = useState<CaptureType>('event');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    haptic('medium');
    setTimeout(() => textareaRef.current?.focus(), 150);
  }, []);

  // Auto-detect type from text as user types
  useEffect(() => {
    if (!text.trim()) return;
    const lower = text.toLowerCase();
    if (/\b(buy|get|pick up|need|grab)\b/.test(lower)) { setType('shopping'); return; }
    if (/\b(remind|don't forget|remember)\b/.test(lower)) { setType('reminder'); return; }
    if (/\b(feel|journal|today i|grateful|reflection)\b/.test(lower)) { setType('journal'); return; }
    if (/\b(ritual|morning|evening|routine|meditat|exercise)\b/.test(lower)) { setType('ritual'); return; }
    if (/\b(task|todo|to-do|finish|complete|do )\b/.test(lower)) { setType('task'); return; }
    if (chrono.parseDate(text)) { setType('event'); }
  }, [text]);

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = true;
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setText(t);
    };
    r.onend = () => setIsListening(false);
    r.start();
    recognitionRef.current = r;
    setIsListening(true);
    haptic('light');
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleCreate = async () => {
    if (!text.trim() || isProcessing) return;
    setIsProcessing(true);
    haptic('medium');
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (type === 'event' || type === 'reminder') {
        const parsed = chrono.parse(text)[0];
        const startDate = parsed?.date() ?? new Date();
        const rawTitle = text.replace(parsed?.text ?? '', '').trim() || text;
        const title = rawTitle.replace(/\b(on|at|next|this|tomorrow|today)\b\s*/gi, '').trim() || text;
        const newEvent = {
          id: crypto.randomUUID(),
          title,
          startDate: startDate.toISOString(),
          endDate: new Date(startDate.getTime() + 3600000).toISOString(),
          allDay: !(parsed?.start.isCertain('hour')),
          type: 'event',
          color: '#D97B66',
          tag: type === 'reminder' ? 'personal' : undefined,
        };
        const existing = JSON.parse(localStorage.getItem('eazy-family-calendar-items') || '[]');
        localStorage.setItem('eazy-family-calendar-items', JSON.stringify([...existing, newEvent]));
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: type === 'reminder' ? 'Reminder set' : 'Added to Calendar' });
        onClose(); navigate('/app/calendar');

      } else if (type === 'task') {
        if (!user || !session) return;
        await supabase.from('tasks').insert({ title: text.trim(), type: 'task', user_id: user.id, completed: false });
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: 'Task added' });
        onClose(); navigate('/app/todos');

      } else if (type === 'shopping') {
        if (!user || !session) return;
        const items = text.split(/,|;|\band\b/i).map(s => s.trim()).filter(Boolean);
        await Promise.all(items.map(item =>
          supabase.from('tasks').insert({ title: item, type: 'shopping', user_id: user.id, completed: false })
        ));
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: `${items.length} item${items.length > 1 ? 's' : ''} added` });
        onClose(); navigate('/app/shopping');

      } else if (type === 'ritual') {
        const entry = { id: crypto.randomUUID(), title: text.trim(), date: new Date().toISOString(), type: 'ritual' };
        const ex = JSON.parse(localStorage.getItem('eazy-rituals') || '[]');
        localStorage.setItem('eazy-rituals', JSON.stringify([entry, ...ex]));
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: 'Ritual captured' });
        onClose(); navigate('/app/rituals');

      } else if (type === 'journal') {
        const entry = { id: crypto.randomUUID(), text: text.trim(), date: new Date().toISOString() };
        const ex = JSON.parse(localStorage.getItem('eazy-journal-entries') || '[]');
        localStorage.setItem('eazy-journal-entries', JSON.stringify([entry, ...ex]));
        haptic('light'); setTimeout(() => haptic('light'), 150);
        toast({ title: 'Journal entry saved' });
        onClose(); navigate('/app/rituals');
      }
    } catch {
      toast({ title: 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(28, 20, 18, 0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      {/* Center: capture card */}
      <div onClick={e => e.stopPropagation()} className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">

        {/* Main capture card */}
        <div
          className="rounded-3xl p-6 space-y-5"
          style={{ background: '#FFFFFF', boxShadow: '0 8px 48px rgba(28,20,18,0.22)' }}
        >
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#1C1C18' }}>
              What's on your mind?
            </h2>
            <p className="text-sm" style={{ color: '#7A6660' }}>Capture a moment or a task.</p>
          </div>

          {/* Input */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Brunch with Family and Friends next Saturday at 11:00"
              rows={3}
              className="w-full resize-none rounded-2xl p-4 pr-12 text-base outline-none"
              style={{
                background: '#F7F3ED',
                border: `1.5px solid ${text ? '#D97B66' : '#DAC1BB'}`,
                color: '#1C1C18',
                fontSize: '15px',
                lineHeight: '1.5',
                transition: 'border-color 0.2s',
              }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCreate(); }}
            />
            <button
              onClick={isListening ? stopListening : startListening}
              className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{
                background: isListening ? '#D97B66' : '#964735',
                boxShadow: isListening ? '0 0 0 4px rgba(217,123,102,0.3)' : 'none',
              }}
            >
              {isListening
                ? <MicOff className="w-4 h-4 text-white" />
                : <Mic className="w-4 h-4 text-white" />}
            </button>
          </div>

          {/* Type chips */}
          <div className="flex flex-wrap gap-2">
            {TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: type === t.id ? '#964735' : '#F1EDE7',
                  color: type === t.id ? '#FFFFFF' : '#55433F',
                  border: `1px solid ${type === t.id ? '#964735' : '#DAC1BB'}`,
                  transform: type === t.id ? 'scale(1.04)' : 'scale(1)',
                }}
              >
                <span style={{ fontSize: '12px' }}>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-full text-sm font-semibold"
              style={{ background: '#F1EDE7', color: '#55433F' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!text.trim() || isProcessing}
              className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
              style={{
                background: text.trim() ? '#964735' : '#DAC1BB',
                color: '#FFFFFF',
                cursor: text.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {isProcessing ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Bottom: AI strip above nav */}
      <div onClick={e => e.stopPropagation()} className="px-4 pb-28">
        <div
          className="px-4 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: 'rgba(253, 249, 243, 0.95)', border: '1px solid #DAC1BB' }}
        >
          <img src="/logo.png" alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-contain"
            style={{ background: '#D97B66', padding: '3px' }} />
          <p className="text-sm" style={{ color: '#55433F', fontStyle: 'italic' }}>
            "I'll help you organize this. Take a deep breath."
          </p>
        </div>
      </div>
    </div>
  );
};
