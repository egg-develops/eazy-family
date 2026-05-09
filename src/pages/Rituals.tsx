import { useState, useEffect } from "react";
import { Mic, MicOff, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { haptic } from "@/lib/haptic";

interface JournalEntry {
  id: string;
  text: string;
  date: string;
  mood?: string;
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

const RITUAL_EMOJIS = ['☀️', '🌙', '🏃', '🧘', '❤️', '📚', '🎵', '🌿', '🍵', '✍️'];

const Rituals = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [rituals, setRituals] = useState<Ritual[]>(() => {
    try {
      const s = localStorage.getItem('eazy-rituals-list');
      if (s) return JSON.parse(s);
    } catch {}
    return DEFAULT_RITUALS;
  });
  const [completedRituals, setCompletedRituals] = useState<Set<string>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [newRitualTitle, setNewRitualTitle] = useState('');
  const [showAllJournal, setShowAllJournal] = useState(false);
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

  const saveRituals = (list: Ritual[]) => {
    setRituals(list);
    localStorage.setItem('eazy-rituals-list', JSON.stringify(list));
  };

  const toggleRitual = (id: string) => {
    haptic('light');
    setCompletedRituals(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('eazy-completed-rituals-today', JSON.stringify([...next]));
      return next;
    });
  };

  const addRitual = () => {
    if (!newRitualTitle.trim()) return;
    const emoji = RITUAL_EMOJIS[rituals.length % RITUAL_EMOJIS.length];
    const r: Ritual = { id: crypto.randomUUID(), title: newRitualTitle.trim(), emoji, time: 'Any' };
    saveRituals([...rituals, r]);
    setNewRitualTitle('');
    haptic('light');
  };

  const removeRitual = (id: string) => {
    haptic('light');
    saveRituals(rituals.filter(r => r.id !== id));
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = true;
    let captured = '';
    r.onresult = (e: any) => {
      captured = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setVoiceText(captured);
    };
    r.onend = () => {
      setIsListening(false);
      if (captured.trim()) saveEntry(captured);
    };
    r.start();
    recognitionRef.current = r;
    setIsListening(true);
    haptic('light');
  };

  const saveEntry = (text: string) => {
    if (!text.trim()) return;
    const entry: JournalEntry = { id: crypto.randomUUID(), text: text.trim(), date: new Date().toISOString() };
    const updated = [entry, ...entries];
    setEntries(updated);
    localStorage.setItem('eazy-journal-entries', JSON.stringify(updated));
    setVoiceText('');
    haptic('light');
  };

  const pct = rituals.length > 0 ? Math.round((completedRituals.size / rituals.length) * 100) : 0;

  const getTimeLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const hour = d.getHours();
    const dayTime = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    return `${format(d, 'EEEE')} ${dayTime}`;
  };

  const displayedEntries = showAllJournal ? entries : entries.slice(0, 3);

  return (
    <div className="space-y-5 p-4" style={{ paddingBottom: '2rem' }}>

      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#B5A09A' }}>Private Space</p>

      {/* Voice Journal — compact bar */}
      <div className="rounded-2xl overflow-hidden" style={{ background: TC }}>
        <div className="px-5 py-4 flex items-center gap-4">
          <button
            onClick={isListening
              ? () => { recognitionRef.current?.stop(); setIsListening(false); }
              : startListening}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: isListening ? TL : 'rgba(255,255,255,0.2)',
              boxShadow: isListening ? '0 0 0 6px rgba(217,123,102,0.25)' : 'none',
            }}
          >
            {isListening
              ? <MicOff className="w-5 h-5 text-white" />
              : <Mic className="w-5 h-5 text-white" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white">
              {isListening ? 'Listening…' : 'Voice Journal'}
            </p>
            {isListening && voiceText && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>{voiceText}</p>
            )}
          </div>
        </div>
      </div>

      {/* Daily Rituals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base" style={{ color: '#1C1C18' }}>Daily Rituals</h2>
          <button
            onClick={() => { setEditMode(p => !p); setNewRitualTitle(''); }}
            className="text-xs font-semibold"
            style={{ color: TC }}
          >
            {editMode ? 'Done' : 'Edit List'}
          </button>
        </div>

        <div className="w-full h-1.5 rounded-full mb-3" style={{ background: '#F1EDE7' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: TC }} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {rituals.map(r => (
            <div key={r.id} className="relative">
              <button
                onClick={() => !editMode && toggleRitual(r.id)}
                className="w-full flex items-center gap-2 p-3 rounded-xl text-left transition-all"
                style={{
                  background: completedRituals.has(r.id) ? '#FDF3EE' : '#F7F3ED',
                  border: `1px solid ${completedRituals.has(r.id) ? TL : BORDER}`,
                  cursor: editMode ? 'default' : 'pointer',
                }}
              >
                <span className="text-lg">{r.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate" style={{ color: '#1C1C18' }}>{r.title}</p>
                  {completedRituals.has(r.id) && !editMode && (
                    <p className="text-[10px]" style={{ color: TC }}>✓ Done</p>
                  )}
                </div>
              </button>
              {editMode && (
                <button
                  onClick={() => removeRitual(r.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: '#964735' }}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
          ))}

          {editMode && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#F7F3ED', border: `1px dashed ${BORDER}` }}>
              <input
                value={newRitualTitle}
                onChange={e => setNewRitualTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRitual()}
                placeholder="New ritual…"
                className="flex-1 bg-transparent text-xs outline-none min-w-0"
                style={{ color: '#1C1C18' }}
                autoFocus
              />
              <button
                onClick={addRitual}
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: TC }}
              >
                <Plus className="w-3 h-3 text-white" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Journal section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base" style={{ color: '#1C1C18' }}>Journal</h2>
          {entries.length > 3 && (
            <button
              onClick={() => setShowAllJournal(p => !p)}
              className="text-xs font-semibold"
              style={{ color: TC }}
            >
              {showAllJournal ? 'Show Less' : 'View Journal'}
            </button>
          )}
        </div>

        {entries.length > 0 ? (
          <div className="space-y-2">
            {displayedEntries.map(entry => (
              <div key={entry.id} className="rounded-2xl p-4 space-y-1.5" style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}>
                <p className="text-xs font-semibold" style={{ color: MUTED }}>{getTimeLabel(entry.date)}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#1C1C18' }}>"{entry.text}"</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-5 text-center" style={{ background: '#F7F3ED', border: `1px dashed ${BORDER}` }}>
            <p className="text-sm font-medium" style={{ color: MUTED }}>What's on your mind…</p>
            <p className="text-xs mt-1" style={{ color: '#B5A09A' }}>Use the EZ button or Voice Journal to add an entry.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Rituals;
