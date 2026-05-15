import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronDown, ChevronUp, Mail, MessageCircle, Sparkles, Calendar, CheckSquare, ShoppingCart, Users, Bell, Mic } from "lucide-react";

const TC = '#964735';
const BG = '#F7F3ED';
const CARD = '#FFFFFF';
const BORDER = '#DAC1BB';
const DIVIDER = '#F1EDE7';
const MUTED = '#7A6660';
const INK = '#1C1C18';
const SAGE = '#44664F';
const SAGE_BG = '#EEF4F0';
const SAGE_BORDER = '#C8DDD0';

const FAQS = [
  {
    q: "How do I add an event to the calendar?",
    a: "Tap the EZ Orbe button at the bottom of the screen and say or type your event — e.g. \"Dentist appointment next Tuesday at 3pm\". EZ Orbe will parse the details and add it to your calendar automatically.",
  },
  {
    q: "Can multiple family members use the same account?",
    a: "Yes. Go to Settings → Account and invite members by email. Each person gets their own login and all shared content syncs in real time.",
  },
  {
    q: "What is the Family Channel?",
    a: "The Family Channel is a shared space where your family can send text messages, voice notes, photos, locations, documents, and polls — all in one place.",
  },
  {
    q: "How does voice input work?",
    a: "Tap the EZ Orbe button and speak naturally. EZ Orbe understands relative dates (\"tomorrow\", \"next Friday\"), times, and locations in English, German, French, and Italian.",
  },
  {
    q: "Why isn't voice input working?",
    a: "Make sure your browser has microphone permission. On iOS, use Safari. On Android, use Chrome. If you see a 'Microphone access denied' message, go to your browser's site settings and allow microphone access for eazy.family.",
  },
  {
    q: "How do I set up the Morning Digest?",
    a: "Go to Settings → Notifications and toggle on Morning Digest. You'll receive a daily summary at 8:00 AM with your schedule, open tasks, and anything that needs your attention. Enable email digest to receive it in your inbox as well.",
  },
  {
    q: "Can I use Eazy.Family offline?",
    a: "The app is a Progressive Web App (PWA) and can be installed on your home screen. Core features work offline; calendar and task sync requires an internet connection.",
  },
  {
    q: "How do I customise the homepage?",
    a: "Go to Settings → Homepage Modules to show or hide sections like Weather, Calendar Today, Top Tasks, Family Channel, and the Photo Gallery.",
  },
  {
    q: "Is my data private?",
    a: "Yes. All data is encrypted in transit and at rest. Your family data is never used to train AI models. You can configure your privacy level in Settings → AI & Privacy.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Settings → scroll to the bottom → Delete my account. This permanently removes all your data and cannot be undone.",
  },
];

const FEATURES = [
  { icon: <Calendar className="w-5 h-5" />, color: '#964735', bg: '#FEF3F0', title: "Calendar", desc: "Family calendar with shared events, recurring reminders, and Google/Outlook sync." },
  { icon: <CheckSquare className="w-5 h-5" />, color: '#6E8FE5', bg: '#EEF1FD', title: "Tasks", desc: "Personal and shared to-do lists, organised by category with due dates." },
  { icon: <ShoppingCart className="w-5 h-5" />, color: SAGE, bg: SAGE_BG, title: "Shopping", desc: "Shared and personal shopping lists with smart categories, voice input, and quantity controls." },
  { icon: <Users className="w-5 h-5" />, color: '#EE7BB0', bg: '#FEF0F7', title: "Family Channel", desc: "Shared family chat with text, voice notes, photos, location sharing, and polls." },
  { icon: <Bell className="w-5 h-5" />, color: '#B88A00', bg: '#FFF7E0', title: "Rituals", desc: "Track daily habits and family routines with a simple check-in system." },
  { icon: <Mic className="w-5 h-5" />, color: TC, bg: '#FEF3F0', title: "EZ Capture", desc: "Add anything to your family life with voice or text — EZ Orbe routes it to the right place." },
];

