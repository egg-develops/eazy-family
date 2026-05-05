import { useState, useEffect } from "react";
import { X, Mic, Calendar, CheckSquare, Settings, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Slide {
  icon: React.ReactNode;
  accent: string;
  title: string;
  body: string;
  hint?: string;
}

const SLIDES: Slide[] = [
  {
    icon: <Sparkles className="w-8 h-8 text-white" />,
    accent: "#6B3FBF",
    title: "Welcome to Eazy.Family",
    body: "Your family's private space — organized, connected, and always in sync.",
    hint: "A quick tour of the key features. Takes about 60 seconds.",
  },
  {
    icon: <Mic className="w-8 h-8 text-white" />,
    accent: "#EE7BB0",
    title: "Voice Shopping & Tasks",
    body: "Tap the mic and say things like \"Add milk and eggs to the shopping list\" or \"Remind me to call the dentist on Friday\" — Eazy handles the rest.",
    hint: "Works in English, German, French, and Italian.",
  },
  {
    icon: <Calendar className="w-8 h-8 text-white" />,
    accent: "#6E8FE5",
    title: "Shared Family Calendar",
    body: "One calendar for the whole family. Connect Google Calendar or Microsoft Outlook and all your events appear instantly — no double-entry.",
    hint: "Tap the mic on the Calendar page to add events by voice.",
  },
  {
    icon: <CheckSquare className="w-8 h-8 text-white" />,
    accent: "#FFC861",
    title: "To-Do's & Lists",
    body: "Shared to-do lists, shopping lists, and reminders — visible to everyone in your family the moment you add them.",
    hint: "Assign tasks to family members and track what's done.",
  },
  {
    icon: <Settings className="w-8 h-8 text-white" />,
    accent: "#8A5FE0",
    title: "Make It Yours",
    body: "Go to Settings to upload family photos for your home screen, set your language, and sync your calendar. Takes 2 minutes.",
    hint: "Up to 4 rotating hero images — your family, your style.",
  },
];

const DOT_ACTIVE = "#6B3FBF";
const DOT_IDLE = "#E9D8FD";

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

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [idx]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(26, 11, 46, 0.7)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "#FBF8FF" }}
      >
        {/* Dismiss */}
        <button
          onClick={onDone}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-grape-100"
          style={{ color: "#8A5FE0" }}
          aria-label="Skip tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon panel */}
        <div
          className="flex items-center justify-center pt-10 pb-8 transition-colors duration-500"
          style={{ background: `${slide.accent}18` }}
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transition-colors duration-500"
            style={{ background: slide.accent }}
          >
            {slide.icon}
          </div>
        </div>

        {/* Content */}
        <div className="px-7 pt-6 pb-4 space-y-3">
          <h2 className="font-serif text-xl font-light" style={{ color: "#1A0B2E" }}>
            {slide.title}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "#522793" }}>
            {slide.body}
          </p>
          {slide.hint && (
            <p className="text-xs leading-relaxed px-3 py-2 rounded-xl" style={{ background: "#F0E4FB", color: "#8A5FE0" }}>
              {slide.hint}
            </p>
          )}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 pt-2 pb-1">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === idx ? "20px" : "6px",
                height: "6px",
                borderRadius: "9999px",
                background: i === idx ? DOT_ACTIVE : DOT_IDLE,
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-7 pt-3 pb-7">
          <button
            onClick={onDone}
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: "#8A5FE0" }}
          >
            Skip tour
          </button>
          <Button
            onClick={next}
            className="text-white border-0 rounded-xl px-6 gap-1.5"
            style={{ background: slide.accent }}
          >
            {isLast ? "Let's go" : "Next"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
