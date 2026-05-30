import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users, Crown, TrendingUp, Gift, Calendar, ShoppingCart,
  MessageCircle, MapPin, Sparkles, LogOut, RefreshCw, Activity, Download,
  Zap, HelpCircle, Globe, Target, BarChart2,
} from 'lucide-react';

interface Stats {
  // Growth
  totalUsers: number;
  newUsersToday: number;
  newUsers7d: number;
  newUsers30d: number;
  // Subscriptions
  premiumUsers: number;
  freeUsers: number;
  totalReferrals: number;
  totalGroups: number;
  tierBreakdown: { tier: string; count: number }[];
  // Retention
  dau: number;
  wau: number;
  mau: number;
  // Content
  totalTasks: number;
  totalEvents: number;
  totalMessages: number;
  // EZ Capture
  ezCaptureTotal: number;
  ezCaptureToday: number;
  ezParseAccuracy: number;
  ezCategoryBreakdown: { type: string; count: number }[];
  ezLocaleBreakdown: { locale: string; count: number }[];
  // Guide
  guideQueriesTotal: number;
  guideQueriesToday: number;
  topGuideQuestions: { question: string; count: number }[];
  // AI
  totalAiSessions: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  aiSessionsToday: number;
  // Feature adoption
  usersWithCaptures: number;
  usersWithTasks: number;
  multiMemberGroups: number;
  // Digest & language
  digestOptIns: number;
  languageDistribution: { lang: string; count: number }[];
  // Page views
  totalPageViews: number;
  pageViewsToday: number;
  topPages: { path: string; count: number }[];
  // Storage
  storageBuckets: { bucket: string; file_count: number; total_bytes: number }[];
  // Promos & users
  promos: { code: string; current_uses: number; max_uses: number | null }[];
  recentUsers: { full_name: string; email: string; created_at: string; subscription_tier: string }[];
  allEmails: { email: string; full_name: string; created_at: string; subscription_tier: string }[];
}

const BG = 'hsl(270 62% 7%)';
const CARD_BG = 'hsl(270 50% 12% / 0.9)';
const CARD_BORDER = '1px solid hsl(270 40% 22%)';
const LABEL = 'hsl(270 40% 55%)';
const VALUE = 'hsl(270 40% 96%)';
const SUBTEXT = 'hsl(270 40% 68%)';
const ROW_EVEN = 'hsl(270 50% 10%)';
const ROW_ODD = 'hsl(270 50% 12%)';
const TH_BG = 'hsl(270 50% 14%)';

const C = {
  purple: 'hsl(270 88% 64%)',
  green: 'hsl(142 70% 60%)',
  blue: 'hsl(200 80% 60%)',
  blush: 'hsl(332 77% 71%)',
  gold: 'hsl(45 95% 60%)',
  terracotta: 'hsl(14 60% 60%)',
  sage: 'hsl(138 30% 55%)',
  sky: 'hsl(210 80% 65%)',
};

const LANG_NAMES: Record<string, string> = {
  en: 'English', de: 'Deutsch', fr: 'Français', it: 'Italiano', es: 'Español', pt: 'Português',
};

const TYPE_LABELS: Record<string, string> = {
  event: '📅 Event', task: '✓ Task', shopping: '🛒 Shopping (Family)',
  shopping_personal: '🛒 Shopping (Personal)', reminder: '🔔 Reminder',
  ritual: '🌿 Ritual', journal: '📝 Journal',
};

