import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users, Crown, TrendingUp, Gift, Calendar, ShoppingCart,
  MessageCircle, MapPin, Sparkles, LogOut, RefreshCw, Activity,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  newUsersToday: number;
  newUsers7d: number;
  newUsers30d: number;
  premiumUsers: number;
  freeUsers: number;
  totalReferrals: number;
  totalGroups: number;
  totalTasks: number;
  totalEvents: number;
  promos: { code: string; current_uses: number; max_uses: number | null }[];
  tierBreakdown: { tier: string; count: number }[];
  recentUsers: { full_name: string; email: string; created_at: string; subscription_tier: string }[];
}

const StatCard = ({
  icon: Icon, label, value, sub, color = 'hsl(270 88% 64%)',
}: { icon: any; label: string; value: string | number; sub?: string; color?: string }) => (
  <div className="rounded-2xl p-5 flex flex-col gap-2"
    style={{ background: 'hsl(270 50% 12% / 0.9)', border: '1px solid hsl(270 40% 22%)' }}>
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `${color}22` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <span className="text-xs font-medium" style={{ color: 'hsl(270 40% 68%)' }}>{label}</span>
    </div>
    <p className="text-3xl font-bold" style={{ color: 'hsl(270 40% 96%)' }}>{value}</p>
    {sub && <p className="text-xs" style={{ color: 'hsl(270 40% 55%)' }}>{sub}</p>}
  </div>
);

