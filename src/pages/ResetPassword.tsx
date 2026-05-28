import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TC = '#964735';
const TL = '#D97B66';
const BG = '#F7F3ED';
const CARD = '#FFFFFF';
const BORDER = '#DAC1BB';
const INPUT_BG = '#FAF7F3';
const INK = '#1C1C18';
const MUTED = '#7A6660';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the page loads with the reset token in the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });

    // If the session is already established (hash already consumed), mark ready
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Minimum 6 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Passwords don\'t match', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      await supabase.auth.signOut();
      navigate('/auth', { replace: true });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Eazy.Family" className="w-20 h-20 mx-auto mb-4"
            style={{ filter: 'drop-shadow(0 4px 16px rgb(150 71 53 / 0.2))' }} />
          <h1 className="text-2xl font-bold" style={{ color: INK }}>Set new password</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Choose a new password for your account</p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {!ready ? (
            <p className="text-sm text-center py-4" style={{ color: MUTED }}>
              Verifying reset link…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-sm font-medium" style={{ color: INK }}>
                  New password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required minLength={6} maxLength={100}
                  className="h-11 rounded-xl text-sm"
                  style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: INK }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-sm font-medium" style={{ color: INK }}>
                  Confirm password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required minLength={6} maxLength={100}
                  className="h-11 rounded-xl text-sm"
                  style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: INK }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${TC}, ${TL})` }}
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
