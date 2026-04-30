import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

const LANGUAGES = [
  { code: "en",    flag: "🇺🇸", label: "English (US)" },
  { code: "en-GB", flag: "🇬🇧", label: "English (UK)" },
  { code: "de",    flag: "🇩🇪", label: "Deutsch" },
  { code: "fr",    flag: "🇫🇷", label: "Français" },
  { code: "it",    flag: "🇮🇹", label: "Italiano" },
];

interface Props {
  /** "dark" for public splash pages, "auto" for in-app (default) */
  variant?: "dark" | "auto";
}

export function LanguageSwitcher({ variant = "auto" }: Props) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  const change = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("eazy-family-language", code);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isDark = variant === "dark";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
          isDark
            ? "hover:bg-white/10 text-white/80 hover:text-white"
            : "hover:bg-muted text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Change language"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline text-xs font-medium">{current.code.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-xl border overflow-hidden min-w-[160px]"
          style={isDark
            ? { background: "hsl(270 30% 8%)", borderColor: "hsl(270 40% 22%)" }
            : undefined}
        >
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => change(lang.code)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                lang.code === i18n.language
                  ? isDark ? "bg-white/10 font-medium text-white" : "bg-primary/10 font-medium text-primary"
                  : isDark ? "text-white/80 hover:bg-white/8" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
