import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Calendar, CheckSquare, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptic";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface VoiceMessage {
  id: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  timestamp: Date;
}

interface AgendaEvent {
  id: string;
  title: string;
  startDate: Date;
  allDay?: boolean;
}

const MEMBER_COLORS = ['#D97B66', '#44664F', '#6E8FE5', '#EE7BB0', '#964735'];

const FamilyAgenda = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const isListeningRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const capturedRef = useRef('');
  const baseTextRef = useRef('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const getUserName = () => {
    try {
      const s = localStorage.getItem('eazy-family-onboarding');
      if (s) {
        const d = JSON.parse(s);
        return (d.firstName || d.name || 'You') as string;
      }
    } catch {}
    return 'You';
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  useEffect(() => {
    // Load calendar events from localStorage
    try {
      const saved = localStorage.getItem('eazy-family-calendar-items');
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = new Date();
        const upcoming = parsed
          .map((e: any) => ({ ...e, startDate: new Date(e.startDate || e.dueDate) }))
          .filter((e: any) => e.startDate >= now)
          .sort((a: any, b: any) => a.startDate - b.startDate)
          .slice(0, 5);
        setEvents(upcoming);
      }
    } catch {}

    // Load tasks
    if (!user) return;
    supabase.from('tasks').select('id, title, completed').eq('type', 'task').eq('completed', false).limit(5)
      .then(({ data }) => setTasks(data || []));
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopListening = () => {
    isListeningRef.current = false;
    recognitionRef.current?.stop();
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast({ title: 'Voice input not supported in this browser' }); return; }
    capturedRef.current = '';
    baseTextRef.current = '';
    isListeningRef.current = true;
    setTranscript('');

    const spawnSession = (): any => {
      const r = new SR();
      r.lang = navigator.language || 'en-US';
      r.interimResults = true;
      r.continuous = true;

      r.onresult = (e: any) => {
        let sessionText = '';
        for (let i = 0; i < e.results.length; i++) sessionText += e.results[i][0].transcript;
        const combined = baseTextRef.current ? `${baseTextRef.current} ${sessionText}` : sessionText;
        capturedRef.current = combined;
        setTranscript(combined);
      };

      r.onend = () => {
        if (!isListeningRef.current) {
          setIsListening(false);
          if (capturedRef.current.trim()) postMessage(capturedRef.current.trim());
          setTranscript('');
          return;
        }
        baseTextRef.current = capturedRef.current;
        try {
          const next = spawnSession();
          recognitionRef.current = next;
        } catch {
          isListeningRef.current = false;
          setIsListening(false);
          if (capturedRef.current.trim()) postMessage(capturedRef.current.trim());
          setTranscript('');
        }
      };

      r.onerror = (e: any) => {
        if (e.error === 'aborted' || e.error === 'no-speech') return;
        if (e.error === 'not-allowed') toast({ title: 'Microphone access denied', description: 'Allow microphone in your browser settings.' });
        isListeningRef.current = false;
        setIsListening(false);
        setTranscript('');
      };

      try { r.start(); } catch { isListeningRef.current = false; setIsListening(false); }
      return r;
    };

    recognitionRef.current = spawnSession();
    setIsListening(true);
    haptic('light');
  };

  const postMessage = (text: string) => {
    if (!text.trim()) return;
    const name = getUserName();
    const colorIdx = messages.length % MEMBER_COLORS.length;
    const msg: VoiceMessage = {
      id: crypto.randomUUID(),
      author: name,
      initials: getInitials(name),
      color: MEMBER_COLORS[colorIdx],
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
    haptic('light');
  };

  const handleMicToggle = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const TC = '#964735';
  const BORDER = '#DAC1BB';

  return (
    <div className="space-y-4 pb-4">

      {/* Timeline / voice messages */}
      <div className="space-y-4">

        {/* Upcoming Events strip */}
        {events.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: '#fff' }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: `1px solid #F1EDE7` }}>
              <Calendar className="w-4 h-4" style={{ color: TC }} />
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A6660' }}>Upcoming</p>
            </div>
            {events.map((ev, i) => (
              <div key={ev.id} className="flex items-start gap-3 px-4 py-2.5" style={{ borderBottom: i < events.length - 1 ? `1px solid #F1EDE7` : 'none' }}>
                <div className="text-center flex-shrink-0" style={{ minWidth: '36px' }}>
                  <p className="text-xs font-bold" style={{ color: TC }}>{format(ev.startDate, 'MMM').toUpperCase()}</p>
                  <p className="text-lg font-bold leading-none" style={{ color: '#1C1C18' }}>{format(ev.startDate, 'd')}</p>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-medium" style={{ color: '#1C1C18' }}>{ev.title}</p>
                  {!ev.allDay && <p className="text-xs" style={{ color: '#7A6660' }}>{format(ev.startDate, 'h:mm a')}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tasks strip */}
        {tasks.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: '#fff' }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: `1px solid #F1EDE7` }}>
              <CheckSquare className="w-4 h-4" style={{ color: TC }} />
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A6660' }}>Open Tasks</p>
            </div>
            {tasks.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: i < tasks.length - 1 ? `1px solid #F1EDE7` : 'none' }}>
                <div className="w-4 h-4 rounded border-2 flex-shrink-0" style={{ borderColor: BORDER }} />
                <p className="text-sm" style={{ color: '#1C1C18' }}>{t.title}</p>
              </div>
            ))}
          </div>
        )}

        {/* Voice message timeline */}
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-3xl mb-3">🎙️</p>
            <p className="font-semibold" style={{ color: '#1C1C18' }}>Voice timeline</p>
            <p className="text-sm mt-1" style={{ color: '#7A6660' }}>Tap the mic to leave a voice note for the family.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: msg.color }}>
              {msg.initials}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: '#1C1C18' }}>{msg.author}</span>
                <span className="text-xs" style={{ color: '#B5A09A' }}>{format(msg.timestamp, 'h:mm a')}</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-2" style={{ background: '#fff', border: `1px solid ${BORDER}`, maxWidth: '85%' }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: msg.color }}>
                  <Play className="w-3 h-3 text-white" style={{ marginLeft: '1px' }} />
                </div>
                <p className="text-sm flex-1" style={{ color: '#1C1C18' }}>{msg.text}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Live transcript while speaking */}
        {isListening && transcript && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: TC }}>
              {getInitials(getUserName())}
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-2.5" style={{ background: '#F7F3ED', border: `1px solid ${BORDER}`, maxWidth: '85%' }}>
              <p className="text-sm italic" style={{ color: '#7A6660' }}>{transcript}</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Mic bar */}
      <div className="pt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
        <button
          onClick={handleMicToggle}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-sm transition-all"
          style={{
            background: isListening ? TC : '#F1EDE7',
            color: isListening ? '#fff' : '#7A6660',
            border: `1px solid ${isListening ? TC : BORDER}`,
          }}
        >
          {isListening ? (
            <>
              <MicOff className="w-4 h-4" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Leave a Voice Note
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default FamilyAgenda;
