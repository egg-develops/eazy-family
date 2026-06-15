import { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { cloudSet } from "@/lib/preferencesSync";
import { useTheme } from "@/contexts/ThemeContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User, Mail, Share2, Lock, Globe, Sparkles, Database,
  Bell, Sunrise, Moon, HelpCircle, Shield, ExternalLink, ChevronRight, Accessibility,
  UserPlus, LogOut, X, Plus, Check, Trash2, Crown, RotateCcw, GripVertical
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateImageFile } from "@/lib/fileValidation";
import { compressAndUpload, deleteStorageFile } from "@/lib/imageUpload";
import { error as logError } from "@/lib/logger";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { GuestUpgradeModal } from "@/components/GuestUpgradeModal";
import { restoreRCPurchases } from "@/lib/revenuecat";
import { Browser } from "@capacitor/browser";

interface HomeConfig {
  greeting: string;
  byline: string;
  showCalendar: boolean;
  showWeather: boolean;
  showGreeting: boolean;
  showRituals?: boolean;
  showTasks?: boolean;
  showFamilyChannel?: boolean;
  showGallery?: boolean;
  showFamilyAgenda?: boolean;
  topNotifications: string[];
  quickActions: string[];
  iconImage?: string;
  headerImage?: string;
  headerImages?: string[];
  appTitle?: string;
}

interface FamilyMember {
  id: string;
  full_name: string | null;
  display_name?: string | null;
  email?: string | null;
  role: string;
  user_id?: string;
}

const TC = 'hsl(var(--primary))';
const CARD = 'hsl(var(--card))';
const BORDER = 'hsl(var(--border))';
const MUTED = 'hsl(var(--muted-foreground))';
const INK = 'hsl(var(--foreground))';
const BG = '#F7F3ED';
const SAGE = '#44664F';
const SAGE_BG = '#EEF4F0';

