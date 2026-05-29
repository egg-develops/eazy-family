import { useNavigate } from 'react-router-dom';

const TC = '#964735';
const TL = '#D97B66';
const BG = '#F7F3ED';
const INK = '#1C1C18';
const MUTED = '#7A6660';
const BORDER = '#DAC1BB';

interface Props {
  feature: string;
  onClose: () => void;
}

export const GuestUpgradeModal = ({ feature, onClose }: Props) => {
  const navigate = useNavigate();

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(28,20,18,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: BG, borderRadius: 24, padding: '28px 24px',
          width: '100%', maxWidth: 360,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 24px 64px rgba(28,20,18,0.18)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 28, margin: '0 0 12px' }}>🔐</p>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: INK, margin: '0 0 8px' }}>
            Account required
          </h2>
          <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: INK }}>{feature}</strong> is only available with an account.
            It takes under a minute to set up.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => go('/auth?signup=true')}
            style={{
              width: '100%', padding: '13px 20px', borderRadius: 9999,
              background: `linear-gradient(135deg, ${TC}, ${TL})`,
              border: 'none', color: '#fff',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Create account →
          </button>
          <button
            onClick={() => go('/auth')}
            style={{
              width: '100%', padding: '12px 20px', borderRadius: 9999,
              background: 'transparent',
              border: `1.5px solid ${BORDER}`, color: INK,
              fontSize: 15, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Sign in
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: MUTED,
              fontSize: 13, cursor: 'pointer', padding: '4px 0',
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};
