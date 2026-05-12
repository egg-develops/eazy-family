import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { cloudSet } from "@/lib/preferencesSync";
import { useTheme } from "@/contexts/ThemeContext";
import { Switch } from "@/components/ui/switch";
import {
  User, Mail, Crown, Share2, Lock, Settings2, Globe, Sparkles, Database,
  Bell, Sunrise, Moon, HelpCircle, Shield, ExternalLink, ChevronRight,
  UserPlus, LogOut, Trash2, X, Plus, Check, RefreshCw, MessageCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { validateImageFile } from "@/lib/fileValidation";
import { compressAndUpload, deleteStorageFile } from "@/lib/imageUpload";
import { error as logError } from "@/lib/logger";

interface HomeConfig {
  greeting: string;
  byline: string;
  showCalendar: boolean;
  showWeather: boolean;
  showGreeting: boolean;
  showRituals?: boolean;
  showTasks?: boolean;
  showFamilyChannel?: boolean;
  topNotifications: string[];
  quickActions: string[];
  iconImage?: string;
  headerImage?: string;
  headerImages?: string[];
}

interface FamilyMember {
  id: string;
  full_name: string | null;
  display_name?: string | null;
  email?: string | null;
  role: string;
  user_id?: string;
}

const TC = '#964735';
const CARD = '#FFFFFF';
const BORDER = '#DAC1BB';
const DIVIDER = '#F1EDE7';
const MUTED = '#7A6660';
const INK = '#1C1C18';
const BG = '#F7F3ED';
const SAGE = '#44664F';
const SAGE_BG = '#EEF4F0';
const SAGE_BORDER = '#C8DDD0';

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { signOut, user } = useAuth();
  const { setTheme, isDark } = useTheme();

  const [language, setLanguage] = useState(localStorage.getItem('eazy-family-language') || 'en');
  const [langOpen, setLangOpen] = useState(false);

  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => {
    try {
      const saved = localStorage.getItem('eazy-family-home-config');
      if (saved) {
        const p = JSON.parse(saved);
        return { showCalendar: true, showWeather: true, showGreeting: true, showRituals: true, showTasks: true, showFamilyChannel: true, topNotifications: [], quickActions: [], ...p };
      }
    } catch { localStorage.removeItem('eazy-family-home-config'); }
    return { greeting: "Good morning! ☀️", byline: "Let's make today amazing", showCalendar: true, showWeather: true, showGreeting: true, showRituals: true, showTasks: true, showFamilyChannel: true, topNotifications: [], quickActions: [] };
  });

  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  // AI & Privacy
  const [aiSuggestions, setAiSuggestions] = useState(() => localStorage.getItem('eazy-ai-suggestions') !== 'false');
  const [privacyLevel, setPrivacyLevel] = useState<0|1|2>(() => { const v = parseInt(localStorage.getItem('eazy-privacy-level') || '1'); return (v as 0|1|2); });
  const [dataUsage, setDataUsage] = useState(() => localStorage.getItem('eazy-data-usage') !== 'false');

  // Notifications
  const [quietHours, setQuietHours] = useState(() => localStorage.getItem('eazy-quiet-hours') !== 'false');
  const [morningDigest, setMorningDigest] = useState(() => localStorage.getItem('eazy-morning-digest') === 'true');

  // Calendar sync
  const [googleSynced] = useState(() => localStorage.getItem('eazy-google-calendar-synced') === 'true');
  const [outlookSynced] = useState(() => localStorage.getItem('eazy-outlook-calendar-synced') === 'true');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          setUserEmail(u.email || '');
          const { data } = await supabase.from('profiles').select('subscription_tier, display_name').eq('user_id', u.id).single();
          if (data) {
            setSubscriptionTier(data.subscription_tier || 'free');
            setDisplayName(data.display_name || '');
          }
        }
      } catch (e) { logError('Settings fetch:', e); }
      finally { setLoadingSubscription(false); }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('family_members').select('id, full_name, display_name, email, role, user_id')
      .eq('family_id', user.id).eq('is_active', true)
      .then(({ data }) => setFamilyMembers(data || []));
  }, [user]);

  // Re-hydrate from cloud
  useEffect(() => {
    const handler = () => {
      const lang = localStorage.getItem('eazy-family-language');
      if (lang) { setLanguage(lang); i18n.changeLanguage(lang); }
      const cfg = localStorage.getItem('eazy-family-home-config');
      if (cfg) { try { setHomeConfig(p => ({ ...p, ...JSON.parse(cfg) })); } catch {} }
    };
    window.addEventListener('eazy-prefs-loaded', handler);
    return () => window.removeEventListener('eazy-prefs-loaded', handler);
  }, []);

  const saveHomeConfig = (updates: Partial<HomeConfig>) => {
    const newConfig = { ...homeConfig, ...updates };
    setHomeConfig(newConfig);
    cloudSet('eazy-family-home-config', JSON.stringify(newConfig));
    window.dispatchEvent(new CustomEvent('eazy-home-config-updated'));
    if (user) supabase.from('profiles').update({ home_config: newConfig }).eq('user_id', user.id).then(() => {});
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    cloudSet('eazy-family-language', lang);
    setLangOpen(false);
    toast({ title: 'Language updated' });
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: t('settings.actions.signOut') });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('delete-account', { headers: { Authorization: `Bearer ${session?.access_token}` } });
      if (error) throw error;
      await signOut();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not delete account. Contact support@eazy.family", variant: "destructive" });
    } finally { setDeletingAccount(false); setShowDeleteConfirm(false); }
  };

  const handleFileUpload = async (file: File, type: 'profile' | 'header') => {
    const v = validateImageFile(file);
    if (!v.valid) { toast({ title: 'Invalid file', description: v.error, variant: 'destructive' }); return; }
    if (type === 'profile') setUploadingProfile(true); else setUploadingHeader(true);
    try {
      const ext = file.name.split('.').pop();
      const url = await compressAndUpload(file, 'user-uploads', `${crypto.randomUUID()}.${ext}`);
      if (type === 'profile') {
        const old = homeConfig.iconImage;
        saveHomeConfig({ iconImage: url });
        if (old) deleteStorageFile('user-uploads', old).catch(() => {});
      } else {
        const imgs = [...(homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : [])), url];
        saveHomeConfig({ headerImages: imgs, headerImage: imgs[0] });
      }
    } catch (e) { logError('Upload error:', e); toast({ title: 'Upload failed', variant: 'destructive' }); }
    finally { if (type === 'profile') setUploadingProfile(false); else setUploadingHeader(false); }
  };

  const savePrivacyField = async (field: string, value: boolean | string | null) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("profiles").update({ [field]: value }).eq("user_id", user.id);
      if (error) throw error;
    } catch (err: any) { logError("Privacy save:", err); }
  };

  const LANG_OPTIONS = [
    { value: 'en', label: 'English', abbr: 'EN', flag: '🇬🇧' },
    { value: 'de', label: 'Deutsch', abbr: 'DE', flag: '🇩🇪' },
    { value: 'fr', label: 'Français', abbr: 'FR', flag: '🇫🇷' },
    { value: 'it', label: 'Italiano', abbr: 'IT', flag: '🇮🇹' },
  ];
  const currentLang = LANG_OPTIONS.find(l => l.value === language) || LANG_OPTIONS[0];

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-semibold uppercase tracking-wide px-1 mb-1.5" style={{ color: MUTED }}>{children}</p>
  );

  const Card_ = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-2xl overflow-hidden ${className ?? ''}`} style={{ background: CARD, border: `1px solid ${BORDER}` }}>{children}</div>
  );

  const Row = ({ icon, title, subtitle, right, last, onClick }: {
    icon?: React.ReactNode; title: string; subtitle?: string;
    right?: React.ReactNode; last?: boolean; onClick?: () => void;
  }) => (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 ${onClick ? 'cursor-pointer active:bg-gray-50' : ''}`}
      style={{ borderBottom: last ? 'none' : `1px solid ${DIVIDER}` }}
      onClick={onClick}
    >
      {icon && <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: BG }}>{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: INK }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: MUTED }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );

  const Arrow = () => <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#C4AEA8' }} />;
  const Tog = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <Switch checked={checked} onCheckedChange={onChange} />
  );

  const MEMBER_COLORS = ['#D97B66', '#44664F', '#6E8FE5', '#EE7BB0', '#964735'];

  const MODULE_OPTIONS = [
    { key: 'showWeather', label: 'Weather' },
    { key: 'showCalendar', label: 'Calendar Today' },
    { key: 'showRituals', label: "Today's Rituals" },
    { key: 'showTasks', label: 'Top Tasks' },
    { key: 'showFamilyChannel', label: 'Family Channel' },
  ] as const;

  return (
    <div className="space-y-5 py-2 pb-8" style={{ overscrollBehavior: 'contain' }}>

      {/* ── Account ── */}
      <div className="space-y-2">
        <SectionLabel>Account</SectionLabel>
        <Card_>
          {/* Name + role */}
          <Row
            icon={<User className="w-4 h-4" style={{ color: MUTED }} />}
            title={displayName || user?.email?.split('@')[0] || 'You'}
            subtitle="Primary Guardian"
            right={<Arrow />}
            onClick={() => navigate('/app/family')}
          />
          {/* Email */}
          <Row
            icon={<Mail className="w-4 h-4" style={{ color: MUTED }} />}
            title={userEmail || 'Email'}
            subtitle="Verified Email"
            right={<Arrow />}
          />
          {/* Premium */}
          {subscriptionTier === 'free' ? (
            <UpgradeDialog>
              <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFF7E0' }}>
                  <Crown className="w-4 h-4" style={{ color: '#B88A00' }} />
                </div>
                <p className="flex-1 text-sm font-semibold" style={{ color: TC }}>Get Premium</p>
                <Arrow />
              </div>
            </UpgradeDialog>
          ) : (
            <Row
              icon={<Crown className="w-4 h-4" style={{ color: '#B88A00' }} />}
              title={`${subscriptionTier} Plan`}
              subtitle="Active subscription"
              right={<span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FFF7E0', color: '#B88A00' }}>Active</span>}
            />
          )}
          {/* Refer */}
          <Row
            icon={<Share2 className="w-4 h-4" style={{ color: MUTED }} />}
            title="Refer Friends"
            right={<Arrow />}
            last
            onClick={() => navigate('/app/settings#referral')}
          />
        </Card_>
      </div>

      {/* ── Family ── */}
      <div className="space-y-2">
        <SectionLabel>Family</SectionLabel>
        <Card_>
          <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            <div className="flex items-center gap-2 flex-wrap">
              {familyMembers.slice(0, 4).map((m, i) => {
                const name = (m.display_name || m.full_name || 'Member').split(' ')[0];
                const initials = name.slice(0, 2).toUpperCase();
                const color = MEMBER_COLORS[i % MEMBER_COLORS.length];
                return (
                  <button key={m.id} onClick={() => navigate('/app/family')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                    style={{ background: BG, border: `1px solid ${BORDER}` }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: color, fontSize: '8px', fontWeight: 700 }}>{initials}</div>
                    <span className="text-xs font-semibold" style={{ color: INK }}>{name}</span>
                  </button>
                );
              })}
              <button
                onClick={() => navigate('/app/family')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                style={{ background: BG, border: `1px dashed ${BORDER}` }}>
                <UserPlus className="w-3.5 h-3.5" style={{ color: MUTED }} />
                <span className="text-xs font-semibold" style={{ color: MUTED }}>Invite</span>
              </button>
            </div>
          </div>
          <Row
            icon={<Lock className="w-4 h-4" style={{ color: MUTED }} />}
            title="Shared Permissions"
            right={<Arrow />}
            last
            onClick={() => navigate('/app/family')}
          />
        </Card_>
      </div>

      {/* ── Calendar Integrations ── */}
      <div className="space-y-2">
        <SectionLabel>Calendar Integrations</SectionLabel>
        <Card_>
          {/* Google */}
          {subscriptionTier === 'family' || subscriptionTier === 'premium' ? (
            <Row
              icon={<svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
              title="Sync Google Calendar"
              right={<Tog checked={googleSynced} onChange={() => navigate('/app/calendar?sync=1')} />}
            />
          ) : (
            <UpgradeDialog>
              <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: BG }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                <p className="flex-1 text-sm font-medium" style={{ color: INK }}>Sync Google Calendar</p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FFF7E0', color: '#B88A00' }}>Premium</span>
              </div>
            </UpgradeDialog>
          )}
          <Row
            icon={<svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>}
            title="Sync Apple Calendar"
            subtitle="Coming soon"
            right={<Arrow />}
          />
          <Row
            icon={<div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: '#0078d4' }}><span className="text-white text-xs font-bold" style={{ fontSize: '9px' }}>O</span></div>}
            title="Sync Outlook Calendar"
            right={<Tog checked={outlookSynced} onChange={() => navigate('/app/calendar?sync=1')} />}
            last
          />
        </Card_>
      </div>

      {/* ── AI & Privacy ── */}
      <div className="space-y-2">
        <SectionLabel>AI & Privacy</SectionLabel>
        <Card_>
          <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
              Configure how Eazy.Family's AI interacts with your family data. We prioritize your privacy and peace of mind.
            </p>
          </div>
          <Row
            icon={<Sparkles className="w-4 h-4" style={{ color: MUTED }} />}
            title="Intelligent Suggestions"
            subtitle="Proactive reminders"
            right={<Tog checked={aiSuggestions} onChange={v => { setAiSuggestions(v); localStorage.setItem('eazy-ai-suggestions', String(v)); }} />}
          />
          {/* Privacy Level */}
          <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: BG }}>
                <Lock className="w-4 h-4" style={{ color: MUTED }} />
              </div>
              <p className="text-sm font-medium" style={{ color: INK }}>Privacy Level</p>
            </div>
            <div className="relative mt-1 mb-4">
              <div className="w-full h-1.5 rounded-full" style={{ background: DIVIDER }}>
                <div className="h-1.5 rounded-full" style={{ background: TC, width: privacyLevel === 0 ? '0%' : privacyLevel === 1 ? '50%' : '100%', transition: 'width 0.2s' }} />
              </div>
              <div className="flex justify-between mt-1 -mx-1">
                {(['Private', 'Shared with Family', 'Full AI Assistance'] as const).map((label, i) => (
                  <button key={label} onClick={() => { setPrivacyLevel(i as 0|1|2); localStorage.setItem('eazy-privacy-level', String(i)); }}
                    className="flex flex-col items-center gap-1">
                    <div className="w-3 h-3 rounded-full border-2 transition-all" style={{ background: privacyLevel >= i ? TC : CARD, borderColor: privacyLevel >= i ? TC : BORDER }} />
                    <span className="text-xs" style={{ color: privacyLevel === i ? TC : MUTED, fontWeight: privacyLevel === i ? 600 : 400 }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Row
            icon={<Database className="w-4 h-4" style={{ color: MUTED }} />}
            title="Data Usage"
            subtitle="Learn from my patterns"
            right={<Tog checked={dataUsage} onChange={v => { setDataUsage(v); localStorage.setItem('eazy-data-usage', String(v)); }} />}
            last
          />
        </Card_>
      </div>

      {/* ── Notifications ── */}
      <div className="space-y-2">
        <SectionLabel>Notifications</SectionLabel>
        <Card_>
          <Row
            icon={<Bell className="w-4 h-4" style={{ color: MUTED }} />}
            title="Quiet Hours"
            subtitle="Daily: 10 PM – 7 AM"
            right={<Tog checked={quietHours} onChange={v => { setQuietHours(v); localStorage.setItem('eazy-quiet-hours', String(v)); }} />}
          />
          <Row
            icon={<Sunrise className="w-4 h-4" style={{ color: MUTED }} />}
            title="Morning Digest"
            subtitle="Daily at 8:00 AM"
            right={<Tog checked={morningDigest} onChange={v => { setMorningDigest(v); localStorage.setItem('eazy-morning-digest', String(v)); }} />}
            last
          />
        </Card_>
      </div>

      {/* ── Preferences ── */}
      <div className="space-y-2">
        <SectionLabel>Preferences</SectionLabel>
        <Card_>
          <Row
            icon={<Moon className="w-4 h-4" style={{ color: MUTED }} />}
            title="Dark Mode"
            right={<Tog checked={isDark} onChange={() => setTheme(isDark ? 'light' : 'dark')} />}
          />
          {/* Language row with dropdown */}
          <div className="relative" style={{ borderBottom: 'none' }}>
            <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer" onClick={() => setLangOpen(p => !p)}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: BG }}>
                <Globe className="w-4 h-4" style={{ color: MUTED }} />
              </div>
              <p className="flex-1 text-sm font-medium" style={{ color: INK }}>Language</p>
              <span className="text-xs font-semibold mr-1" style={{ color: MUTED }}>
                {LANG_OPTIONS.filter(l => l.value !== language).slice(0, 2).map(l => l.abbr).join(', ')}
                {` · ${currentLang.abbr}`}
              </span>
              <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: '#C4AEA8', transform: langOpen ? 'rotate(90deg)' : 'none' }} />
            </div>
            {langOpen && (
              <div className="border-t" style={{ borderColor: DIVIDER }}>
                {LANG_OPTIONS.map((l, i) => (
                  <button key={l.value} onClick={() => handleLanguageChange(l.value)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    style={{ borderBottom: i < LANG_OPTIONS.length - 1 ? `1px solid ${DIVIDER}` : 'none', background: language === l.value ? SAGE_BG : 'transparent' }}>
                    <span className="text-base">{l.flag}</span>
                    <span className="flex-1 text-sm font-medium" style={{ color: INK }}>{l.label}</span>
                    {language === l.value && <Check className="w-4 h-4" style={{ color: SAGE }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card_>
      </div>

      {/* ── Homepage Modules ── */}
      <div className="space-y-2">
        <SectionLabel>Homepage Modules</SectionLabel>
        <Card_>
          {MODULE_OPTIONS.map((m, i) => (
            <Row
              key={m.key}
              title={m.label}
              right={<Tog checked={!!(homeConfig as any)[m.key] ?? true} onChange={v => saveHomeConfig({ [m.key]: v })} />}
              last={i === MODULE_OPTIONS.length - 1}
            />
          ))}
        </Card_>
      </div>

      {/* ── Profile & Gallery ── */}
      <div className="space-y-2">
        <SectionLabel>Profile & Gallery</SectionLabel>
        <Card_>
          <div className="px-4 py-3.5 flex items-center gap-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            {homeConfig.iconImage
              ? <img src={homeConfig.iconImage} alt="Profile" className="w-10 h-10 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${BORDER}` }} />
              : <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: '#D97B66' }}>
                  {(displayName || userEmail || 'EF').slice(0, 2).toUpperCase()}
                </div>
            }
            <p className="flex-1 text-sm font-medium" style={{ color: INK }}>Profile Photo</p>
            <label htmlFor="profile-icon" className="cursor-pointer">
              <span className="text-sm font-semibold" style={{ color: TC }}>{uploadingProfile ? 'Uploading…' : homeConfig.iconImage ? 'Change' : 'Upload'}</span>
              <input id="profile-icon" type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'profile'); e.target.value = ''; }}
                disabled={uploadingProfile} />
            </label>
          </div>
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: INK }}>Background Gallery</p>
              <span className="text-xs" style={{ color: MUTED }}>{(homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : [])).length}/4</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[0, 1, 2, 3].map(idx => {
                const imgs = homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : []);
                const img = imgs[idx];
                return (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden flex items-center justify-center" style={{ background: '#F1EDE7', border: `1px solid ${BORDER}` }}>
                    {img ? (
                      <>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => { const n = imgs.filter((_, i) => i !== idx); saveHomeConfig({ headerImages: n, headerImage: n[0] }); deleteStorageFile('user-uploads', img).catch(() => {}); }}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(28,28,24,0.6)' }}>
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </>
                    ) : <Plus className="w-3.5 h-3.5" style={{ color: MUTED }} />}
                  </div>
                );
              })}
            </div>
            {(homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : [])).length < 4 ? (
              <label htmlFor="header-image" className="cursor-pointer">
                <span className="text-sm font-semibold" style={{ color: TC }}>{uploadingHeader ? 'Uploading…' : '+ Add background photo'}</span>
                <input id="header-image" type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'header'); e.target.value = ''; }}
                  disabled={uploadingHeader} />
              </label>
            ) : <p className="text-xs" style={{ color: MUTED }}>Gallery full — delete a photo to add a new one.</p>}
          </div>
        </Card_>
      </div>

      {/* ── Rituals ── */}
      <div className="space-y-2">
        <SectionLabel>Rituals</SectionLabel>
        <Card_>
          <Row
            icon={<Settings2 className="w-4 h-4" style={{ color: MUTED }} />}
            title="Managed Rituals"
            right={<Arrow />}
            onClick={() => navigate('/app/rituals')}
          />
          <Row
            icon={<Lock className="w-4 h-4" style={{ color: MUTED }} />}
            title="Ritual Privacy"
            right={<Arrow />}
            last
            onClick={() => navigate('/app/rituals')}
          />
        </Card_>
      </div>

      {/* ── Support ── */}
      <div className="space-y-2">
        <SectionLabel>Support</SectionLabel>
        <Card_>
          <Row
            icon={<HelpCircle className="w-4 h-4" style={{ color: MUTED }} />}
            title="Help Center"
            right={<ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: '#C4AEA8' }} />}
            onClick={() => window.open('mailto:hello@eazy.family', '_blank')}
          />
          <Row
            icon={<Shield className="w-4 h-4" style={{ color: MUTED }} />}
            title="Safety Principles"
            right={<Arrow />}
            last
            onClick={() => navigate('/privacy')}
          />
        </Card_>
      </div>

      {/* ── Sign Out ── */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
        style={{ background: TC }}>
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>

      <p className="text-center text-xs" style={{ color: MUTED }}>Version 2.4.1 (Hearthside)</p>

      {/* ── Delete Account ── */}
      {!showDeleteConfirm ? (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-3 rounded-2xl text-sm font-semibold"
          style={{ color: '#C0392B', background: 'transparent', border: '1.5px solid #C0392B' }}>
          Delete my account
        </button>
      ) : (
        <div className="rounded-2xl px-4 py-4 space-y-3" style={{ background: '#FFF5F5', border: '1.5px solid #C0392B' }}>
          <p className="text-sm font-medium" style={{ color: '#C0392B' }}>This will permanently delete all your data and cannot be undone.</p>
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#F1EDE7', color: MUTED }} onClick={() => setShowDeleteConfirm(false)} disabled={deletingAccount}>Cancel</button>
            <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#C0392B' }} onClick={handleDeleteAccount} disabled={deletingAccount}>
              {deletingAccount ? 'Deleting…' : 'Yes, delete everything'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