const EZ_DEFAULTS = [
  { path: '/app', labelKey: 'nav.home' },
  { path: '/app/calendar', labelKey: 'nav.calendar' },
  { path: '/app/family-agenda', labelKey: 'nav.family' },
  { path: '/app/lists', labelKey: 'nav.lists' },
  { path: '/app/rituals', labelKey: 'nav.rituals' },
  { path: '/app/settings', labelKey: 'nav.settings' },
];

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
    style={{ borderBottom: last ? 'none' : `1px solid ${BORDER}` }}
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
  <Switch
    checked={checked}
    onCheckedChange={onChange}
    className="data-[state=checked]:bg-[#964735] data-[state=unchecked]:bg-[#DAC1BB]"
  />
);

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { signOut, user, isPremium, isTrial, trialDaysLeft, refreshSubscription, isGuest } = useAuth();
  const [guestFeature, setGuestFeature] = useState<string | null>(null);
  const { setTheme, isDark } = useTheme();
  const { largeTapTargets, setLargeTapTargets } = useAccessibility();

  const [language, setLanguage] = useState(localStorage.getItem('eazy-family-language') || 'en');
  const [langOpen, setLangOpen] = useState(false);

  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => {
    try {
      const saved = localStorage.getItem('eazy-family-home-config');
      if (saved) {
        const p = JSON.parse(saved);
        return { showCalendar: true, showWeather: true, showGreeting: true, showRituals: true, showTasks: true, showFamilyChannel: true, showFamilyAgenda: true, topNotifications: [], quickActions: [], ...p };
      }
    } catch { localStorage.removeItem('eazy-family-home-config'); }
    return { greeting: "Good morning! ☀️", byline: "Let's make today amazing", showCalendar: true, showWeather: true, showGreeting: true, showRituals: true, showTasks: true, showFamilyChannel: true, showFamilyAgenda: true, topNotifications: [], quickActions: [] };
  });

  const [appTitleDraft, setAppTitleDraft] = useState(() => { try { const c = JSON.parse(localStorage.getItem('eazy-family-home-config') || '{}'); return c.appTitle ?? ''; } catch { return ''; } });

  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('eazy-display-name') || "");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [userEmail, setUserEmail] = useState(() => user?.email || '');

  // AI & Privacy
  const [aiSuggestions, setAiSuggestions] = useState(() => localStorage.getItem('eazy-ai-suggestions') !== 'false');
  const [dataUsage, setDataUsage] = useState(() => localStorage.getItem('eazy-data-usage') !== 'false');

  // Notifications
  const [quietHours, setQuietHours] = useState(() => localStorage.getItem('eazy-quiet-hours') !== 'false');
  const [morningDigest, setMorningDigest] = useState(() => localStorage.getItem('eazy-morning-digest') === 'true');
  const [morningDigestEmail, setMorningDigestEmail] = useState(() => localStorage.getItem('eazy-morning-digest-email') === 'true');

  // Calendar sync
  const [googleSynced] = useState(() => localStorage.getItem('eazy-google-calendar-synced') === 'true');
  const [outlookSynced] = useState(() => localStorage.getItem('eazy-outlook-calendar-synced') === 'true');
  const [appleSynced, setAppleSynced] = useState(() => localStorage.getItem('eazy-apple-calendar-enabled') === 'true');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [showPremiumSheet, setShowPremiumSheet] = useState(false);

  // EZ Button prefs
  const [ezMenuOrder, setEzMenuOrder] = useState<string[]>(() => {
    try { const s = localStorage.getItem('eazy-ez-menu-order'); if (s) return JSON.parse(s); } catch {}
    return EZ_DEFAULTS.map(i => i.path);
  });
  const [ezIconOnly, setEzIconOnly] = useState(() => localStorage.getItem('eazy-ez-icon-only') === 'true');
  const [ezDragIndex, setEzDragIndex] = useState<number | null>(null);
  const [ezDragOver, setEzDragOver] = useState<number | null>(null);
  const ezDragIndexRef = useRef<number | null>(null);
  const ezDragOverRef = useRef<number | null>(null);
  const ezItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const orderedEzItems = ezMenuOrder.map(p => EZ_DEFAULTS.find(i => i.path === p) ?? EZ_DEFAULTS[0]);

  const handleRestorePurchases = async () => {
    setRestoringPurchases(true);
    try {
      const granted = await restoreRCPurchases();
      if (granted) {
        await refreshSubscription();
        toast({ title: 'Purchases restored', description: 'Your subscription is active.' });
      } else {
        toast({ title: 'Nothing to restore', description: 'No active subscription found.' });
      }
    } catch {
      toast({ title: 'Restore failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setRestoringPurchases(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, home_config').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) {
          const fetchedName = data.display_name || '';
          setDisplayName(fetchedName);
          localStorage.setItem('eazy-display-name', fetchedName);
          if (data.home_config && typeof data.home_config === 'object') {
            const cloud = data.home_config as Partial<HomeConfig>;
            setHomeConfig(prev => ({ ...prev, ...cloud }));
            if (cloud.appTitle !== undefined) setAppTitleDraft(cloud.appTitle ?? '');
            const merged = { ...JSON.parse(localStorage.getItem('eazy-family-home-config') || '{}'), ...cloud };
            localStorage.setItem('eazy-family-home-config', JSON.stringify(merged));
            window.dispatchEvent(new CustomEvent('eazy-home-config-updated'));
          }
        }
      })
      .catch(e => logError('Settings fetch:', e));
  }, [user]);


  // Re-hydrate from cloud
  useEffect(() => {
    const handler = async () => {
      const lang = localStorage.getItem('eazy-family-language');
      if (lang) { setLanguage(lang); await i18n.changeLanguage(lang); }
      const cfg = localStorage.getItem('eazy-family-home-config');
      if (cfg) { try { const parsed = JSON.parse(cfg); setHomeConfig(p => ({ ...p, ...parsed })); if (parsed.appTitle !== undefined) setAppTitleDraft(parsed.appTitle ?? ''); } catch {} }
      setAppleSynced(localStorage.getItem('eazy-apple-calendar-enabled') === 'true');
    };
    window.addEventListener('eazy-prefs-loaded', handler);
    return () => window.removeEventListener('eazy-prefs-loaded', handler);
  }, []);

  const saveHomeConfig = (updates: Partial<HomeConfig>) => {
    const newConfig = { ...homeConfig, ...updates };
    setHomeConfig(newConfig);
    cloudSet('eazy-family-home-config', JSON.stringify(newConfig));
    window.dispatchEvent(new CustomEvent('eazy-home-config-updated'));
    if (user) supabase.from('profiles').update({ home_config: newConfig }).eq('user_id', user.id).then(({ error }) => { if (error) logError('saveHomeConfig:', error); });
  };

  const handleLanguageChange = (lang: string) => {
    cloudSet('eazy-family-language', lang);
    setLanguage(lang);
    setLangOpen(false);
    i18n.changeLanguage(lang);
  };

  const handleReferFriends = async () => {
    let refUrl = 'https://eazy.family';
    try {
      const { data } = await supabase.from('profiles').select('referral_code').eq('user_id', user?.id).single();
      if (data?.referral_code) refUrl = `https://eazy.family?ref=${data.referral_code}`;
    } catch { /* use base URL */ }
    const text = `Join me on Eazy.Family – the smart hub for family life! Use my link to get 1 month of Premium free 🎁`;
    if (navigator.share) {
      navigator.share({ title: 'Eazy.Family', text, url: refUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(refUrl)
        .then(() => toast({ title: 'Link copied!', description: refUrl }))
        .catch(() => toast({ title: 'Share this link', description: refUrl }));
    }
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
      if (error) {
        let description = "Could not delete account. Contact support@eazy.family";
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) description = body.error;
        } catch {}
        throw new Error(description);
      }
      toast({
        title: t('settings.accountDeleted'),
        description: t('settings.accountDeletedDesc'),
      });
      await new Promise(r => setTimeout(r, 1800));
      await signOut();
    } catch (err: any) {
      toast({ title: "Error deleting account", description: err?.message || "Could not delete account. Contact support@eazy.family", variant: "destructive" });
    } finally { setDeletingAccount(false); setShowDeleteConfirm(false); }
  };

  const saveDisplayName = async (name: string) => {
    if (!user) return;
    const trimmed = name.trim();
    setDisplayName(trimmed);
    localStorage.setItem('eazy-display-name', trimmed);
    try {
      const { error } = await supabase.from('profiles')
        .update({ display_name: trimmed }).eq('user_id', user.id);
      if (error) {
        logError('saveDisplayName:', error);
        toast({ title: t('settings.nameSaveFailed', 'Could not save name'), variant: 'destructive' });
      }
    } catch (e) { logError('saveDisplayName:', e); }
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
        const existing = (homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : []))
          .filter(i => i !== '/hero-default.png');
        const imgs = [...existing, url];
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
    { value: 'en',    label: 'English (US)', abbr: 'EN',    flag: '🇺🇸' },
    { value: 'en-GB', label: 'English (UK)', abbr: 'EN-GB', flag: '🇬🇧' },
    { value: 'de',    label: 'Deutsch',      abbr: 'DE',    flag: '🇩🇪' },
    { value: 'fr',    label: 'Français',     abbr: 'FR',    flag: '🇫🇷' },
    { value: 'it',    label: 'Italiano',     abbr: 'IT',    flag: '🇮🇹' },
    { value: 'es',    label: 'Español',      abbr: 'ES',    flag: '🇪🇸' },
    { value: 'pt',    label: 'Português',    abbr: 'PT',    flag: '🇵🇹' },
  ];
  const currentLang = LANG_OPTIONS.find(l => l.value === language) || LANG_OPTIONS[0];


  const MODULE_OPTIONS = [
    { key: 'showWeather', labelKey: 'settings.moduleWeather' },
    { key: 'showCalendar', labelKey: 'settings.moduleCalendar' },
    { key: 'showRituals', labelKey: 'settings.moduleRituals' },
    { key: 'showTasks', labelKey: 'settings.moduleTasks' },
    { key: 'showFamilyChannel', labelKey: 'settings.moduleFamily' },
    { key: 'showFamilyAgenda', labelKey: 'settings.moduleFamilyAgenda' },
    { key: 'showGallery', labelKey: 'settings.moduleGallery' },
  ] as const;

  return (
    <div className="space-y-5 py-2 pb-8" style={{ overscrollBehavior: 'contain' }}>

      {/* ── Account ── */}
      <div className="space-y-2">
        <SectionLabel>{t('settings.account.title')}</SectionLabel>
        <Card_>
          <>
            {/* Family Premium — single row for all subscription states */}
              {isPremium ? (
                <Row
                  icon={<Crown className="w-4 h-4" style={{ color: isTrial ? '#D97B66' : '#FFC861' }} />}
                  title={isTrial ? t('settings.premium.trialTitle') : t('settings.premium.activeTitle')}
                  subtitle={isTrial ? t('settings.premium.upgradeToKeepAccess') : t('settings.premium.active')}
                  right={<Arrow />}
                  onClick={() => setShowPremiumSheet(true)}
                />
              ) : (
                <UpgradeDialog>
                  <button className="w-full text-left">
                    <Row
                      icon={<Crown className="w-4 h-4" style={{ color: '#FFC861' }} />}
                      title="Family Premium"
                      subtitle={t('settings.premium.startFreeTrial')}
                      right={<Arrow />}
                    />
                  </button>
                </UpgradeDialog>
              )}
              <Row
                icon={<User className="w-4 h-4" style={{ color: MUTED }} />}
                title={displayName || user?.email?.split('@')[0] || 'You'}
                subtitle={t('settings.primaryAccount')}
              />
              <Row
                icon={<Mail className="w-4 h-4" style={{ color: MUTED }} />}
                title={userEmail || 'Email'}
                subtitle={t('settings.verifiedEmail')}
              />
              <Row
                icon={<UserPlus className="w-4 h-4" style={{ color: MUTED }} />}
                title={t('settings.inviteFamily')}
                right={<Arrow />}
                onClick={() => isGuest ? setGuestFeature('Invite Family') : navigate('/app/family')}
              />
              <Row
                icon={<Share2 className="w-4 h-4" style={{ color: MUTED }} />}
                title={t('settings.referFriends')}
                right={<Arrow />}
                onClick={() => isGuest ? setGuestFeature('Refer a friend') : handleReferFriends()}
              />
              <Row
                icon={<Trash2 className="w-4 h-4" style={{ color: '#C0392B' }} />}
                title={t('settings.deleteMyAccount')}
                right={<ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#C0392B' }} />}
                last
                onClick={() => setShowDeleteConfirm(true)}
              />
          </>
        </Card_>
      </div>

      {/* ── App Tour ── */}
      <div className="space-y-2">
        <SectionLabel>{t('settings.appTour.title')}</SectionLabel>
        <Card_>
          <Row
            icon={<span style={{ fontSize: '1rem', lineHeight: 1 }}>✨</span>}
            title={t('settings.appTour.featureSlides')}
            subtitle={t('settings.appTour.featureSlidesSub')}
            last
            onClick={() => window.dispatchEvent(new Event('tutorial-slides'))}
          />
        </Card_>
      </div>

      {/* ── Calendar Integrations ── */}
      <div className="space-y-2">
        <SectionLabel>{t('settings.calendarIntegrationsSection')}</SectionLabel>
        <Card_>
          <Row
              icon={<svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
              title={t('calendarIntegrations.googleCalendar')}
              right={<Tog checked={googleSynced} onChange={() => navigate('/app/calendar?sync=1')} />}
            />
          <Row
            icon={<svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>}
            title={t('calendarIntegrations.appleCalendar')}
            subtitle={Capacitor.isNativePlatform() ? undefined : t('settings.iOSAppOnly')}
            right={Capacitor.isNativePlatform() ? <Tog checked={appleSynced} onChange={() => navigate('/app/calendar?sync=1')} /> : <Arrow />}
          />
          <Row
            icon={<div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: '#0078d4' }}><span className="text-white text-xs font-bold" style={{ fontSize: '9px' }}>O</span></div>}
            title={t('calendarIntegrations.outlookCalendar')}
            right={<Tog checked={outlookSynced} onChange={() => navigate('/app/calendar?sync=1')} />}
            last
          />
        </Card_>
      </div>

      {/* ── Notifications ── */}
      <div className="space-y-2">
        <SectionLabel>{t('settings.notificationsSection')}</SectionLabel>
        <Card_>
          <Row
            icon={<Bell className="w-4 h-4" style={{ color: MUTED }} />}
            title={t('settings.quietHours')}
            subtitle={t('settings.quietHoursSub')}
            right={<Tog checked={quietHours} onChange={v => { setQuietHours(v); localStorage.setItem('eazy-quiet-hours', String(v)); }} />}
          />
          <Row
            icon={<Sunrise className="w-4 h-4" style={{ color: MUTED }} />}
            title={t('settings.morningDigest')}
            subtitle={t('settings.morningDigestSub')}
            right={<Tog checked={morningDigest} onChange={v => { setMorningDigest(v); cloudSet('eazy-morning-digest', String(v)); }} />}
          />
          {morningDigest && (
            <Row
              title={t('settings.alsoEmail')}
              subtitle={userEmail || 'Your account email'}
              right={<Tog checked={morningDigestEmail} onChange={v => { if (isGuest) { setGuestFeature('Morning Digest email'); return; } setMorningDigestEmail(v); cloudSet('eazy-morning-digest-email', String(v)); }} />}
              last
            />
          )}
          {!morningDigest && <div style={{ height: 0 }} />}
        </Card_>
      </div>

      {/* ── Preferences ── */}
      <div className="space-y-2">
        <SectionLabel>{t('settings.preferences')}</SectionLabel>
        <Card_>
          <Row
            icon={<Moon className="w-4 h-4" style={{ color: MUTED }} />}
            title={t('settings.appearance.darkMode')}
            right={<Tog checked={isDark} onChange={() => setTheme(isDark ? 'light' : 'dark')} />}
          />
          <Row
            icon={<Accessibility className="w-4 h-4" style={{ color: MUTED }} />}
            title={t('settings.appearance.largeTapTargets')}
            subtitle={t('settings.appearance.largeTapTargetsSub')}
            right={<Tog checked={largeTapTargets} onChange={setLargeTapTargets} />}
          />
          <div className="relative" style={{ borderBottom: 'none' }}>
            <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer" onClick={() => setLangOpen(p => !p)}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: BG }}>
                <Globe className="w-4 h-4" style={{ color: MUTED }} />
              </div>
              <p className="flex-1 text-sm font-medium" style={{ color: INK }}>{t('settings.language.title')}</p>
              <span style={{ fontSize: 20, lineHeight: 1, marginRight: 2 }}>{currentLang.flag}</span>
              <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: '#C4AEA8', transform: langOpen ? 'rotate(90deg)' : 'none' }} />
            </div>
            {langOpen && (
              <div className="border-t" style={{ borderColor: BORDER }}>
                {LANG_OPTIONS.map((l, i) => (
                  <button key={l.value} onClick={() => handleLanguageChange(l.value)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    style={{ borderBottom: i < LANG_OPTIONS.length - 1 ? `1px solid ${BORDER}` : 'none', background: language === l.value ? SAGE_BG : 'transparent' }}>
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

      {/* ── EZ Button ── */}
      <div className="space-y-2">
        <SectionLabel>EZ Button</SectionLabel>
        <Card_>
          {orderedEzItems.map((item, i) => (
            <div
              key={item.path}
              ref={el => { ezItemRefs.current[i] = el; }}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{
                borderBottom: `1px solid ${BORDER}`,
                background: ezDragOver === i && ezDragIndex !== i ? '#FDF3EE' : 'transparent',
                opacity: ezDragIndex === i ? 0.35 : 1,
                transition: 'background 0.1s, opacity 0.1s',
              }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: BG }}>
                <span className="text-sm font-bold" style={{ color: '#964735' }}>{t(item.labelKey)[0]}</span>
              </div>
              <p className="flex-1 text-sm font-medium" style={{ color: INK }}>{t(item.labelKey)}</p>
              <div
                className="p-1 touch-none"
                style={{ color: '#C4AEA8', cursor: 'grab', touchAction: 'none' }}
                onPointerDown={e => {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  ezDragIndexRef.current = i;
                  ezDragOverRef.current = i;
                  setEzDragIndex(i);
                  setEzDragOver(i);
                }}
                onPointerMove={e => {
                  if (ezDragIndexRef.current === null) return;
                  const y = e.clientY;
                  let newOver = ezDragIndexRef.current;
                  ezItemRefs.current.forEach((ref, idx) => {
                    if (!ref) return;
                    const r = ref.getBoundingClientRect();
                    if (y >= r.top && y <= r.bottom) newOver = idx;
                  });
                  if (newOver !== ezDragOverRef.current) {
                    ezDragOverRef.current = newOver;
                    setEzDragOver(newOver);
                  }
                }}
                onPointerUp={() => {
                  const from = ezDragIndexRef.current;
                  const to = ezDragOverRef.current;
                  if (from !== null && to !== null && from !== to) {
                    const next = [...ezMenuOrder];
                    const [moved] = next.splice(from, 1);
                    next.splice(to, 0, moved);
                    setEzMenuOrder(next);
                    localStorage.setItem('eazy-ez-menu-order', JSON.stringify(next));
                    window.dispatchEvent(new Event('ez-prefs-changed'));
                  }
                  ezDragIndexRef.current = null;
                  ezDragOverRef.current = null;
                  setEzDragIndex(null);
                  setEzDragOver(null);
                }}
                onPointerCancel={() => {
                  ezDragIndexRef.current = null;
                  setEzDragIndex(null);
                  setEzDragOver(null);
                }}
              >
                <GripVertical className="w-5 h-5" />
              </div>
            </div>
          ))}
          <Row
            icon={<div className="w-4 h-4 rounded-full" style={{ background: '#964735' }} />}
            title={t('settings.ez.iconOnly')}
            subtitle={t('settings.ez.iconOnlySub')}
            last
            right={<Tog checked={ezIconOnly} onChange={v => {
              setEzIconOnly(v);
              localStorage.setItem('eazy-ez-icon-only', String(v));
              window.dispatchEvent(new Event('ez-prefs-changed'));
            }} />}
          />
        </Card_>
      </div>

      {/* ── Homepage Modules ── */}
      <div className="space-y-2">
        <SectionLabel>{t('settings.homepageModules')}</SectionLabel>
        <Card_>
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: INK }}>{t('settings.homeTitle')}</p>
            </div>
            <input
              value={appTitleDraft}
              onChange={e => setAppTitleDraft(e.target.value)}
              onBlur={() => saveHomeConfig({ appTitle: appTitleDraft })}
              placeholder="Eazy.Family"
              maxLength={32}
              className="text-sm text-right outline-none bg-transparent min-w-0"
              style={{ color: TC, width: 'auto', maxWidth: 130, fontWeight: 500 }}
            />
          </div>
          {MODULE_OPTIONS.map((m, i) => (
            <Row
              key={m.key}
              title={t(m.labelKey)}
              right={<Tog checked={(homeConfig as any)[m.key] !== false} onChange={v => saveHomeConfig({ [m.key]: v })} />}
              last={i === MODULE_OPTIONS.length - 1}
            />
          ))}
        </Card_>
      </div>

      {/* ── Profile & Gallery ── */}
      <div className="space-y-2">
        <SectionLabel>{t('settings.profileGallery')}</SectionLabel>
        <Card_>
          {/* Profile Name */}
          <div className="px-4 py-3.5 flex items-center gap-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: BG }}>
              <User className="w-5 h-5" style={{ color: MUTED }} />
            </div>
            <div className="flex-1 min-w-0" onClick={() => { if (!editingName) { setNameDraft(displayName || user?.email?.split('@')[0] || ''); setEditingName(true); } }}>
              <p className="text-sm font-medium" style={{ color: INK }}>{t('settings.profileName')}</p>
              {editingName ? (
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onBlur={() => { saveDisplayName(nameDraft); setEditingName(false); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { saveDisplayName(nameDraft); setEditingName(false); }
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  className="text-xs outline-none bg-transparent w-full mt-0.5"
                  style={{ color: TC }}
                  maxLength={32}
                  placeholder={user?.email?.split('@')[0] || 'Your name'}
                />
              ) : (
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                  {displayName || user?.email?.split('@')[0] || ''}
                </p>
              )}
            </div>
            {!editingName && (
              <button
                onClick={() => { setNameDraft(displayName || user?.email?.split('@')[0] || ''); setEditingName(true); }}
                className="text-sm font-semibold flex-shrink-0"
                style={{ color: TC }}
              >
                {t('settings.change')}
              </button>
            )}
          </div>

          {/* Profile Photo */}
          <div className="px-4 py-3.5 flex items-center gap-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
            {homeConfig.iconImage
              ? <img src={homeConfig.iconImage} alt="Profile" className="w-10 h-10 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${BORDER}` }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              : <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: '#D97B66' }}>
                  {(displayName || userEmail || 'EF').slice(0, 2).toUpperCase()}
                </div>
            }
            <p className="flex-1 text-sm font-medium" style={{ color: INK }}>{t('settings.profilePhoto')}</p>
            <label htmlFor="profile-icon" className="cursor-pointer">
              <span className="text-sm font-semibold" style={{ color: TC }}>{uploadingProfile ? t('settings.uploading') : homeConfig.iconImage ? t('settings.change') : t('settings.uploadPhoto')}</span>
              <input id="profile-icon" type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'profile'); e.target.value = ''; }}
                disabled={uploadingProfile} />
            </label>
          </div>
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: INK }}>{t('settings.backgroundGallery')}</p>
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
                        <img src={img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <button onClick={() => { const n = imgs.filter((_, i) => i !== idx); saveHomeConfig({ headerImages: n, headerImage: n[0] }); deleteStorageFile('user-uploads', img).catch(() => {}); }}
                          className="tap-pad absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(28,28,24,0.6)' }}>
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </>
                    ) : (
                      <label htmlFor="header-image" className="absolute inset-0 flex items-center justify-center cursor-pointer">
                        <Plus className="w-3.5 h-3.5" style={{ color: MUTED }} />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            <input id="header-image" type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'header'); e.target.value = ''; }}
              disabled={uploadingHeader} />
            {(homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : [])).length >= 4 && (
              <p className="text-xs" style={{ color: MUTED }}>{t('settings.galleryFull')}</p>
            )}
          </div>
        </Card_>
      </div>

      {/* ── EZ-AI ── */}
      <div className="space-y-2">
        <SectionLabel>EZ-AI</SectionLabel>
        <Card_>
          <Row
            icon={<Sparkles className="w-4 h-4" style={{ color: MUTED }} />}
            title={t('settings.intelligentSuggestions')}
            subtitle={t('settings.proactiveReminders')}
            right={<Tog checked={aiSuggestions} onChange={v => { setAiSuggestions(v); localStorage.setItem('eazy-ai-suggestions', String(v)); }} />}
          />
          <Row
            icon={<Database className="w-4 h-4" style={{ color: MUTED }} />}
            title={t('settings.dataUsage')}
            subtitle={t('settings.learnFromPatterns')}
            right={<Tog checked={dataUsage} onChange={v => { setDataUsage(v); localStorage.setItem('eazy-data-usage', String(v)); }} />}
            last
          />
        </Card_>
      </div>

      {/* ── Help Center ── */}
      <div className="space-y-2">
        <SectionLabel>{t('settings.helpCenter.title')}</SectionLabel>
        <Card_>
          <Row
            icon={<HelpCircle className="w-4 h-4" style={{ color: MUTED }} />}
            title={t('settings.helpCenter.faqs')}
            right={<Arrow />}
            onClick={() => navigate('/app/help?tab=faqs')}
          />
          <Row
            icon={<Sparkles className="w-4 h-4" style={{ color: MUTED }} />}
            title={t('settings.helpCenter.features')}
            right={<Arrow />}
            onClick={() => navigate('/app/help?tab=features')}
          />
          <Row
            icon={<ExternalLink className="w-4 h-4" style={{ color: MUTED }} />}
            title={t('settings.helpCenter.contact')}
            right={<Arrow />}
            onClick={() => navigate('/app/help?tab=contact')}
          />
          <Row
            icon={<Shield className="w-4 h-4" style={{ color: MUTED }} />}
            title={t('settings.privacy.privacyPolicy')}
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
        {t('settings.actions.signOut')}
      </button>

      {/* ── Delete Account modal ── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={open => { if (!deletingAccount) setShowDeleteConfirm(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#C0392B' }}>{t('settings.deleteMyAccount')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settings.deleteWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAccount}>{t('settings.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => { e.preventDefault(); handleDeleteAccount(); }}
              disabled={deletingAccount}
              style={{ background: '#C0392B' }}>
              {deletingAccount ? t('settings.deleting') : t('settings.deleteEverything')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Family Premium sheet */}
      {showPremiumSheet && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowPremiumSheet(false)}>
          <div className="w-full rounded-t-3xl p-6 space-y-5 overflow-y-auto"
            style={{ background: CARD, maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}>

            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto" style={{ background: '#DAC1BB' }} />

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: isTrial ? '#FFF3E0' : '#FFF3D0' }}>
                <Crown className="w-5 h-5" style={{ color: isTrial ? '#D97B66' : '#FFC861' }} />
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: INK }}>Family Premium</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={
                    isTrial
                      ? { background: '#FFF0E0', color: '#964735' }
                      : { background: '#E8F5E9', color: '#2E7D32' }
                  }>
                    {isTrial ? t('settings.premium.freeTrial') : t('settings.premium.active')}
                  </span>
                  {isTrial && trialDaysLeft !== null && (
                    <span className="text-xs" style={{ color: trialDaysLeft <= 3 ? '#C4621A' : MUTED }}>
                      {trialDaysLeft === 0 ? t('settings.premium.endingToday') : trialDaysLeft === 1 ? t('settings.premium.oneDayLeft') : t('settings.premium.daysLeft', { count: trialDaysLeft })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Trial upgrade CTA */}
            {isTrial && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: 'linear-gradient(135deg, #FDF3EE 0%, #FFF8F3 100%)', border: '1px solid #EDCFB8' }}>
                <p className="text-sm font-semibold" style={{ color: '#964735' }}>{t('settings.premium.onTrialTitle')}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#7A5040' }}>
                  {t('settings.premium.onTrialDesc')}
                </p>
                <UpgradeDialog>
                  <button
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #964735 0%, #D97B66 100%)' }}
                  >
                    {t('settings.premium.upgradeBtn')}
                  </button>
                </UpgradeDialog>
              </div>
            )}

            {/* Features */}
            <div className="rounded-2xl divide-y" style={{ border: `1px solid ${BORDER}` }}>
              {(t('settings.premium.features', { returnObjects: true }) as string[]).map(f => (
                <div key={f} className="flex items-center gap-3 px-4 py-3">
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#964735' }} />
                  <p className="text-sm" style={{ color: INK }}>{f}</p>
                </div>
              ))}
            </div>

            {/* Manage subscription */}
            <button
              onClick={() => {
                const url = 'https://apps.apple.com/account/subscriptions';
                if (Capacitor.isNativePlatform()) {
                  Browser.open({ url });
                } else {
                  window.open(url, '_blank');
                }
              }}
              className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: BG, color: INK, border: `1px solid ${BORDER}` }}
            >
              <ExternalLink className="w-4 h-4" />
              {t('settings.premium.manageSub')}
            </button>

            {/* Links */}
            <div className="flex justify-center gap-5">
              <button
                onClick={() => Browser.open({ url: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/' })}
                className="text-xs" style={{ color: MUTED }}>
                {t('settings.premium.termsOfUse')}
              </button>
              <button
                onClick={() => Browser.open({ url: 'https://eazy.family/privacy' })}
                className="text-xs" style={{ color: MUTED }}>
                {t('settings.premium.privacyPolicy')}
              </button>
            </div>

            <button onClick={() => setShowPremiumSheet(false)}
              className="w-full py-2.5 text-sm font-medium rounded-2xl"
              style={{ color: MUTED, background: BG }}>
              {t('settings.premium.close')}
            </button>
          </div>
        </div>
      )}

      {guestFeature && (
        <GuestUpgradeModal feature={guestFeature} onClose={() => setGuestFeature(null)} />
      )}
    </div>
  );
};

export default Settings;
