import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronDown, ChevronUp, Mail, MessageCircle, Sparkles, Calendar, CheckSquare, ShoppingCart, Users, Bell, Mic } from "lucide-react";

const TC = 'hsl(var(--primary))';
const BG = 'hsl(var(--background))';
const CARD = 'hsl(var(--card))';
const BORDER = 'hsl(var(--border))';
const DIVIDER = 'hsl(var(--border))';
const MUTED = 'hsl(var(--muted-foreground))';
const INK = 'hsl(var(--foreground))';
const SAGE = '#44664F';
const SAGE_BG = '#EEF4F0';
const SAGE_BORDER = '#C8DDD0';

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

const HelpCenter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [tab, setTab] = useState<'features' | 'faqs' | 'contact'>(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('tab');
    if (t === 'faqs' || t === 'contact' || t === 'features') return t;
    return 'features';
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('tab');
    if (t === 'faqs' || t === 'contact' || t === 'features') setTab(t);
  }, [location.search]);

  const TABS = [
    { id: 'features' as const, label: t('helpCenter.tabs.features') },
    { id: 'faqs' as const, label: t('helpCenter.tabs.faqs') },
    { id: 'contact' as const, label: t('helpCenter.tabs.contact') },
  ];

  const FEATURES = [
    { icon: <Calendar className="w-5 h-5" />, color: TC, bg: '#FEF3F0', key: 'calendar' },
    { icon: <CheckSquare className="w-5 h-5" />, color: '#6E8FE5', bg: '#EEF1FD', key: 'tasks' },
    { icon: <ShoppingCart className="w-5 h-5" />, color: SAGE, bg: SAGE_BG, key: 'shopping' },
    { icon: <Users className="w-5 h-5" />, color: '#EE7BB0', bg: '#FEF0F7', key: 'channel' },
    { icon: <Bell className="w-5 h-5" />, color: '#B88A00', bg: '#FFF7E0', key: 'rituals' },
    { icon: <Mic className="w-5 h-5" />, color: TC, bg: '#FEF3F0', key: 'capture' },
  ];

  const faqs: { q: string; a: string }[] = t('helpCenter.faqs', { returnObjects: true }) as any;

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: BG, paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center -ml-1">
            <ChevronLeft className="w-5 h-5" style={{ color: INK }} />
          </button>
          <p className="flex-1 text-center font-bold text-base" style={{ color: INK }}>{t('helpCenter.title')}</p>
          <div className="w-9" />
        </div>

        {/* Tabs */}
        <div className="flex px-4 pb-3 gap-2">
          {TABS.map(tb => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: tab === tb.id ? TC : CARD,
                color: tab === tb.id ? '#fff' : MUTED,
                border: `1px solid ${tab === tb.id ? TC : BORDER}`,
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 pb-16">

        {/* ── Features tab ── */}
        {tab === 'features' && (
          <>
            {/* EZ Orbe intro */}
            <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${TC} 0%, #D97B66 100%)` }}>
              <div className="p-5 space-y-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">{t('helpCenter.orbeIntro.title')}</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {t('helpCenter.orbeIntro.body')}
                </p>
                <ul className="space-y-1.5">
                  {(['tip1', 'tip2', 'tip3'] as const).map(tip => (
                    <li key={tip} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                      {t(`helpCenter.orbeIntro.${tip}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(f => (
                <div key={f.key} className="rounded-2xl p-4 space-y-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: f.bg, color: f.color }}>
                    {f.icon}
                  </div>
                  <p className="text-sm font-semibold" style={{ color: INK }}>{t(`helpCenter.features.${f.key}.title`)}</p>
                  <p className="text-xs leading-snug" style={{ color: MUTED }}>{t(`helpCenter.features.${f.key}.desc`)}</p>
                </div>
              ))}
            </div>

            {/* Morning Digest */}
            <div className="rounded-2xl p-4 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#FFF7E0' }}>
                <Bell className="w-4 h-4" style={{ color: '#B88A00' }} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: INK }}>{t('helpCenter.morningDigest.title')}</p>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                  {t('helpCenter.morningDigest.body')}
                </p>
              </div>
              <div className="rounded-xl p-3 space-y-1" style={{ background: SAGE_BG, border: `1px solid ${SAGE_BORDER}` }}>
                <p className="text-xs font-semibold" style={{ color: SAGE }}>{t('rituals.title')}</p>
                <p className="text-xs leading-relaxed" style={{ color: SAGE }}>
                  {t('helpCenter.morningDigest.ritualsNote')}
                </p>
              </div>
              <p className="text-xs" style={{ color: MUTED }}>
                {t('helpCenter.morningDigest.enableHint')}
              </p>
            </div>
          </>
        )}

        {/* ── FAQs tab ── */}
        {tab === 'faqs' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            {Array.isArray(faqs) && faqs.map((faq, i) => (
              <FAQ key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        )}

        {/* ── Contact tab ── */}
        {tab === 'contact' && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
              {t('helpCenter.contact.intro')}
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <a href="mailto:hello@eazy.family"
                className="flex items-center gap-3 px-4 py-4"
                style={{ borderBottom: `1px solid ${DIVIDER}` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: SAGE_BG }}>
                  <MessageCircle className="w-4 h-4" style={{ color: SAGE }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: INK }}>{t('helpCenter.contact.general')}</p>
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
                  <p className="text-sm font-semibold" style={{ color: INK }}>{t('helpCenter.contact.support')}</p>
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
