import { useState, useEffect } from "react";
import { X, ArrowRight, Sparkles, Calendar, ShoppingCart, MessageCircle, Mic } from "lucide-react";

const TC = '#964735';
const TL = '#D97B66';
const BG = '#F7F3ED';
const CARD = '#FFFFFF';
const BORDER = '#DAC1BB';
const INK = '#1C1C18';
const MUTED = '#7A6660';

interface Slide {
  emoji?: string;
  icon?: React.ReactNode;
  accentBg: string;
  title: string;
  body: string;
  hint?: string;
}

const SLIDES: Slide[] = [
  {
    icon: <img src="/logo.png" alt="Eazy.Family" className="w-16 h-16 object-contain" />,
    accentBg: '#FDF3EE',
    title: "Welcome to Eazy.Family",
    body: "Your family's private space — organized, connected, and always in sync.",
    hint: "A quick 60-second look at the key features.",
  },
  {
    emoji: "✨",
    accentBg: '#FDF3EE',
    title: "The Orb — Your Command Center",
    body: "The glowing button at the bottom is your Orb. Tap it to add anything by voice or text — events, tasks, shopping, reminders, journal entries.",
    hint: "Try it: tap the Orb and say \"dentist on Monday at 3pm\".",
  },
  {
    icon: <Calendar className="w-8 h-8" style={{ color: TC }} />,
    accentBg: '#FDF3EE',
    title: "Shared Family Calendar",
    body: "One calendar for the whole family. Add events yourself or sync Google Calendar and Outlook — events appear instantly on every family member's home screen.",
    hint: "Connect your calendar in Settings → Calendar Sync.",
  },
  {
    icon: <ShoppingCart className="w-8 h-8" style={{ color: TC }} />,
    accentBg: '#FDF3EE',
    title: "Lists & Tasks",
    body: "Shared shopping lists, to-dos, and reminders — visible to everyone the moment you add them. Tick them off together in real time.",
    hint: "Use the Orb mic to add whole shopping lists at once.",
  },
  {
    icon: <MessageCircle className="w-8 h-8" style={{ color: TC }} />,
    accentBg: '#FDF3EE',
    title: "Family Channel",
    body: "A private group chat just for your family. Send text, voice notes, photos, and locations. Only your family can see it.",
    hint: "Find it under the Family tab.",
  },
  {
    icon: <Sparkles className="w-8 h-8" style={{ color: TC }} />,
    accentBg: '#FDF3EE',
    title: "Eazy AI",
    body: "Your home screen shows a smart daily digest — schedule conflicts, overdue tasks, shopping predictions. Ask Eazy anything in natural language.",
    hint: "Works in English, German, French, and Italian.",
  },
];

interface FeatureTourProps {
  onDone: () => void;
}

export function FeatureTour({ onDone }: FeatureTourProps) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  const next = () => {
    if (isLast) { onDone(); return; }
    setIdx(i => i + 1);
  };

  const prev = () => {
    if (idx > 0) setIdx(i => i - 1);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [idx]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
      style={{
        background: "rgba(28,20,18,0.6)",
        backdropFilter: "blur(8px)",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: CARD,
          boxShadow: '0 24px 64px rgba(28,20,18,0.25)',
          border: `1px solid ${BORDER}`,
        }}
      >
        {/* Dismiss */}
        <button
          onClick={onDone}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: '#F1EDE7', color: MUTED }}
          aria-label="Skip tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon panel */}
        <div
          className="flex items-center justify-center pt-10 pb-8"
          style={{ background: slide.accentBg }}
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: BG, border: `1px solid ${BORDER}`, boxShadow: `0 4px 20px rgba(150,71,53,0.15)` }}
          >
            {slide.icon ?? <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{slide.emoji}</span>}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pt-5 pb-2 space-y-2.5">
          <h2 className="text-lg font-bold leading-snug" style={{ color: INK }}>
            {slide.title}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
            {slide.body}
          </p>
          {slide.hint && (
            <p
              className="text-xs leading-relaxed px-3 py-2 rounded-xl"
              style={{ background: '#FDF3EE', color: TC, borderLeft: `3px solid ${TL}` }}
            >
              {slide.hint}
            </p>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-3">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === idx ? '20px' : '6px',
                height: '6px',
                borderRadius: '9999px',
                background: i === idx ? TC : BORDER,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 pb-6 pt-1">
          <button
            onClick={onDone}
            className="text-xs font-medium transition-opacity hover:opacity-60"
            style={{ color: MUTED }}
          >
            Skip
          </button>
          <button
            onClick={next}
            className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${TC}, ${TL})` }}
          >
            {isLast ? "Let's go" : "Next"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
