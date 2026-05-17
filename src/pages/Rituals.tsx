import { useState, useEffect, useRef } from "react";
import { Mic, Plus, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { haptic } from "@/lib/haptic";
import { useTranslation } from 'react-i18next';
import { cloudSet } from "@/lib/preferencesSync";

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

const pickRitualEmoji = (title: string): string => {
  const t = title.toLowerCase();
  if (/morning|sunrise|wake|rise|start/.test(t)) return '☀️';
  if (/evening|night|sunset|bed|sleep|wind/.test(t)) return '🌙';
  if (/run|jog|workout|gym|sport|exercise|train|cardio/.test(t)) return '🏃';
  if (/yoga|meditat|mindful|breath|calm|peace/.test(t)) return '🧘';
  if (/love|hug|family|togeth|connect|bond|couple/.test(t)) return '❤️';
  if (/read|book|learn|study|library/.test(t)) return '📚';
  if (/music|sing|song|guitar|piano|instrument/.test(t)) return '🎵';
  if (/garden|plant|nature|outdoor|fresh|walk|hike/.test(t)) return '🌿';
  if (/tea|coffee|drink|water|juice|smoothie/.test(t)) return '🍵';
  if (/journal|write|diary|reflect|note/.test(t)) return '✍️';
  if (/strength|lift|push|pull|weight/.test(t)) return '💪';
  if (/goal|target|focus|achieve|plan|review/.test(t)) return '🎯';
  if (/clean|tidy|organiz|declutter/.test(t)) return '🧹';
  if (/cook|meal|food|prep|lunch|dinner|breakfast/.test(t)) return '🍳';
  if (/kid|child|parent|dad|mom|story|stoytime/.test(t)) return '👨‍👩‍👧';
  if (/art|draw|paint|sketch|creat/.test(t)) return '🎨';
  if (/bath|shower|groom|hygien|skin/.test(t)) return '🛁';
  if (/swim|pool|lap/.test(t)) return '🏊';
  if (/bike|cycl|ride/.test(t)) return '🚴';
  if (/stretch|flex|mobility/.test(t)) return '🤸';
  if (/dog|pet|animal/.test(t)) return '🐕';
  if (/nap|rest|relax/.test(t)) return '💤';
  if (/sun|dawn|dusk|golden/.test(t)) return '🌅';
  if (/screen|phone|digital|detox/.test(t)) return '📵';
  if (/vitamin|supplement|pill|health/.test(t)) return '💊';
  if (/gratitude|thank|bless/.test(t)) return '🙏';
  if (/15 min|quick|short|brief/.test(t)) return '⏱️';
  return '✨';
};

const getJournalSettings = () => {
  try {
    const s = localStorage.getItem('eazy-journal-settings');
    if (s) return JSON.parse(s) as { showOnRituals: boolean; displayCount: number };
  } catch {}
  return { showOnRituals: true, displayCount: 3 };
};

const Rituals = () => {
  const { t } = useTranslation();
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
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);

  // Swipe gesture state (DOM-level, no re-renders during drag)
  const touchData = useRef<{ startX: number; id: string; el: HTMLDivElement } | null>(null);
  const innerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const recognitionRef = useRef<any>(null);
  // Use refs for transcript capture — avoids closure/race-condition issues on iOS
  const capturedRef = useRef('');
  const savedRef = useRef(false);
  const DELETE_W = 72;

  const TC = '#964735';
  const TL = '#D97B66';
  const BORDER = '#DAC1BB';
  const MUTED = '#7A6660';

  const reloadEntries = () => {
    const stored = localStorage.getItem('eazy-journal-entries');
    setEntries(stored ? JSON.parse(stored) : []);
  };

  useEffect(() => {
    reloadEntries();
    const todayStr = new Date().toDateString();
    try {
      const stored = localStorage.getItem('eazy-completed-rituals-today');
      if (stored) {
        const parsed = JSON.parse(stored);
        // New format: { date, ids }. Old format: plain array (backward compat, treat as today)
        if (Array.isArray(parsed)) {
          setCompletedRituals(new Set(parsed));
        } else if (parsed.date === todayStr) {
          setCompletedRituals(new Set(parsed.ids || []));
        }
        // else: stale (different day) — leave as empty Set
      }
    } catch {}
    window.addEventListener('eazy-journal-updated', reloadEntries);
    return () => window.removeEventListener('eazy-journal-updated', reloadEntries);
  }, []);

  const EMOJI_PALETTE = ['☀️','🌙','🏃','🧘','❤️','📚','🎵','🌿','🍵','✍️','💪','🎯','🧹','🍳','👨‍👩‍👧','🎨','🛁','🏊','🚴','🤸','🐕','💤','🌅','📵','💊','🙏','⏱️','✨'];

  const saveRituals = (list: Ritual[]) => {
    setRituals(list);
    cloudSet('eazy-rituals-list', JSON.stringify(list));
  };

  const updateRitualEmoji = (id: string, emoji: string) => {
    const updated = rituals.map(r => r.id === id ? { ...r, emoji } : r);
    saveRituals(updated);
    setEmojiPickerFor(null);
  };

  const toggleRitual = (id: string) => {
    const willComplete = !completedRituals.has(id);
    haptic(willComplete ? 'medium' : 'light');
    if (willComplete) {
      // Play bounce first, then move to Done after animation completes
      setJustCompletedId(id);
      setTimeout(() => {
        setJustCompletedId(null);
        setCompletedRituals(prev => {
          const next = new Set(prev);
          next.add(id);
          const todayStr = new Date().toDateString();
          localStorage.setItem('eazy-completed-rituals-today', JSON.stringify({ date: todayStr, ids: [...next] }));
          return next;
        });
      }, 350);
    } else {
      setCompletedRituals(prev => {
        const next = new Set(prev);
        next.delete(id);
        const todayStr = new Date().toDateString();
        localStorage.setItem('eazy-completed-rituals-today', JSON.stringify({ date: todayStr, ids: [...next] }));
        return next;
      });
    }
  };

  const addRitual = () => {
    if (!newRitualTitle.trim()) return;
    const r: Ritual = { id: crypto.randomUUID(), title: newRitualTitle.trim(), emoji: pickRitualEmoji(newRitualTitle), time: 'Any' };
    saveRituals([...rituals, r]);
    setNewRitualTitle('');
    haptic('light');
  };

  const removeRitual = (id: string) => {
    haptic('light');
    saveRituals(rituals.filter(r => r.id !== id));
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    // onend handles save + state reset
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    capturedRef.current = '';
    savedRef.current = false;
    setVoiceText('');

    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = true;
    r.continuous = false;   // iOS doesn't support continuous reliably
    r.maxAlternatives = 1;

    r.onresult = (e: any) => {
      // Accumulate all result segments
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      capturedRef.current = transcript;
      setVoiceText(transcript);

      // Save immediately on final result — primary path for mobile (iOS fires
      // onend before onresult in some WebKit versions, this avoids that race)
      if (e.results[e.results.length - 1].isFinal && !savedRef.current) {
        savedRef.current = true;
        saveEntry(transcript);
      }
    };

    r.onend = () => {
      setIsListening(false);
      setVoiceText('');
      // Fallback: save if onresult final never fired (network/timeout failure on iOS)
      if (!savedRef.current && capturedRef.current.trim()) {
        savedRef.current = true;
        saveEntry(capturedRef.current);
      }
      capturedRef.current = '';
      savedRef.current = false;
    };

    r.onerror = (e: any) => {
      if (e.error === 'aborted') return; // user tapped stop — normal
      setIsListening(false);
      setVoiceText('');
      capturedRef.current = '';
      savedRef.current = false;
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

  const deleteEntry = (id: string) => {
    haptic('light');
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    localStorage.setItem('eazy-journal-entries', JSON.stringify(updated));
    setOpenSwipeId(null);
  };

  // Close any open swipe when tapping outside
  const closeSwipe = (id?: string) => {
    if (openSwipeId && openSwipeId !== id) {
      const el = innerRefs.current.get(openSwipeId);
      if (el) { el.style.transition = 'transform 0.2s ease'; el.style.transform = 'translateX(0)'; }
      setOpenSwipeId(null);
    }
  };

  // Touch handlers — DOM manipulation during drag, single setState on end
  const onTouchStart = (e: React.TouchEvent, id: string) => {
    closeSwipe(id);
    const el = innerRefs.current.get(id);
    if (!el) return;
    touchData.current = { startX: e.touches[0].clientX, id, el };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchData.current) return;
    const { startX, id, el } = touchData.current;
    const delta = e.touches[0].clientX - startX;
    const base = openSwipeId === id ? -DELETE_W : 0;
    const x = Math.min(0, Math.max(delta + base, -DELETE_W));
    el.style.transition = 'none';
    el.style.transform = `translateX(${x}px)`;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchData.current) return;
    const { startX, id, el } = touchData.current;
    const delta = e.changedTouches[0].clientX - startX;
    el.style.transition = 'transform 0.2s ease';

    if (delta < -40) {
      el.style.transform = `translateX(-${DELETE_W}px)`;
      setOpenSwipeId(id);
    } else if (delta > 10 || openSwipeId !== id) {
      el.style.transform = 'translateX(0)';
      setOpenSwipeId(null);
    } else {
      el.style.transform = `translateX(-${DELETE_W}px)`;
    }
    touchData.current = null;
  };

  const pct = rituals.length > 0 ? Math.round((completedRituals.size / rituals.length) * 100) : 0;

  const getTimeLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const hour = d.getHours();
    const dayTime = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    return `${format(d, 'EEEE')} ${dayTime}`;
  };

  const settings = getJournalSettings();
  const baseCount = settings.displayCount === -1 ? entries.length : settings.displayCount;
  const displayedEntries = showAllJournal ? entries : entries.slice(0, baseCount);
  const hasMore = !showAllJournal && entries.length > baseCount;

  return (
    <div className="space-y-5 p-4" style={{ paddingBottom: '2rem' }}>

      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#B5A09A' }}>{t('rituals.privateSpace')}</p>

      {/* Voice Journal — compact bar */}
      <div className="rounded-2xl overflow-hidden" style={{ background: TC }}>
        <div className="px-5 py-4 flex items-center gap-4">
          {/* Mic button with ping ring when active */}
          <div className="relative flex-shrink-0 w-11 h-11">
            {isListening && (
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: 'rgba(255,255,255,0.35)' }}
              />
            )}
            <button
              onClick={isListening ? stopListening : startListening}
              className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all"
              style={{ background: isListening ? TL : 'rgba(255,255,255,0.2)' }}
            >
              <Mic className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white">
              {isListening ? t('rituals.tapToStop') : t('rituals.voiceJournal')}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {isListening
                ? (voiceText || t('rituals.listening'))
                : t('rituals.tapMicToRecord')}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Rituals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base" style={{ color: '#1C1C18' }}>{t('rituals.title')}</h2>
          <button
            onClick={() => { setEditMode(p => !p); setNewRitualTitle(''); }}
            className="text-xs font-semibold"
            style={{ color: TC }}
          >
            {editMode ? t('rituals.done') : t('rituals.editList')}
          </button>
        </div>

        <div className="w-full h-1.5 rounded-full mb-3" style={{ background: '#F1EDE7' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: TC }} />
        </div>

        <div onClick={() => setEmojiPickerFor(null)}>
          {/* Active rituals */}
          <div className="grid grid-cols-2 gap-2">
            {rituals.filter(r => !completedRituals.has(r.id)).map(r => (
              <div key={r.id} className="relative" style={{ overflow: 'visible' }}>
                <button
                  onClick={() => !editMode && toggleRitual(r.id)}
                  className="w-full flex items-center gap-2 p-3 rounded-xl text-left"
                  style={{
                    background: '#F7F3ED',
                    border: `1px solid ${BORDER}`,
                    cursor: editMode ? 'default' : 'pointer',
                    transform: justCompletedId === r.id ? 'scale(1.06)' : 'scale(1)',
                    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    position: 'relative',
                  }}
                >
                  <span
                    className="text-lg"
                    style={{ cursor: editMode ? 'pointer' : 'default', position: 'relative' }}
                    onClick={(e) => { if (editMode) { e.stopPropagation(); setEmojiPickerFor(emojiPickerFor === r.id ? null : r.id); } }}
                  >
                    {r.emoji}
                    {/* Emoji picker popover */}
                    {editMode && emojiPickerFor === r.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: 'absolute', top: '110%', left: 0, zIndex: 50,
                          background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12,
                          padding: 8, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4,
                          boxShadow: '0 4px 16px rgba(28,28,24,0.12)', width: 196,
                        }}
                      >
                        {EMOJI_PALETTE.map(em => (
                          <button
                            key={em}
                            onClick={() => updateRitualEmoji(r.id, em)}
                            style={{ fontSize: 18, lineHeight: 1, padding: 4, borderRadius: 6, border: 'none', background: r.emoji === em ? '#FDF3EE' : 'transparent', cursor: 'pointer' }}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate" style={{ color: '#1C1C18' }}>{r.title}</p>
                  </div>
                </button>
                {editMode && (
                  <button
                    onClick={() => removeRitual(r.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: TC }}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            ))}

            {editMode && (
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#F7F3ED', border: `1px dashed ${BORDER}` }}>
                <span className="text-lg flex-shrink-0">{pickRitualEmoji(newRitualTitle)}</span>
                <input
                  value={newRitualTitle}
                  onChange={e => setNewRitualTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRitual()}
                  placeholder={t('rituals.newRitualPlaceholder')}
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

          {/* Done section */}
          {completedRituals.size > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, height: '0.5px', background: '#DAC1BB' }} />
                <span style={{ fontSize: 10, color: '#B5A09A', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Done · {completedRituals.size}/{rituals.length}
                </span>
                <div style={{ flex: 1, height: '0.5px', background: '#DAC1BB' }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {rituals.filter(r => completedRituals.has(r.id)).map(r => (
                  <button
                    key={r.id}
                    onClick={() => !editMode && toggleRitual(r.id)}
                    className="w-full flex items-center gap-2 p-3 rounded-xl text-left"
                    style={{
                      background: '#F9F6F2',
                      border: `1px solid #EDE4DF`,
                      opacity: 0.7,
                      cursor: editMode ? 'default' : 'pointer',
                    }}
                  >
                    <span className="text-lg">{r.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate" style={{ color: '#B5A09A', textDecoration: 'line-through' }}>{r.title}</p>
                      <p className="text-[10px]" style={{ color: TC, fontWeight: 600 }}>✓ {t('rituals.ritualDone')}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Journal section */}
      {settings.showOnRituals && (
        <div onClick={() => closeSwipe()}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base" style={{ color: '#1C1C18' }}>{t('rituals.journal')}</h2>
            {!showAllJournal && entries.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setShowAllJournal(true); }}
                className="text-xs font-semibold"
                style={{ color: TC }}
              >
                {t('rituals.viewJournal')}
              </button>
            )}
            {showAllJournal && entries.length > baseCount && (
              <button
                onClick={e => { e.stopPropagation(); setShowAllJournal(false); }}
                className="text-xs font-semibold"
                style={{ color: TC }}
              >
                {t('rituals.showLess')}
              </button>
            )}
          </div>

          {entries.length > 0 ? (
            <div className="space-y-2">
              {displayedEntries.map(entry => (
                <div
                  key={entry.id}
                  className="relative rounded-2xl overflow-hidden"
                  style={{ border: `1px solid ${BORDER}` }}
                >
                  {/* Delete button — revealed by swipe */}
                  <div
                    className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
                    style={{ width: `${DELETE_W}px`, background: '#C0392B' }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                      className="flex flex-col items-center gap-1"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                      <span className="text-white text-[10px] font-semibold">{t('rituals.deleteEntry')}</span>
                    </button>
                  </div>

                  {/* Entry content — slides left on swipe */}
                  <div
                    ref={el => { if (el) innerRefs.current.set(entry.id, el); else innerRefs.current.delete(entry.id); }}
                    className="relative p-4"
                    style={{ background: '#FFFFFF', willChange: 'transform' }}
                    onTouchStart={e => onTouchStart(e, entry.id)}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1.5">
                        <p className="text-xs font-semibold" style={{ color: MUTED }}>{getTimeLabel(entry.date)}</p>
                        <p className="text-sm leading-relaxed" style={{ color: '#1C1C18' }}>"{entry.text}"</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full mt-0.5"
                        style={{ background: '#FBF0EE' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: '#C0392B' }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl p-5 text-center" style={{ background: '#F7F3ED', border: `1px dashed ${BORDER}` }}>
              <p className="text-sm font-medium" style={{ color: MUTED }}>{t('rituals.whatsOnYourMind')}</p>
              <p className="text-xs mt-1" style={{ color: '#B5A09A' }}>{t('rituals.useVoiceHint')}</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Rituals;
