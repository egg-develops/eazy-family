import { useState, useEffect, useRef } from 'react';

const T = {
  primary: '#964735',
  primaryL: '#D97B66',
  primaryS: '#FFDAD3',
  secondary: '#44664F',
  secondaryS: '#C6ECCF',
  tertiary: '#406373',
  tertiaryS: '#D4E8EF',
  ink: '#1C1C18',
  inkV: '#55433F',
  faint: '#87726E',
  outline: '#DAC1BB',
  bg: '#FDF9F3',
  card: '#FFFFFF',
};

const SECTION_DELAY = 220; // ms stagger between sections

const CONTENT: Record<string, {
  greeting: string;
  date: string;
  schedule: { time: string; title: string }[];
  task: string;
  shopping: string;
  win: string;
}> = {
  en: {
    greeting: 'Good morning, Sarah',
    date: 'Monday · 19 May',
    schedule: [{ time: '3:00 PM', title: 'School pickup — Zoe & Liam' }, { time: '7:30 PM', title: 'Date night' }],
    task: "Order Emma's birthday present — 3 days left",
    shopping: 'Running low on olive oil and pasta',
    win: 'Morning routine — 4 days straight ✓',
  },
  de: {
    greeting: 'Guten Morgen, Sarah',
    date: 'Montag · 19. Mai',
    schedule: [{ time: '15:00', title: 'Schulabholung — Zoe & Liam' }, { time: '19:30', title: 'Abendessen zu zweit' }],
    task: "Emmas Geburtstagsgeschenk bestellen — noch 3 Tage",
    shopping: 'Olivenöl und Pasta fast leer',
    win: 'Morgenroutine — 4 Tage in Folge ✓',
  },
  fr: {
    greeting: 'Bonjour, Sarah',
    date: 'Lundi · 19 mai',
    schedule: [{ time: '15h00', title: 'Ramassage scolaire — Zoe & Liam' }, { time: '19h30', title: 'Soirée en amoureux' }],
    task: "Commander le cadeau d'anniversaire d'Emma — dans 3 jours",
    shopping: "Il manque de l'huile d'olive et des pâtes",
    win: 'Routine matinale — 4 jours de suite ✓',
  },
  it: {
    greeting: 'Buongiorno, Sarah',
    date: 'Lunedì · 19 maggio',
    schedule: [{ time: '15:00', title: 'Ritiro scuola — Zoe & Liam' }, { time: '19:30', title: 'Serata in coppia' }],
    task: "Ordinare il regalo di compleanno di Emma — mancano 3 giorni",
    shopping: "Olio d'oliva e pasta quasi finiti",
    win: 'Routine mattutina — 4 giorni di fila ✓',
  },
  es: {
    greeting: 'Buenos días, Sarah',
    date: 'Lunes · 19 de mayo',
    schedule: [{ time: '15:00', title: 'Recogida escolar — Zoe & Liam' }, { time: '19:30', title: 'Noche romántica' }],
    task: "Pedir el regalo de cumpleaños de Emma — faltan 3 días",
    shopping: 'Poco aceite de oliva y pasta',
    win: 'Rutina matutina — 4 días seguidos ✓',
  },
  pt: {
    greeting: 'Bom dia, Sarah',
    date: 'Segunda · 19 de maio',
    schedule: [{ time: '15:00', title: 'Buscar as crianças — Zoe & Liam' }, { time: '19:30', title: 'Jantar a dois' }],
    task: "Encomendar o presente de aniversário da Emma — faltam 3 dias",
    shopping: 'Azeite e massa quase a acabar',
    win: 'Rotina matinal — 4 dias seguidos ✓',
  },
};

interface DigestMockProps {
  language: string;
}

export const DigestMock = ({ language }: DigestMockProps) => {
  const [visible, setVisible] = useState(0); // 0 = nothing, 1-5 = each section
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);

  const content = CONTENT[language] || CONTENT.en;

  useEffect(() => {
    alive.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisible(0);

    const after = (ms: number, fn: () => void) => {
      const t = setTimeout(() => { if (alive.current) fn(); }, ms);
      timers.current.push(t);
    };

    after(300,  () => setVisible(1));
    after(300 + SECTION_DELAY,     () => setVisible(2));
    after(300 + SECTION_DELAY * 2, () => setVisible(3));
    after(300 + SECTION_DELAY * 3, () => setVisible(4));
    after(300 + SECTION_DELAY * 4, () => setVisible(5));

    return () => { alive.current = false; timers.current.forEach(clearTimeout); };
  }, [language]);

  const section = (n: number, content: React.ReactNode) => ({
    opacity: visible >= n ? 1 : 0,
    transform: visible >= n ? 'translateY(0)' : 'translateY(10px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
  });

  return (
    <div style={{
      width: '100%',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(28,20,18,0.12)',
      border: `1px solid ${T.outline}`,
    }}>

      {/* Header gradient */}
      <div style={{
        background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryL} 100%)`,
        padding: '18px 20px 16px',
      }}>
        <div style={{ ...section(1, null), display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
              Morning Digest
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 18, fontWeight: 600, color: '#fff', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              {content.greeting}
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{content.date}</p>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: T.card, padding: '0 0 4px' }}>

        {/* Today's schedule */}
        <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${T.outline}30`, ...section(2, null) }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint }}>
            📅 Today's Schedule
          </p>
          {content.schedule.map((ev) => (
            <div key={ev.title} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.primary, minWidth: 44 }}>{ev.time}</span>
              <span style={{ fontSize: 13, color: T.inkV }}>{ev.title}</span>
            </div>
          ))}
        </div>

        {/* One thing */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${T.outline}30`, ...section(3, null) }}>
          <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint }}>
            ✅ One Thing
          </p>
          <p style={{ margin: 0, fontSize: 13, color: T.inkV, lineHeight: 1.45 }}>{content.task}</p>
        </div>

        {/* Shopping */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${T.outline}30`, ...section(4, null) }}>
          <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint }}>
            🛒 Shopping
          </p>
          <p style={{ margin: 0, fontSize: 13, color: T.inkV }}>{content.shopping}</p>
        </div>

        {/* The win */}
        <div style={{ padding: '12px 20px 16px', ...section(5, null) }}>
          <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint }}>
            🏆 The Win
          </p>
          <p style={{ margin: 0, fontSize: 13, color: T.secondary, fontWeight: 500 }}>{content.win}</p>
        </div>

      </div>
    </div>
  );
};
