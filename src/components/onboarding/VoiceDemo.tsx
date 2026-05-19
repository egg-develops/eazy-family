import { useState, useEffect, useRef, useCallback } from 'react';

const T = {
  primary: '#964735',
  primaryL: '#D97B66',
  primaryS: '#FFDAD3',
  secondary: '#44664F',
  secondaryS: '#C6ECCF',
  ink: '#1C1C18',
  inkV: '#55433F',
  faint: '#87726E',
  outline: '#DAC1BB',
  bg: '#FDF9F3',
  card: '#FFFFFF',
};

const CONTENT: Record<string, { phrase: string; items: { emoji: string; text: string }[] }> = {
  en: { phrase: 'Add milk, eggs and bananas to our shopping list', items: [{ emoji: '🥛', text: 'Milk' }, { emoji: '🥚', text: 'Eggs' }, { emoji: '🍌', text: 'Bananas' }] },
  de: { phrase: 'Füge Milch, Eier und Bananen zur Einkaufsliste hinzu', items: [{ emoji: '🥛', text: 'Milch' }, { emoji: '🥚', text: 'Eier' }, { emoji: '🍌', text: 'Bananen' }] },
  fr: { phrase: 'Ajoute du lait, des œufs et des bananes à la liste', items: [{ emoji: '🥛', text: 'Lait' }, { emoji: '🥚', text: 'Œufs' }, { emoji: '🍌', text: 'Bananes' }] },
  it: { phrase: 'Aggiungi latte, uova e banane alla lista della spesa', items: [{ emoji: '🥛', text: 'Latte' }, { emoji: '🥚', text: 'Uova' }, { emoji: '🍌', text: 'Banane' }] },
  es: { phrase: 'Añade leche, huevos y plátanos a nuestra lista', items: [{ emoji: '🥛', text: 'Leche' }, { emoji: '🥚', text: 'Huevos' }, { emoji: '🍌', text: 'Plátanos' }] },
  pt: { phrase: 'Adiciona leite, ovos e bananas à nossa lista', items: [{ emoji: '🥛', text: 'Leite' }, { emoji: '🥚', text: 'Ovos' }, { emoji: '🍌', text: 'Bananas' }] },
};

type Phase = 'idle' | 'tapping' | 'listening' | 'transcribing' | 'processing' | 'results' | 'fading';

interface VoiceDemoProps {
  language: string;
}