const FAQ = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${DIVIDER}` }}>
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3"
        onClick={() => setOpen(p => !p)}
      >
        <span className="text-sm font-medium flex-1" style={{ color: INK }}>{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{a}</p>
        </div>
      )}
    </div>
  );
};

const TABS = ['Features', 'FAQs', 'Contact'] as const;
type Tab = typeof TABS[number];

const HelpCenter = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('Features');

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: BG, paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center -ml-1">
            <ChevronLeft className="w-5 h-5" style={{ color: INK }} />
          </button>
          <p className="flex-1 text-center font-bold text-base" style={{ color: INK }}>Help Center</p>
          <div className="w-9" />
        </div>

        {/* Tabs */}
        <div className="flex px-4 pb-3 gap-2">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: tab === t ? TC : CARD,
                color: tab === t ? '#fff' : MUTED,
                border: `1px solid ${tab === t ? TC : BORDER}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 pb-16">

        {/* ── Features tab ── */}
        {tab === 'Features' && (
          <>
            {/* EZ Orbe intro */}
            <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${TC} 0%, #D97B66 100%)` }}>
              <div className="p-5 space-y-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">Meet EZ Orbe</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  EZ Orbe brings every feature that manages the day-to-day of your family life — calendar, events, and every to-do — into one button, and your voice manages it all.
                </p>
                <ul className="space-y-1.5">
                  {[
                    "Tap to open EZ Capture",
                    "Long press + drag to reposition",
                    "Swipe up to open the full menu",
                  ].map(tip => (
                    <li key={tip} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(f => (
                <div key={f.title} className="rounded-2xl p-4 space-y-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: f.bg, color: f.color }}>
                    {f.icon}
                  </div>
                  <p className="text-sm font-semibold" style={{ color: INK }}>{f.title}</p>
                  <p className="text-xs leading-snug" style={{ color: MUTED }}>{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Morning Digest */}
            <div className="rounded-2xl p-4 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#FFF7E0' }}>
                <Bell className="w-4 h-4" style={{ color: '#B88A00' }} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: INK }}>Every morning, one notification.</p>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                  Today's schedule, open tasks, and anything that needs your attention. Your family's day, already organised before you've had your coffee.
                </p>
              </div>
              <div className="rounded-xl p-3 space-y-1" style={{ background: SAGE_BG, border: `1px solid ${SAGE_BORDER}` }}>
                <p className="text-xs font-semibold" style={{ color: SAGE }}>Rituals & Journal</p>
                <p className="text-xs leading-relaxed" style={{ color: SAGE }}>
                  Your Morning Digest also gently reflects on your rituals — not as a to-do list, but as a quiet nudge toward the things that make your days feel whole.
                </p>
              </div>
              <p className="text-xs" style={{ color: MUTED }}>
                Enable in <span className="font-semibold" style={{ color: TC }}>Settings → Notifications → Morning Digest</span>.
              </p>
            </div>
          </>
        )}

        {/* ── FAQs tab ── */}
        {tab === 'FAQs' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            {FAQS.map((faq, i) => (
              <FAQ key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        )}

        {/* ── Contact tab ── */}
        {tab === 'Contact' && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
              We're a small team and we read every message. Expect a reply within one business day.
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <a href="mailto:hello@eazy.family"
                className="flex items-center gap-3 px-4 py-4"
                style={{ borderBottom: `1px solid ${DIVIDER}` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: SAGE_BG }}>
                  <MessageCircle className="w-4 h-4" style={{ color: SAGE }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: INK }}>General & Feedback</p>
                  <p className="text-xs mt-0.5" style={{ color: MUTED }}>hello@eazy.family</p>
                </div>
                <span className="text-xs font-semibold" style={{ color: TC }}>Email →</span>
              </a>
              <a href="mailto:support@eazy.family"
                className="flex items-center gap-3 px-4 py-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFF0EE' }}>
                  <Mail className="w-4 h-4" style={{ color: TC }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: INK }}>Technical Support</p>
                  <p className="text-xs mt-0.5" style={{ color: MUTED }}>support@eazy.family</p>
                </div>
                <span className="text-xs font-semibold" style={{ color: TC }}>Email →</span>
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default HelpCenter;
