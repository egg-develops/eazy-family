import { useState, useCallback, useRef } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { getSpeechLocale } from '@/lib/speechLocale';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

const T = {
  bg: '#FDF9F3', card: '#FFFFFF', ink: '#1C1C18', inkV: '#55433F',
  faint: '#87726E', outline: '#DAC1BB', primary: '#964735',
  primaryL: '#D97B66', primaryS: '#FFDAD3', secondary: '#44664F', secondaryS: '#C6ECCF',
};
const LORA = "'Lora', 'Georgia', serif";
const SANS = "'DM Sans', 'Inter', system-ui, sans-serif";

type Phase = 'idle' | 'listening' | 'processing' | 'success' | 'error';

interface CaptureResult {
  type: 'task' | 'shopping' | 'event';
  title: string;
  emoji: string;
}

const TYPE_CONFIG = {
  shopping: { label: 'Shopping list', color: T.secondary, bg: T.secondaryS },
  event:    { label: 'Calendar',      color: '#1565C0',   bg: '#BBDEFB' },
  task:     { label: 'Task',          color: T.primary,   bg: T.primaryS },
};

const CLASSIFY_PROMPT = `You are a family organizer assistant. Classify the user's voice input and return ONLY a JSON object.

Return: {"type":"shopping"|"event"|"task", "title":"clean concise title", "emoji":"one relevant emoji"}

Rules:
- "shopping": anything to buy, groceries, products
- "event": calendar entries, appointments, meetings with a date/time
- "task": all other to-dos, chores, reminders

Keep the title short (max 8 words) and in the user's own language. No command verbs ("buy", "add", "create").`;

const MicIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const Spinner = () => (
  <div style={{
    width: 36, height: 36, borderRadius: '50%',
    border: `3px solid ${T.primaryS}`,
    borderTopColor: T.primary,
    animation: 'gc-spin 0.8s linear infinite',
  }} />
);

