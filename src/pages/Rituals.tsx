import { useState, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { format } from "date-fns";
import { haptic } from "@/lib/haptic";

interface JournalEntry {
  id: string;
  text: string;
  date: string;
}

interface Ritual {
  id: string;
  title: string;
  emoji: string;
  time: string;
}

const DEFAULT_RITUALS: Ritual[] = [
  { id: 'r1', title: 'Morning Routine', emoji: '☀️', time: 'Morning' },
  { id: 'r2', title: 'Evening Routine', emoji: '🌙', time: 'Evening' },
  { id: 'r3', title: '15 min Exercise', emoji: '🏃', time: 'Morning' },
  { id: 'r4', title: 'Daily Meditation', emoji: '🧘', time: 'Any' },
  { id: 'r5', title: 'Quality Time', emoji: '❤️', time: 'Evening' },
];

const Rituals = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [rituals] = useState<Ritual[]>(DEFAULT_RITUALS);
  const [completedRituals, setCompletedRituals] = useState<Set<string>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const recognitionRef = { current: null as any };

  const TC = '#964735';
  const TL = '#D97B66';
  const BORDER = '#DAC1BB';
  const MUTED = '#7A6660';

  useEffect(() => {
    const stored = localStorage.getItem('eazy-journal-entries');
    if (stored) setEntries(JSON.parse(stored));
    const completed = localStorage.getItem('eazy-completed-rituals-today');
    if (completed) setCompletedRituals(new Set(JSON.parse(completed)));
  }, []);

  const toggleRitual = (id: string) => {
    haptic('light');
    setCompletedRituals(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('eazy-completed-rituals-today', JSON.stringify([...next]));
      return next;
    });
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = true;
    r.onresult = (e: any) => setVoiceText(Array.from(e.results).map((r: any) => r[0].transcript).join(''));
    r.onend = () => {
      setIsListening(false);
      if (voiceText.trim()) saveEntry(voiceText);
    };
    r.start(); recognitionRef.current = r;
    setIsListening(true); haptic('light');
  };

  const saveEntry = (text: string) => {
    if (!text.trim()) return;
    const entry = { id: crypto.randomUUID(), text: text.trim(), date: new Date().toISOString() };
    const updated = [entry, ...entries];
    setEntries(updated);
    localStorage.setItem('eazy-journal-entries', JSON.stringify(updated));
    setVoiceText('');
    haptic('light');
  };

  const completedCount = completedRituals.size;
  const totalRituals = rituals.length;
  const pct = Math.round((completedCount / totalRituals) * 100);

  const getTimeLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const hour = d.getHours();
    const dayTime = hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'EVENING';
    return `${format(d, 'EEEE').toUpperCase()} ${dayTime}`;
  };

  return (
    <div className="space-y-5 p-4" style={{ paddingBottom: '2rem' }}>

      {/* Private space label */}
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#B5A09A' }}>Private Space</p>

      {/* Voice Journal — first per wireframe */}
      <div className="rounded-2xl overflow-hidden" style={{ background: TC }}>
        <div className="p-6 text-center space-y-3">
          <button
            onClick={isListening ? () => { recognitionRef.current?.stop(); setIsListening(false); } : startListening}
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all"
            style={{
              background: isListening ? TL : 'rgba(255,255,255,0.2)',
              boxShadow: isListening ? '0 0 0 8px rgba(217,123,102,0.3)' : 'none',
            }}
          >
            {isListening ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
          </button>
          <p className="font-bold text-white">{isListening ? 'Listening…' : 'Voice Journal'}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {isListening ? voiceText || 'Speak now…' : 'Tap to start recording your reflection'}
          </p>
        </div>
      </div>

      {/* Daily Rituals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base" style={{ color: '#1C1C18' }}>Daily Rituals</h2>
          <span className="text-xs font-semibold" style={{ color: TC }}>EDIT LIST</span>
        </div>
        <div className="w-full h-1.5 rounded-full mb-3" style={{ background: '#F1EDE7' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: TC }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {rituals.map(r => (
            <button
              key={r.id}
              onClick={() => toggleRitual(r.id)}
              className="flex items-center gap-2 p-3 rounded-xl text-left transition-all"
              style={{
                background: completedRituals.has(r.id) ? '#FDF3EE' : '#F7F3ED',
                border: `1px solid ${completedRituals.has(r.id) ? TL : BORDER}`,
              }}
            >
              <span className="text-lg">{r.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: '#1C1C18' }}>{r.title}</p>
                {completedRituals.has(r.id) && <p className="text-[10px]" style={{ color: TC }}>✓ COMPLETED</p>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Reflections */}
      {entries.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-bold text-base" style={{ color: '#1C1C18' }}>Recent Reflections</h2>
          {entries.slice(0, 3).map(entry => (
            <div key={entry.id} className="rounded-2xl p-4 space-y-2" style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
                  {getTimeLabel(entry.date)}
                </p>
                <span className="text-xs" style={{ color: '#B5A09A' }}>✦</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#1C1C18' }}>"{entry.text}"</p>
            </div>
          ))}
          {entries.length > 3 && (
            <button className="w-full py-3 rounded-2xl text-sm font-semibold" style={{ background: '#F1EDE7', color: TC }}>
              View All Reflections
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-8 space-y-2">
          <p className="text-3xl">✨</p>
          <p className="text-sm italic" style={{ color: MUTED }}>"The house is quiet… with space for plans or rituals."</p>
        </div>
      )}
    </div>
  );
};

export default Rituals;