export const VoiceDemo = ({ language }: VoiceDemoProps) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [wordCount, setWordCount] = useState(0);
  const [visibleItems, setVisibleItems] = useState(0);
  const [ripple, setRipple] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);

  const content = CONTENT[language] || CONTENT.en;
  const words = content.phrase.split(' ');

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const after = (ms: number, fn: () => void) => {
    const t = setTimeout(() => { if (alive.current) fn(); }, ms);
    timers.current.push(t);
  };

  const runLoop = useCallback(() => {
    clear();
    setPhase('idle');
    setWordCount(0);
    setVisibleItems(0);
    setRipple(false);

    let t = 1000;

    // Tap animation
    after(t, () => setRipple(true)); t += 120;
    after(t, () => { setPhase('tapping'); }); t += 300;
    after(t, () => { setRipple(false); setPhase('listening'); }); t += 500;

    // Words appear one by one at natural speech pace
    after(t, () => setPhase('transcribing'));
    for (let i = 1; i <= words.length; i++) {
      const wordT = t + (i * 155);
      after(wordT, () => setWordCount(i));
    }
    t += words.length * 155 + 350;

    // Processing
    after(t, () => setPhase('processing')); t += 650;

    // Results — items pop in
    after(t, () => setPhase('results'));
    for (let i = 1; i <= content.items.length; i++) {
      after(t + i * 230, () => setVisibleItems(i));
    }
    t += content.items.length * 230 + 2800;

    // Fade out then restart
    after(t, () => setPhase('fading')); t += 600;
    after(t, runLoop);
  }, [language]);

  useEffect(() => {
    alive.current = true;
    runLoop();
    return () => { alive.current = false; clear(); };
  }, [runLoop]);

  const transcript = words.slice(0, wordCount).join(' ');
  const isListening = phase === 'listening' || phase === 'transcribing';
  const isIdle = phase === 'idle' || phase === 'tapping';
  const isFading = phase === 'fading';

  return (
    <div style={{
      width: '100%',
      borderRadius: 20,
      background: T.card,
      border: `1px solid ${T.outline}`,
      padding: '20px 20px 16px',
      boxShadow: '0 4px 24px rgba(28,20,18,0.08)',
      opacity: isFading ? 0 : 1,
      transition: isFading ? 'opacity 0.5s ease' : 'opacity 0.3s ease',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.faint }}>
          Voice Input
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isListening && (
            <span style={{ fontSize: 10, color: T.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.primary, display: 'inline-block', animation: 'vd-blink 1s ease-in-out infinite' }} />
              Listening
            </span>
          )}
          {phase === 'processing' && (
            <span style={{ fontSize: 10, color: T.faint }}>Processing…</span>
          )}
        </div>
      </div>

      {/* Mic button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
        {/* Pulse rings — only when listening */}
        {isListening && (
          <>
            <div style={{ position: 'absolute', width: 64, height: 64, borderRadius: '50%', border: `1.5px solid ${T.primary}`, opacity: 0, animation: 'vd-ring 1.6s ease-out infinite' }} />
            <div style={{ position: 'absolute', width: 64, height: 64, borderRadius: '50%', border: `1.5px solid ${T.primary}`, opacity: 0, animation: 'vd-ring 1.6s ease-out infinite 0.5s' }} />
            <div style={{ position: 'absolute', width: 64, height: 64, borderRadius: '50%', border: `1.5px solid ${T.primary}`, opacity: 0, animation: 'vd-ring 1.6s ease-out infinite 1s' }} />
          </>
        )}

        {/* Ripple on tap */}
        {ripple && (
          <div style={{ position: 'absolute', width: 48, height: 48, borderRadius: '50%', background: T.primaryS, animation: 'vd-ripple 0.4s ease-out forwards' }} />
        )}

        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: isListening ? T.primary : isIdle ? T.bg : T.bg,
          border: `2px solid ${isListening ? T.primary : T.outline}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s ease',
          boxShadow: isListening ? `0 0 0 3px ${T.primaryS}` : 'none',
          zIndex: 1,
          position: 'relative',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isListening ? '#fff' : T.inkV} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
      </div>

      {/* Transcript area */}
      <div style={{
        minHeight: 36,
        marginBottom: 14,
        padding: '8px 12px',
        borderRadius: 10,
        background: isListening || phase === 'processing' || phase === 'results' ? `${T.primaryS}60` : 'transparent',
        border: `1px solid ${isListening ? T.primaryS : 'transparent'}`,
        transition: 'all 0.3s ease',
      }}>
        {(phase === 'transcribing' || phase === 'processing' || phase === 'results') && (
          <p style={{
            fontSize: 13,
            color: T.inkV,
            lineHeight: 1.5,
            margin: 0,
            fontStyle: 'italic',
          }}>
            "{transcript}{phase === 'transcribing' && wordCount < words.length ? (
              <span style={{ display: 'inline-block', width: 2, height: 13, background: T.primary, marginLeft: 2, animation: 'vd-cursor 0.8s step-end infinite', verticalAlign: 'text-bottom' }} />
            ) : '"'}
          </p>
        )}
        {isIdle && (
          <p style={{ fontSize: 12, color: T.faint, margin: 0, textAlign: 'center' }}>
            EZ listens, parses, and routes it
          </p>
        )}
      </div>

      {/* Results list */}
      <div style={{ minHeight: 96 }}>
        {(phase === 'results' || phase === 'fading') && content.items.map((item, i) => (
          <div
            key={item.text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 4px',
              borderBottom: i < content.items.length - 1 ? `1px solid ${T.outline}30` : 'none',
              opacity: visibleItems > i ? 1 : 0,
              transform: visibleItems > i ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.96)',
              transition: 'opacity 0.22s ease, transform 0.22s ease',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{item.emoji}</span>
            <span style={{ fontSize: 14, color: T.ink, fontWeight: 500, flex: 1 }}>{item.text}</span>
            {visibleItems > i && (
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: T.secondaryS,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'vd-check 0.2s ease',
              }}>
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke={T.secondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
        ))}
        {phase !== 'results' && phase !== 'fading' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 96, color: T.outline, fontSize: 12 }}>
            Items will appear here
          </div>
        )}
      </div>

      {/* Injected keyframes */}
      <style>{`
        @keyframes vd-ring {
          0%   { transform: scale(1);    opacity: 0.6; }
          100% { transform: scale(2.2);  opacity: 0;   }
        }
        @keyframes vd-ripple {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2);   opacity: 0;   }
        }
        @keyframes vd-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes vd-cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes vd-check {
          from { transform: scale(0); }
          to   { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