const Admin = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchStats = async () => {
    setLoading(true);
    const now = new Date();
    const day1 = new Date(now); day1.setDate(now.getDate() - 1);
    const day7 = new Date(now); day7.setDate(now.getDate() - 7);
    const day30 = new Date(now); day30.setDate(now.getDate() - 30);

    const [
      { count: totalUsers },
      { count: newToday },
      { count: new7d },
      { count: new30d },
      { data: profiles },
      { count: totalGroups },
      { count: totalTasks },
      { data: promos },
      { data: recentRaw },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', day1.toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', day7.toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', day30.toISOString()),
      supabase.from('profiles').select('subscription_tier'),
      supabase.from('groups').select('*', { count: 'exact', head: true }),
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
      supabase.from('promo_codes').select('code, current_uses, max_uses'),
      supabase.from('profiles').select('full_name, subscription_tier, created_at').order('created_at', { ascending: false }).limit(10),
    ]);

    // Tier breakdown
    const tierMap: Record<string, number> = {};
    (profiles || []).forEach((p: any) => {
      const t = p.subscription_tier || 'free';
      tierMap[t] = (tierMap[t] || 0) + 1;
    });
    const tierBreakdown = Object.entries(tierMap).map(([tier, count]) => ({ tier, count }));
    const premiumUsers = (profiles || []).filter((p: any) => p.subscription_tier && p.subscription_tier !== 'free').length;

    // Referrals
    const { count: totalReferrals } = await supabase.from('referrals').select('*', { count: 'exact', head: true });

    // Events
    const { count: totalEvents } = await supabase.from('events').select('*', { count: 'exact', head: true });

    // Recent users with auth emails via admin (fallback to profile data)
    const recentUsers = (recentRaw || []).map((p: any) => ({
      full_name: p.full_name || 'Unknown',
      email: '—',
      created_at: p.created_at,
      subscription_tier: p.subscription_tier || 'free',
    }));

    setStats({
      totalUsers: totalUsers || 0,
      newUsersToday: newToday || 0,
      newUsers7d: new7d || 0,
      newUsers30d: new30d || 0,
      premiumUsers,
      freeUsers: (totalUsers || 0) - premiumUsers,
      totalReferrals: totalReferrals || 0,
      totalGroups: totalGroups || 0,
      totalTasks: totalTasks || 0,
      totalEvents: totalEvents || 0,
      promos: promos || [],
      tierBreakdown,
      recentUsers,
    });
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const handleSignOut = async () => { await signOut(); navigate('/auth'); };

  const tierColor: Record<string, string> = {
    free: 'hsl(270 40% 55%)',
    family: 'hsl(262 80% 78%)',
    premium: 'hsl(45 95% 60%)',
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(270 62% 7%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
        style={{ background: 'hsl(270 62% 7% / 0.95)', borderBottom: '1px solid hsl(270 40% 16%)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Eazy.Family" className="w-8 h-8" />
          <div>
            <h1 className="text-base font-bold" style={{ color: 'hsl(270 40% 96%)' }}>Admin Dashboard</h1>
            <p className="text-xs" style={{ color: 'hsl(270 40% 55%)' }}>
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'hsl(270 50% 20%)', color: 'hsl(270 40% 80%)' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'hsl(0 60% 25%)', color: 'hsl(0 80% 80%)' }}>
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

        {loading && !stats ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'hsl(270 88% 64%)' }} />
          </div>
        ) : stats ? (
          <>
            {/* User Growth */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'hsl(270 40% 55%)' }}>
                User Growth
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
                <StatCard icon={TrendingUp} label="New Today" value={stats.newUsersToday} color="hsl(142 70% 60%)" />
                <StatCard icon={TrendingUp} label="Last 7 Days" value={stats.newUsers7d} color="hsl(200 80% 60%)" />
                <StatCard icon={TrendingUp} label="Last 30 Days" value={stats.newUsers30d} color="hsl(262 80% 78%)" />
              </div>
            </section>

            {/* Subscriptions */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'hsl(270 40% 55%)' }}>
                Subscriptions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Crown} label="Premium Users" value={stats.premiumUsers} color="hsl(45 95% 60%)" sub="Paid tier" />
                <StatCard icon={Users} label="Free Users" value={stats.freeUsers} color="hsl(270 40% 55%)" sub="Free tier" />
                <StatCard icon={Gift} label="Referrals" value={stats.totalReferrals} color="hsl(320 80% 65%)" sub="Total completed" />
                <StatCard icon={Activity} label="Family Groups" value={stats.totalGroups} color="hsl(200 80% 60%)" />
              </div>

              {/* Tier breakdown */}
              {stats.tierBreakdown.length > 0 && (
                <div className="mt-3 rounded-2xl p-4 flex flex-wrap gap-4"
                  style={{ background: 'hsl(270 50% 12% / 0.9)', border: '1px solid hsl(270 40% 22%)' }}>
                  {stats.tierBreakdown.map(({ tier, count }) => (
                    <div key={tier} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: tierColor[tier] || 'hsl(270 40% 55%)' }} />
                      <span className="text-sm font-medium capitalize" style={{ color: 'hsl(270 40% 85%)' }}>{tier}</span>
                      <span className="text-sm font-bold" style={{ color: 'hsl(270 40% 96%)' }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Content & Activity */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'hsl(270 40% 55%)' }}>
                Content & Activity
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard icon={ShoppingCart} label="Total Tasks" value={stats.totalTasks} color="hsl(262 80% 78%)" />
                <StatCard icon={Calendar} label="Total Events" value={stats.totalEvents} color="hsl(200 80% 60%)" />
                <StatCard icon={Sparkles} label="AI Assistant" value="Active" color="hsl(45 95% 60%)" sub="Claude-powered" />
              </div>
            </section>

            {/* Promo Codes */}
            {stats.promos.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'hsl(270 40% 55%)' }}>
                  Promo Codes
                </h2>
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid hsl(270 40% 22%)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'hsl(270 50% 14%)' }}>
                        <th className="text-left px-4 py-3 font-semibold" style={{ color: 'hsl(270 40% 68%)' }}>Code</th>
                        <th className="text-right px-4 py-3 font-semibold" style={{ color: 'hsl(270 40% 68%)' }}>Uses</th>
                        <th className="text-right px-4 py-3 font-semibold" style={{ color: 'hsl(270 40% 68%)' }}>Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.promos.map((p, i) => (
                        <tr key={p.code} style={{ background: i % 2 === 0 ? 'hsl(270 50% 10%)' : 'hsl(270 50% 12%)' }}>
                          <td className="px-4 py-3 font-mono font-medium" style={{ color: 'hsl(262 80% 78%)' }}>{p.code}</td>
                          <td className="px-4 py-3 text-right font-bold" style={{ color: 'hsl(270 40% 96%)' }}>{p.current_uses ?? 0}</td>
                          <td className="px-4 py-3 text-right" style={{ color: 'hsl(270 40% 55%)' }}>{p.max_uses ?? '∞'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Recent Sign-ups */}
            <section className="pb-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'hsl(270 40% 55%)' }}>
                Recent Sign-ups
              </h2>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid hsl(270 40% 22%)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'hsl(270 50% 14%)' }}>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: 'hsl(270 40% 68%)' }}>Name</th>
                      <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: 'hsl(270 40% 68%)' }}>Joined</th>
                      <th className="text-right px-4 py-3 font-semibold" style={{ color: 'hsl(270 40% 68%)' }}>Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentUsers.map((u, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'hsl(270 50% 10%)' : 'hsl(270 50% 12%)' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: 'hsl(270 40% 90%)' }}>{u.full_name}</td>
                        <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'hsl(270 40% 55%)' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                            style={{ background: `${tierColor[u.subscription_tier] || 'hsl(270 40% 55%)'}22`, color: tierColor[u.subscription_tier] || 'hsl(270 40% 55%)' }}>
                            {u.subscription_tier || 'free'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Admin;