const StatCard = ({
  icon: Icon, label, value, sub, color = C.purple,
}: { icon: any; label: string; value: string | number; sub?: string; color?: string }) => (
  <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: CARD_BG, border: CARD_BORDER }}>
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}22` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <span className="text-xs font-medium" style={{ color: LABEL }}>{label}</span>
    </div>
    <p className="text-3xl font-bold" style={{ color: VALUE }}>{value}</p>
    {sub && <p className="text-xs" style={{ color: LABEL }}>{sub}</p>}
  </div>
);

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: LABEL }}>
    {children}
  </h2>
);

const Table = ({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) => (
  <div className="rounded-2xl overflow-hidden" style={{ border: CARD_BORDER }}>
    <table className="w-full text-sm">
      <thead>
        <tr style={{ background: TH_BG }}>
          {headers.map((h, i) => (
            <th key={i} className={`px-4 py-3 font-semibold ${i > 0 ? 'text-right' : 'text-left'}`} style={{ color: SUBTEXT }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ background: ri % 2 === 0 ? ROW_EVEN : ROW_ODD }}>
            {row.map((cell, ci) => (
              <td key={ci} className={`px-4 py-2.5 ${ci > 0 ? 'text-right font-bold' : 'font-mono text-xs'}`}
                style={{ color: ci === 0 ? 'hsl(270 40% 80%)' : VALUE }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
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
      { data: allEmailsRaw },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', day1.toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', day7.toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', day30.toISOString()),
      supabase.from('profiles').select('subscription_tier'),
      supabase.from('groups').select('*', { count: 'exact', head: true }),
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
      supabase.from('promo_codes').select('code, current_uses, max_uses'),
      supabase.from('profiles').select('full_name, email, subscription_tier, created_at').order('created_at', { ascending: false }).limit(20),
      supabase.from('profiles').select('email, full_name, created_at, subscription_tier').not('email', 'is', null).order('created_at', { ascending: false }),
    ]);

    const tierMap: Record<string, number> = {};
    (profiles || []).forEach((p: any) => {
      const t = p.subscription_tier || 'free';
      tierMap[t] = (tierMap[t] || 0) + 1;
    });
    const tierBreakdown = Object.entries(tierMap).map(([tier, count]) => ({ tier, count }));
    const premiumUsers = (profiles || []).filter((p: any) => p.subscription_tier && p.subscription_tier !== 'free').length;

    const { count: totalReferrals } = await supabase.from('referrals').select('*', { count: 'exact', head: true });
    const { count: totalEvents } = await supabase.from('events').select('*', { count: 'exact', head: true });
    const { count: totalMessages } = await supabase.from('direct_messages').select('*', { count: 'exact', head: true });

    const [
      { data: aiAll },
      { count: aiToday },
    ] = await Promise.all([
      supabase.from('ai_usage_logs').select('input_tokens, output_tokens'),
      supabase.from('ai_usage_logs').select('*', { count: 'exact', head: true }).gte('created_at', day1.toISOString()),
    ]);
    const totalInputTokens = (aiAll || []).reduce((s: number, r: any) => s + (r.input_tokens || 0), 0);
    const totalOutputTokens = (aiAll || []).reduce((s: number, r: any) => s + (r.output_tokens || 0), 0);

    const [
      { count: totalPageViews },
      { count: pageViewsToday },
      { data: pageViewsRaw },
    ] = await Promise.all([
      supabase.from('page_views').select('*', { count: 'exact', head: true }),
      supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', day1.toISOString()),
      supabase.from('page_views').select('path'),
    ]);
    const pathCounts: Record<string, number> = {};
    (pageViewsRaw || []).forEach((r: any) => { pathCounts[r.path] = (pathCounts[r.path] || 0) + 1; });
    const topPages = Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, count]) => ({ path, count }));

    const { data: storageRaw } = await supabase.rpc('get_storage_stats');
    const storageBuckets = (storageRaw || []).map((r: any) => ({
      bucket: r.bucket, file_count: Number(r.file_count), total_bytes: Number(r.total_bytes),
    }));

    // === New analytics ===
    const [
      { data: parseAll },
      { data: prefAll },
      { data: guideAll },
      { data: adminStats },
    ] = await Promise.all([
      supabase.from('parse_events').select('ai_result, was_corrected, locale, created_at'),
      supabase.from('user_preferences').select('data'),
      supabase.from('guide_queries').select('question, created_at').order('created_at', { ascending: false }).limit(1000),
      supabase.rpc('get_admin_stats'),
    ]);

    // EZ Capture
    const ezCaptureTotal = (parseAll || []).length;
    const ezCaptureToday = (parseAll || []).filter((r: any) => new Date(r.created_at) >= day1).length;
    const accurate = (parseAll || []).filter((r: any) => !r.was_corrected).length;
    const ezParseAccuracy = ezCaptureTotal > 0 ? Math.round((accurate / ezCaptureTotal) * 100) : 0;

    const catMap: Record<string, number> = {};
    (parseAll || []).forEach((r: any) => {
      const cat = r.ai_result?.type || 'unknown';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const ezCategoryBreakdown = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count }));

    const locMap: Record<string, number> = {};
    (parseAll || []).forEach((r: any) => {
      const loc = r.locale || 'en';
      locMap[loc] = (locMap[loc] || 0) + 1;
    });
    const ezLocaleBreakdown = Object.entries(locMap).sort((a, b) => b[1] - a[1]).map(([locale, count]) => ({ locale, count }));

    // Guide questions
    const qMap: Record<string, number> = {};
    (guideAll || []).forEach((r: any) => {
      const q = (r.question || '').toLowerCase().trim().slice(0, 100);
      qMap[q] = (qMap[q] || 0) + 1;
    });
    const topGuideQuestions = Object.entries(qMap).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([question, count]) => ({ question, count }));
    const guideQueriesTotal = (guideAll || []).length;
    const guideQueriesToday = (guideAll || []).filter((r: any) => new Date(r.created_at) >= day1).length;

    // Digest & language
    const digestOptIns = (prefAll || []).filter((r: any) =>
      r.data?.['eazy-morning-digest'] === true || r.data?.['eazy-morning-digest'] === 'true'
    ).length;

    const langMap: Record<string, number> = {};
    (prefAll || []).forEach((r: any) => {
      const lang = r.data?.['eazy-family-language'] || 'en';
      langMap[lang] = (langMap[lang] || 0) + 1;
    });
    const languageDistribution = Object.entries(langMap).sort((a, b) => b[1] - a[1]).map(([lang, count]) => ({ lang, count }));

    // Admin stats RPC (DAU/WAU/MAU + adoption)
    const as = (adminStats as any) || {};
    const dau = Number(as.dau || 0);
    const wau = Number(as.wau || 0);
    const mau = Number(as.mau || 0);
    const usersWithCaptures = Number(as.users_with_captures || 0);
    const usersWithTasks = Number(as.users_with_tasks || 0);
    const multiMemberGroups = Number(as.multi_member_groups || 0);

    setStats({
      totalUsers: totalUsers || 0, newUsersToday: newToday || 0, newUsers7d: new7d || 0, newUsers30d: new30d || 0,
      premiumUsers, freeUsers: (totalUsers || 0) - premiumUsers,
      totalReferrals: totalReferrals || 0, totalGroups: totalGroups || 0,
      tierBreakdown,
      dau, wau, mau,
      totalTasks: totalTasks || 0, totalEvents: totalEvents || 0, totalMessages: totalMessages || 0,
      ezCaptureTotal, ezCaptureToday, ezParseAccuracy, ezCategoryBreakdown, ezLocaleBreakdown,
      guideQueriesTotal, guideQueriesToday, topGuideQuestions,
      totalAiSessions: (aiAll || []).length, totalInputTokens, totalOutputTokens, aiSessionsToday: aiToday || 0,
      usersWithCaptures, usersWithTasks, multiMemberGroups,
      digestOptIns, languageDistribution,
      totalPageViews: totalPageViews || 0, pageViewsToday: pageViewsToday || 0, topPages,
      storageBuckets,
      promos: promos || [],
      recentUsers: (recentRaw || []).map((p: any) => ({
        full_name: p.full_name || 'Unknown', email: p.email || '—',
        created_at: p.created_at, subscription_tier: p.subscription_tier || 'free',
      })),
      allEmails: (allEmailsRaw || []).map((p: any) => ({
        email: p.email, full_name: p.full_name || '',
        created_at: p.created_at, subscription_tier: p.subscription_tier || 'free',
      })),
    });
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const handleSignOut = async () => { await signOut(); navigate('/auth'); };

  const exportEmailsCSV = () => {
    if (!stats?.allEmails.length) return;
    const rows = [
      ['Email', 'Name', 'Tier', 'Joined'],
      ...stats.allEmails.map(u => [u.email, u.full_name, u.subscription_tier, new Date(u.created_at).toLocaleDateString()]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `eazy-family-emails-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const tierColor: Record<string, string> = {
    free: C.purple, family: C.blush, premium: C.gold,
  };

  const pct = (n: number, total: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '—';

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
        style={{ background: `${BG.replace(')', ' / 0.95)')}`, borderBottom: '1px solid hsl(270 40% 16%)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Eazy.Family" className="w-8 h-8" />
          <div>
            <h1 className="text-base font-bold" style={{ color: VALUE }}>Admin Dashboard</h1>
            <p className="text-xs" style={{ color: LABEL }}>Last refresh: {lastRefresh.toLocaleTimeString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchStats} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'hsl(270 50% 20%)', color: 'hsl(270 40% 80%)' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={exportEmailsCSV} disabled={!stats?.allEmails.length}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'hsl(142 60% 18%)', color: 'hsl(142 70% 70%)' }}>
            <Download className="w-3.5 h-3.5" /> Emails CSV
          </button>
          <button onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'hsl(0 60% 25%)', color: 'hsl(0 80% 80%)' }}>
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {loading && !stats ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: C.purple }} />
          </div>
        ) : stats ? (
          <>
            {/* ── User Growth ── */}
            <section>
              <SectionHeading>User Growth</SectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
                <StatCard icon={TrendingUp} label="New Today" value={stats.newUsersToday} color={C.green} />
                <StatCard icon={TrendingUp} label="Last 7 Days" value={stats.newUsers7d} color={C.blue} />
                <StatCard icon={TrendingUp} label="Last 30 Days" value={stats.newUsers30d} color={C.blush} />
              </div>
            </section>

            {/* ── Subscriptions ── */}
            <section>
              <SectionHeading>Subscriptions</SectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Crown} label="Premium Users" value={stats.premiumUsers} color={C.gold} sub="Paid tier" />
                <StatCard icon={Users} label="Free Users" value={stats.freeUsers} color={C.purple} sub="Free tier" />
                <StatCard icon={Gift} label="Referrals" value={stats.totalReferrals} color={C.blush} sub="Total completed" />
                <StatCard icon={Activity} label="Family Groups" value={stats.totalGroups} color={C.blue} />
              </div>
              {stats.tierBreakdown.length > 0 && (
                <div className="mt-3 rounded-2xl p-4 flex flex-wrap gap-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
                  {stats.tierBreakdown.map(({ tier, count }) => (
                    <div key={tier} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: tierColor[tier] || C.purple }} />
                      <span className="text-sm font-medium capitalize" style={{ color: 'hsl(270 40% 85%)' }}>{tier}</span>
                      <span className="text-sm font-bold" style={{ color: VALUE }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Retention ── */}
            <section>
              <SectionHeading>Retention (Unique Active Users)</SectionHeading>
              <div className="grid grid-cols-3 gap-3">
                <StatCard icon={Activity} label="DAU (24h)" value={stats.dau} color={C.green} sub="Distinct users today" />
                <StatCard icon={Activity} label="WAU (7d)" value={stats.wau} color={C.blue} sub="Distinct users this week" />
                <StatCard icon={Activity} label="MAU (30d)" value={stats.mau} color={C.blush} sub="Distinct users this month" />
              </div>
            </section>

            {/* ── Content & Activity ── */}
            <section>
              <SectionHeading>Content & Activity</SectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={ShoppingCart} label="Total Tasks" value={stats.totalTasks} color={C.blush} />
                <StatCard icon={Calendar} label="Total Events" value={stats.totalEvents} color={C.blue} />
                <StatCard icon={MessageCircle} label="Messages Sent" value={stats.totalMessages} color={C.green} />
                <StatCard icon={Sparkles} label="AI Assistant" value="Active" color={C.gold} sub="Claude-powered" />
              </div>
            </section>

            {/* ── EZ Capture ── */}
            <section>
              <SectionHeading>EZ Capture</SectionHeading>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <StatCard icon={Zap} label="Total Captures" value={stats.ezCaptureTotal} color={C.terracotta} />
                <StatCard icon={Zap} label="Captures Today" value={stats.ezCaptureToday} color={C.terracotta} />
                <StatCard icon={Target} label="Parse Accuracy" value={`${stats.ezParseAccuracy}%`} color={C.green}
                  sub={`${stats.ezCaptureTotal - Math.round(stats.ezCaptureTotal * stats.ezParseAccuracy / 100)} corrected`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats.ezCategoryBreakdown.length > 0 && (
                  <Table
                    headers={['Category', 'Count', '%']}
                    rows={stats.ezCategoryBreakdown.map(({ type, count }) => [
                      TYPE_LABELS[type] || type,
                      count,
                      pct(count, stats.ezCaptureTotal),
                    ])}
                  />
                )}
                {stats.ezLocaleBreakdown.length > 0 && (
                  <Table
                    headers={['Language', 'Captures', '%']}
                    rows={stats.ezLocaleBreakdown.map(({ locale, count }) => [
                      LANG_NAMES[locale] || locale,
                      count,
                      pct(count, stats.ezCaptureTotal),
                    ])}
                  />
                )}
              </div>
              {stats.ezCaptureTotal === 0 && (
                <p className="text-sm mt-2" style={{ color: LABEL }}>No captures yet — data appears once users submit via EZ Capture.</p>
              )}
            </section>

            {/* ── Guide Questions ── */}
            <section>
              <SectionHeading>EZ Guide Questions</SectionHeading>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <StatCard icon={HelpCircle} label="Total Guide Queries" value={stats.guideQueriesTotal} color={C.sky} />
                <StatCard icon={HelpCircle} label="Guide Queries Today" value={stats.guideQueriesToday} color={C.sky} />
              </div>
              {stats.topGuideQuestions.length > 0 ? (
                <Table
                  headers={['Question asked', 'Times']}
                  rows={stats.topGuideQuestions.map(({ question, count }) => [question, count])}
                />
              ) : (
                <p className="text-sm" style={{ color: LABEL }}>No guide queries yet — data appears once users ask questions via EZ Capture.</p>
              )}
            </section>

            {/* ── AI Usage ── */}
            <section>
              <SectionHeading>AI Usage</SectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Sparkles} label="Total Sessions" value={stats.totalAiSessions} color={C.gold} />
                <StatCard icon={Sparkles} label="Sessions Today" value={stats.aiSessionsToday} color={C.gold} />
                <StatCard icon={Sparkles} label="Input Tokens" value={stats.totalInputTokens.toLocaleString()} color={C.blue} sub="↑ user messages" />
                <StatCard icon={Sparkles} label="Output Tokens" value={stats.totalOutputTokens.toLocaleString()} color={C.blush} sub="↓ AI responses" />
              </div>
            </section>

            {/* ── Feature Adoption ── */}
            <section>
              <SectionHeading>Feature Adoption</SectionHeading>
              <div className="grid grid-cols-3 gap-3">
                <StatCard icon={Zap} label="Used EZ Capture" value={stats.usersWithCaptures}
                  color={C.terracotta} sub={pct(stats.usersWithCaptures, stats.totalUsers) + ' of users'} />
                <StatCard icon={ShoppingCart} label="Created a Task" value={stats.usersWithTasks}
                  color={C.blush} sub={pct(stats.usersWithTasks, stats.totalUsers) + ' of users'} />
                <StatCard icon={Users} label="Multi-Member Families" value={stats.multiMemberGroups}
                  color={C.green} sub={pct(stats.multiMemberGroups, stats.totalGroups) + ' of groups'} />
              </div>
            </section>

            {/* ── Morning Digest & Language ── */}
            <section>
              <SectionHeading>Morning Digest & Language</SectionHeading>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <StatCard icon={BarChart2} label="Digest Opt-ins" value={stats.digestOptIns}
                  color={C.sage} sub={pct(stats.digestOptIns, stats.totalUsers) + ' of users'} />
                <StatCard icon={Globe} label="Languages in Use" value={stats.languageDistribution.length}
                  color={C.sky} sub="Distinct app languages" />
              </div>
              {stats.languageDistribution.length > 0 && (
                <Table
                  headers={['Language', 'Users', '%']}
                  rows={stats.languageDistribution.map(({ lang, count }) => [
                    LANG_NAMES[lang] || lang,
                    count,
                    pct(count, stats.totalUsers),
                  ])}
                />
              )}
            </section>

            {/* ── Page Views ── */}
            <section>
              <SectionHeading>Page Views</SectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <StatCard icon={Activity} label="Total Views" value={stats.totalPageViews.toLocaleString()} color={C.green} />
                <StatCard icon={Activity} label="Views Today" value={stats.pageViewsToday.toLocaleString()} color={C.green} />
              </div>
              {stats.topPages.length > 0 && (
                <Table
                  headers={['Page', 'Views']}
                  rows={stats.topPages.map(p => [p.path, p.count])}
                />
              )}
            </section>

            {/* ── Storage ── */}
            {stats.storageBuckets.length > 0 && (
              <section>
                <SectionHeading>Storage</SectionHeading>
                <Table
                  headers={['Bucket', 'Files', 'Size']}
                  rows={stats.storageBuckets.map(b => [
                    b.bucket,
                    b.file_count,
                    b.total_bytes < 1024 * 1024
                      ? `${(b.total_bytes / 1024).toFixed(1)} KB`
                      : `${(b.total_bytes / (1024 * 1024)).toFixed(1)} MB`,
                  ])}
                />
              </section>
            )}

            {/* ── Promo Codes ── */}
            {stats.promos.length > 0 && (
              <section>
                <SectionHeading>Promo Codes</SectionHeading>
                <Table
                  headers={['Code', 'Uses', 'Max']}
                  rows={stats.promos.map(p => [p.code, p.current_uses ?? 0, p.max_uses ?? '∞'])}
                />
              </section>
            )}

            {/* ── Recent Sign-ups ── */}
            <section className="pb-8">
              <SectionHeading>Recent Sign-ups</SectionHeading>
              <div className="rounded-2xl overflow-hidden" style={{ border: CARD_BORDER }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: TH_BG }}>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: SUBTEXT }}>Name</th>
                      <th className="text-left px-4 py-3 font-semibold hidden md:table-cell" style={{ color: SUBTEXT }}>Email</th>
                      <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: SUBTEXT }}>Joined</th>
                      <th className="text-right px-4 py-3 font-semibold" style={{ color: SUBTEXT }}>Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentUsers.map((u, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? ROW_EVEN : ROW_ODD }}>
                        <td className="px-4 py-3 font-medium" style={{ color: 'hsl(270 40% 90%)' }}>{u.full_name}</td>
                        <td className="px-4 py-3 hidden md:table-cell font-mono text-xs" style={{ color: 'hsl(270 40% 65%)' }}>{u.email}</td>
                        <td className="px-4 py-3 hidden sm:table-cell" style={{ color: LABEL }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                            style={{ background: `${tierColor[u.subscription_tier] || C.purple}22`, color: tierColor[u.subscription_tier] || C.purple }}>
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