export const GuidedCaptureScreen = ({
  onComplete,
  onSkip,
}: {
  onComplete: () => void;
  onSkip: () => void;
}) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [showText, setShowText] = useState(false);
  const [textInput, setTextInput] = useState('');
  const processedRef = useRef(false);

  const { start, stop, isSingleShot } = useSpeechRecognition();
  const { t } = useTranslation();

  const processText = useCallback(async (text: string) => {
    if (processedRef.current || !text.trim()) return;
    processedRef.current = true;
    setTranscript(text);
    setPhase('processing');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('no session');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const response = await fetch(`${supabaseUrl}/functions/v1/eazy-chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: text }], systemPrompt: CLASSIFY_PROMPT, temperature: 0 }),
      });

      if (!response.ok || !response.body) throw new Error('fetch failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try { const d = JSON.parse(line.slice(6)); const c = d.choices?.[0]?.delta?.content; if (c) fullContent += c; } catch {}
          }
        }
      }
      if (buf) { try { const d = JSON.parse(buf.slice(6)); const c = d.choices?.[0]?.delta?.content; if (c) fullContent += c; } catch {} }

      const cleaned = fullContent.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(cleaned);
      if (!parsed.type || !parsed.title) throw new Error('bad parse');

      // Normalise type
      let taskType: 'task' | 'shopping' | 'event' = 'task';
      if (parsed.type === 'shopping' || parsed.type === 'shopping_personal') taskType = 'shopping';
      else if (parsed.type === 'event') taskType = 'event';

      // Ensure family and save task
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let familyId: string | null = null;
        const { data: membership } = await supabase
          .from('family_members').select('family_id').eq('user_id', user.id).maybeSingle();

        if (membership?.family_id) {
          familyId = membership.family_id;
        } else {
          const displayName = (user.user_metadata?.full_name as string | undefined) || user.email?.split('@')[0] || 'Me';
          const { data: family } = await supabase
            .from('families')
            .insert({ name: `${displayName}'s Family`, created_by: user.id })
            .select('id').single();
          if (family) {
            familyId = family.id;
            await supabase.from('family_members').insert({
              family_id: familyId, user_id: user.id, role: 'admin', display_name: displayName,
            });
          }
        }

        if (familyId) {
          await supabase.from('tasks').insert({
            family_id: familyId, user_id: user.id,
            title: parsed.title, type: taskType, status: 'pending',
          });
        }
      }

      setResult({
        type: taskType,
        title: parsed.title,
        emoji: (parsed.emoji as string) || (taskType === 'shopping' ? '🛒' : taskType === 'event' ? '📅' : '✅'),
      });
      setPhase('success');

    } catch (err) {
      console.error('[GuidedCapture]', err);
      processedRef.current = false;
      setPhase('error');
    }
  }, []);

  const handleMicTap = useCallback(() => {
    if (phase === 'listening') {
      stop();
      if (!isSingleShot && transcript.trim()) {
        processText(transcript);
      } else if (!isSingleShot) {
        setPhase('idle');
      }
      return;
    }
    if (phase !== 'idle' && phase !== 'error') return;

    processedRef.current = false;
    setPhase('listening');
    setTranscript('');

    start({
      lang: getSpeechLocale(),
      onResult: (tx: string, isFinal: boolean) => {
        setTranscript(tx);
        if (isFinal) processText(tx);
      },
      onError: () => {
        setPhase('idle');
        setShowText(true);
      },
      onEnd: () => {
        setPhase((p: Phase) => p === 'listening' ? 'idle' : p);
      },
    });
  }, [phase, start, stop, isSingleShot, transcript, processText]);

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    setShowText(false);
    processText(textInput.trim());
  };

  const retry = () => {
    processedRef.current = false;
    setTranscript('');
    setPhase('idle');
  };

  const cfg = result ? TYPE_CONFIG[result.type] : null;

  const examples = [
    { emoji: '🛒', text: t('onboarding.guidedCapture.exShopping') },
    { emoji: '📅', text: t('onboarding.guidedCapture.exEvent') },
    { emoji: '✅', text: t('onboarding.guidedCapture.exTask') },
  ];

  return (
    <>
      <style>{`
        @keyframes gc-spin { to { transform: rotate(360deg); } }
        @keyframes gc-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.85; } }
        @keyframes gc-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gc-bounce-in { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 24px 40px', gap: 28 }}>

        {/* Header */}
        <div style={{ animation: 'gc-fade-up 0.4s ease both' }}>
          <h2 style={{ fontFamily: LORA, fontSize: 26, fontWeight: 400, color: T.ink, margin: '0 0 6px', lineHeight: 1.2 }}>
            {t('onboarding.guidedCapture.title')}
          </h2>
          <p style={{ fontSize: 14, color: T.faint, margin: 0, lineHeight: 1.5 }}>
            {t('onboarding.guidedCapture.sub')}
          </p>
        </div>

        {/* Main interaction area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>

          {/* IDLE — examples + mic button */}
          {phase === 'idle' && !showText && (
            <>
              <div style={{ width: '100%', background: T.card, borderRadius: 20, padding: '16px', border: `1px solid ${T.outline}`, animation: 'gc-fade-up 0.5s ease 0.1s both' }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.faint, margin: '0 0 12px' }}>
                  {t('onboarding.guidedCapture.trySaying')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {examples.map(ex => (
                    <div key={ex.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{ex.emoji}</span>
                      <span style={{ fontSize: 14, color: T.inkV, fontStyle: 'italic' }}>"{ex.text}"</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleMicTap}
                style={{
                  width: 88, height: 88, borderRadius: '50%', border: 'none',
                  background: `radial-gradient(circle at 40% 40%, ${T.primaryL}, ${T.primary})`,
                  color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 8px 32px rgba(150,71,53,0.35)`,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <MicIcon size={32} />
              </button>
            </>
          )}

          {/* LISTENING */}
          {phase === 'listening' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: T.primary, margin: '0 0 4px' }}>
                  {t('onboarding.guidedCapture.listening')}
                </p>
                <p style={{ fontSize: 13, color: T.faint, margin: 0 }}>
                  {t('onboarding.guidedCapture.tapToStop')}
                </p>
              </div>

              {transcript && (
                <div style={{
                  width: '100%', background: T.primaryS, borderRadius: 16, padding: '14px 18px',
                  border: `1px solid ${T.outline}`, minHeight: 56, display: 'flex', alignItems: 'center',
                }}>
                  <p style={{ fontSize: 16, color: T.ink, margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
                    "{transcript}"
                  </p>
                </div>
              )}

              <button
                onClick={handleMicTap}
                style={{
                  width: 88, height: 88, borderRadius: '50%', border: `3px solid ${T.primary}`,
                  background: T.primaryS, color: T.primary, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'gc-pulse 1.4s ease-in-out infinite',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <MicIcon size={32} />
              </button>
            </div>
          )}

          {/* PROCESSING */}
          {phase === 'processing' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              {transcript && (
                <div style={{
                  width: '100%', background: T.primaryS, borderRadius: 16, padding: '14px 18px',
                  border: `1px solid ${T.outline}`,
                }}>
                  <p style={{ fontSize: 16, color: T.ink, margin: 0, fontStyle: 'italic' }}>"{transcript}"</p>
                </div>
              )}
              <Spinner />
              <p style={{ fontSize: 14, color: T.faint, margin: 0 }}>{t('onboarding.guidedCapture.processing')}</p>
            </div>
          )}

          {/* SUCCESS */}
          {phase === 'success' && result && cfg && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, animation: 'gc-fade-up 0.4s ease both' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: cfg.bg, border: `2px solid ${cfg.color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 34,
                animation: 'gc-bounce-in 0.45s cubic-bezier(0.16,1,0.3,1) both',
              }}>
                {result.emoji}
              </div>

              <div style={{
                width: '100%', background: T.card, borderRadius: 20, padding: '20px',
                border: `1.5px solid ${cfg.color}40`,
                boxShadow: `0 4px 20px ${cfg.color}18`,
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: cfg.bg, borderRadius: 9999, padding: '4px 12px', marginBottom: 10,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {cfg.label}
                  </span>
                </div>
                <p style={{ fontSize: 20, fontFamily: LORA, color: T.ink, margin: 0, lineHeight: 1.3 }}>
                  {result.title}
                </p>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                color: T.secondary, fontSize: 14, fontWeight: 500,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {t('onboarding.guidedCapture.successLabel')}
              </div>
            </div>
          )}

          {/* ERROR */}
          {phase === 'error' && (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <p style={{ fontSize: 14, color: '#BA1A1A', margin: 0 }}>{t('onboarding.guidedCapture.errorMsg')}</p>
              <button
                onClick={retry}
                style={{
                  padding: '10px 24px', borderRadius: 9999, border: `1.5px solid ${T.primary}`,
                  background: 'transparent', color: T.primary, fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', fontFamily: SANS,
                }}
              >
                {t('onboarding.guidedCapture.retry')}
              </button>
            </div>
          )}

          {/* TEXT FALLBACK */}
          {showText && phase === 'idle' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                autoFocus
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={t('onboarding.guidedCapture.typePlaceholder')}
                rows={3}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${T.primary}`,
                  background: '#FAFAF8', color: T.ink, fontSize: 15, fontFamily: SANS,
                  outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5,
                }}
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                style={{
                  width: '100%', padding: '14px', borderRadius: 9999, border: 'none',
                  background: textInput.trim() ? T.primary : T.outline, color: '#fff',
                  fontSize: 15, fontWeight: 500, cursor: textInput.trim() ? 'pointer' : 'default', fontFamily: SANS,
                }}
              >
                {t('onboarding.guidedCapture.continue')}
              </button>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {phase === 'success' && (
            <button
              onClick={onComplete}
              style={{
                width: '100%', padding: '15px 24px', borderRadius: 9999, border: 'none',
                background: T.primary, color: '#fff', fontFamily: SANS, fontSize: 15, fontWeight: 500,
                cursor: 'pointer', boxShadow: `0 4px 16px rgba(150,71,53,0.25)`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t('onboarding.guidedCapture.continue')} →
            </button>
          )}

          {phase === 'idle' && !showText && (
            <button
              onClick={() => setShowText(true)}
              style={{ background: 'none', border: 'none', fontSize: 13, color: T.faint, cursor: 'pointer', padding: '4px 0', fontFamily: SANS }}
            >
              {t('onboarding.guidedCapture.typeInstead')}
            </button>
          )}

          {phase !== 'success' && (
            <button
              onClick={onSkip}
              style={{ background: 'none', border: 'none', fontSize: 13, color: T.faint, cursor: 'pointer', padding: '4px 0', fontFamily: SANS }}
            >
              {t('onboarding.guidedCapture.skip')}
            </button>
          )}
        </div>
      </div>
    </>
  );
};
