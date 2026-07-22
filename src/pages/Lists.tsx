import React, { useState, useEffect } from "react";
import { guessShoppingCategory, guessTaskCategory } from "@/lib/intelligence";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  CheckSquare, Users, Plus, Check, Trash2, X,
  Search, ChevronDown, ChevronRight, ClipboardList, Sparkles, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import { signalPositiveMoment } from "@/lib/reviewPrompt";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useShoppingPredictions, logPurchase } from "@/hooks/useShoppingPredictions";

// ─── Custom icons ─────────────────────────────────────────────────────────────

const CartCheckIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 3h2l3 12h10a2 2 0 0 0 2-1.5l1.5-6.5a.75.75 0 0 0-.75-.75H7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 7h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    <circle cx="9.5" cy="20.5" r="1.5" stroke="currentColor" strokeWidth="1.75"/>
    <circle cx="16.5" cy="20.5" r="1.5" stroke="currentColor" strokeWidth="1.75"/>
    <path d="M10 13l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListItem {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  type: string;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  parent_id?: string | null;
  family_id?: string | null;
  assigned_to?: string | null;
  assigned_to_users?: string[] | null;
  visible_to?: string | null;
}

interface FamilyMember {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  photo?: string | null;
  displayName?: string | null;
}

type MainTab = 'tasks' | 'shopping';
type Scope = 'personal' | 'shared';
type TimeTab = 'today' | 'upcoming' | 'complete';

// ─── Category helpers ─────────────────────────────────────────────────────────

const SHOPPING_CATS = ['Produce', 'Dairy', 'Meat', 'Bakery', 'Household', 'Baby', 'Drinks', 'Other'];

const guessShoppingCat = guessShoppingCategory;
const guessTaskCat = guessTaskCategory;

const parseShoppingItems = (text: string): string[] =>
  text
    .split(/,|;|&|\band\b|\balso\b|\bund\b|\bet\b|\be\b|\by\b/i)
    .map(s => s.replace(/^(please\s+)?(add|buy|get|pick up|grab|i need|we need|put)\s+/i, '')
               .replace(/\s+to\s+(my|our|the)\s+(shopping\s+)?list\s*$/i, '').trim())
    .filter(s => s.length > 1);

// ─── Component ────────────────────────────────────────────────────────────────

const Lists = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [mainTab, setMainTab] = useState<MainTab>(
    searchParams.get('tab') === 'shopping' ? 'shopping' : 'tasks'
  );
  const [scope, setScope] = useState<Scope>('personal');

  // ── Data ─────────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [userFamilyId, setUserFamilyId] = useState<string | null>(null);

  // ── Tasks state ───────────────────────────────────────────────────────────────
  const [timeTab, setTimeTab] = useState<TimeTab>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [categoryOverrides] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('eazy-task-category-overrides') || '{}'); } catch { return {}; }
  });
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [newListItemTitle, setNewListItemTitle] = useState('');
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [newAssignees, setNewAssignees] = useState<string[]>([]);
  const [newListVisibleTo, setNewListVisibleTo] = useState<string>('family');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState('');

  // ── Shopping state ────────────────────────────────────────────────────────────
  const [newShoppingItem, setNewShoppingItem] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [qtyEditId, setQtyEditId] = useState<string | null>(null); // which row's qty stepper is expanded
  const { predictions } = useShoppingPredictions();
  const [dismissedPredictions, setDismissedPredictions] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('eazy-dismissed-predictions') || '[]')); } catch { return new Set(); }
  });
  const filteredPredictions = predictions.filter(p => !dismissedPredictions.has(p.itemName.toLowerCase()));
  const dismissPrediction = (itemName: string) => {
    const next = new Set(dismissedPredictions); next.add(itemName.toLowerCase());
    setDismissedPredictions(next);
    localStorage.setItem('eazy-dismissed-predictions', JSON.stringify([...next]));
  };

  // ── Load ──────────────────────────────────────────────────────────────────────

  const loadAll = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    setItems((data || []) as ListItem[]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ch = supabase.channel('lists-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(loadAll, 300);
      })
      .subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('family_members').select('family_id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
      .then(async ({ data: mine }) => {
        if (!mine?.family_id) return;
        setUserFamilyId(mine.family_id);
        const { data: members } = await supabase.from('family_members')
          .select('id, user_id, full_name, email, role')
          .eq('family_id', mine.family_id).eq('is_active', true);
        if (!members?.length) return;
        const { data: profiles } = await supabase.from('profiles')
          .select('user_id, display_name, home_config')
          .in('user_id', members.map(m => m.user_id));
        setFamilyMembers(members.map(m => {
          const p = profiles?.find(pr => pr.user_id === m.user_id);
          const hc = p?.home_config as { iconImage?: string } | null;
          return { ...m, photo: hc?.iconImage ?? null, displayName: p?.display_name ?? null };
        }));
      });
  }, [user]);

  useEffect(() => { setAssigneeFilter('all'); }, [scope]);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const toggleItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (!item.completed) {
      haptic('medium');
      setCompletingId(id);
      setTimeout(() => setCompletingId(null), 650);
    } else {
      haptic('light');
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
    const { error } = await supabase.from('tasks').update({ completed: !item.completed }).eq('id', id);
    if (error) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, completed: item.completed } : i));
    } else if (!item.completed) {
      if (user && item.type.startsWith('shopping')) {
        logPurchase(user.id, item.title);
      } else {
        // Completing a to-do is a genuine accomplishment — a good, non-intrusive
        // moment to (eventually) ask an engaged user for an App Store review.
        void signalPositiveMoment();
      }
    }
  };

  const deleteItem = async (id: string) => {
    haptic('light');
    const snapshot = [...items];
    setItems(p => p.filter(i => i.id !== id && i.parent_id !== id));
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      setItems(snapshot);
      toast({ title: 'Could not delete', variant: 'destructive' });
    }
  };

  const assignTask = async (taskId: string, userId: string | null) => {
    await supabase.from('tasks').update({ assigned_to: userId }).eq('id', taskId);
    setAssigningItemId(null);
  };

  const toggleAssignUser = async (taskId: string, userId: string) => {
    const item = items.find(i => i.id === taskId);
    if (!item) return;
    const current = item.assigned_to_users ?? [];
    const next = current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId];
    setItems(prev => prev.map(i => i.id === taskId ? { ...i, assigned_to_users: next } : i));
    await supabase.from('tasks').update({ assigned_to_users: next }).eq('id', taskId);
  };

  const startEditing = (item: ListItem) => {
    setEditingItemId(item.id);
    setEditingTitle(item.title);
  };

  const commitEdit = async (id: string) => {
    const trimmed = editingTitle.trim();
    setEditingItemId(null);
    if (!trimmed) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, title: trimmed } : i));
    await supabase.from('tasks').update({ title: trimmed }).eq('id', id);
  };

  const cancelEdit = () => { setEditingItemId(null); setEditingTitle(''); };

  const commitListRename = async (id: string) => {
    const trimmed = editingListTitle.trim();
    setEditingListId(null);
    if (!trimmed) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, title: trimmed } : i));
    await supabase.from('tasks').update({ title: trimmed }).eq('id', id);
  };

  const addTask = async () => {
    if (!newTitle.trim() || !user) return;
    const type = scope === 'shared' ? 'shared' : 'task';
    const { error } = await supabase.from('tasks').insert([{
      title: newTitle.trim(),
      type,
      user_id: user.id,
      due_date: newDueDate || null,
      family_id: scope === 'shared' ? userFamilyId : null,
      completed: false,
      ...(scope === 'shared' && {
        visible_to: newListVisibleTo,
        assigned_to_users: newAssignees.length > 0 ? newAssignees : null,
      }),
    }]);
    if (error) { toast({ title: 'Could not add', variant: 'destructive' }); return; }
    setNewTitle(''); setNewDueDate(''); setNewAssignees([]); setNewListVisibleTo('family'); setIsAddOpen(false);
    haptic('success');
  };

  const addToList = async (listId: string) => {
    if (!newListItemTitle.trim() || !user) return;
    const parent = items.find(i => i.id === listId);
    await supabase.from('tasks').insert([{
      title: newListItemTitle.trim(),
      type: 'shared',
      user_id: user.id,
      parent_id: listId,
      family_id: parent?.family_id ?? userFamilyId,
      completed: false,
    }]);
    setNewListItemTitle(''); setAddingToListId(null);
  };

  const addShoppingItem = async () => {
    if (!newShoppingItem.trim() || !user) return;
    const titles = parseShoppingItems(newShoppingItem.trim());
    if (!titles.length) return;
    haptic('light');
    const dbType = scope === 'personal' ? 'shopping_personal' : 'shopping';
    const { error } = await supabase.from('tasks').insert(
      // shared shopping MUST carry family_id or RLS hides it from other members
      titles.map(title => ({ title, type: dbType, user_id: user.id, completed: false, family_id: scope === 'shared' ? userFamilyId : null }))
    );
    if (error) { toast({ title: 'Could not add item', variant: 'destructive' }); return; }
    setNewShoppingItem('');
  };

  const clearCompleted = async () => {
    haptic('medium');
    const dbType = scope === 'personal' ? 'shopping_personal' : 'shopping';
    const ids = items.filter(i => i.type === dbType && i.completed).map(i => i.id);
    if (!ids.length) return;
    setItems(p => p.filter(i => !ids.includes(i.id)));
    const { error } = await supabase.from('tasks').delete().in('id', ids);
    if (error) toast({ title: 'Could not clear', variant: 'destructive' });
  };

  const handleVoiceItemsAdded = async (addedItems: string[]) => {
    if (!user) return;
    if (mainTab === 'tasks') {
      const type = scope === 'shared' ? 'shared' : 'task';
      await supabase.from('tasks').insert(addedItems.map(title => ({ title, type, user_id: user.id, completed: false, family_id: scope === 'shared' ? userFamilyId : null })));
    } else {
      const dbType = scope === 'personal' ? 'shopping_personal' : 'shopping';
      await supabase.from('tasks').insert(addedItems.map(title => ({ title, type: dbType, user_id: user.id, completed: false })));
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
  const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(todayDate.getDate() + 1);

  const taskItems = items.filter(i => {
    if (i.type !== 'task') return false;
    if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    const justCompleted = i.id === completingId;
    if (timeTab === 'today') {
      if (i.completed && !justCompleted) return false;
      if (!i.due_date) return true;
      const d = new Date(i.due_date); d.setHours(0, 0, 0, 0);
      return d <= tomorrowDate;
    }
    if (timeTab === 'upcoming') {
      if ((i.completed && !justCompleted) || !i.due_date) return false;
      const d = new Date(i.due_date); d.setHours(0, 0, 0, 0);
      return d >= tomorrowDate;
    }
    return i.completed;
  });

  const groupByTaskCategory = (list: ListItem[]) => {
    const groups: Record<string, ListItem[]> = {};
    list.forEach(task => {
      const cat = categoryOverrides[task.id] || guessTaskCat(task.title);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(task);
    });
    return groups;
  };

  const sharedLists = items.filter(i =>
    i.type === 'shared' && !i.parent_id &&
    (!searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase())));
  const getListItems = (listId: string) => {
    const all = items.filter(i => i.parent_id === listId);
    if (assigneeFilter === 'all') return all;
    const filterId = assigneeFilter === 'me' ? (user?.id ?? '') : assigneeFilter;
    return all.filter(i =>
      i.assigned_to === filterId ||
      (i.assigned_to_users ?? []).includes(filterId)
    );
  };

  const shoppingDbType = scope === 'personal' ? 'shopping_personal' : 'shopping';
  // Avatar + first-name pill(s) for assigned members — used on shopping rows.
  const renderAssigneePills = (uids: string[] | null | undefined, max = 2) => {
    if (!uids?.length) return null;
    return (
      <div className="flex items-center gap-1 flex-shrink-0">
        {uids.slice(0, max).map(uid => {
          const m = familyMembers.find(fm => fm.user_id === uid);
          const name = (m?.displayName || m?.full_name || 'M').split(' ')[0];
          return (
            <span key={uid}
              className="flex items-center gap-1 rounded-full pl-0.5 pr-2 py-0.5 text-[11px] font-semibold flex-shrink-0"
              style={{ background: '#EEF4F0', color: '#44664F' }}
              title={m?.full_name || name}>
              {m?.photo
                ? <img src={m.photo} className="w-4 h-4 rounded-full object-cover flex-shrink-0" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                : <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ background: '#8FB399' }}>{name.charAt(0).toUpperCase()}</span>}
              {name}
            </span>
          );
        })}
      </div>
    );
  };

  const shoppingItems = items.filter(i => i.type === shoppingDbType);
  const shoppingUncompleted = shoppingItems.filter(i => !i.completed);
  const shoppingCompleted = shoppingItems.filter(i => i.completed);
  const shoppingGrouped = SHOPPING_CATS.reduce((acc, cat) => {
    const catItems = shoppingUncompleted.filter(i => guessShoppingCat(i.title) === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, ListItem[]>);

  const getQty = (id: string) => quantities[id] ?? 1;
  const updateQty = (id: string, delta: number) =>
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, (prev[id] ?? 1) + delta) }));

  // ── Styles ────────────────────────────────────────────────────────────────────
  const ACCENT = '#964735';
  const MUTED = 'hsl(var(--muted-foreground))';
  const CARD = 'hsl(var(--card))';
  const BORDER = 'hsl(var(--border))';
  const INK = 'hsl(var(--foreground))';
  const MUTEDBG = 'hsl(var(--muted))';

  const toggleList = (listId: string) =>
    setExpandedLists(prev => { const n = new Set(prev); n.has(listId) ? n.delete(listId) : n.add(listId); return n; });

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-4">

      {/* ── Main tab: Tasks | Shopping ── */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: MUTEDBG }}>
        {(['tasks', 'shopping'] as const).map(tab => (
          <button key={tab} onClick={() => setMainTab(tab)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: mainTab === tab ? ACCENT : 'transparent', color: mainTab === tab ? '#fff' : MUTED }}
          >
            {tab === 'tasks' ? <CheckSquare className="w-4 h-4" /> : <CartCheckIcon className="w-4 h-4" />}
            {tab === 'tasks' ? t('nav.todos') : t('nav.shopping')}
          </button>
        ))}
      </div>

      {/* ── Scope toggle: Personal | Shared ── */}
      <div className="flex w-fit mx-auto gap-0.5 p-0.5 rounded-full" style={{ background: MUTEDBG, border: `1px solid ${BORDER}` }}>
        {(['personal', 'shared'] as const).map(s => (
          <button key={s} onClick={() => setScope(s)}
            className="px-3 py-0.5 rounded-full text-xs font-semibold transition-all"
            style={{ background: scope === s ? ACCENT : 'transparent', color: scope === s ? '#fff' : MUTED }}
          >
            {s === 'personal' ? t('shopping.personalList') : t('shopping.sharedList')}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TASKS TAB
          ══════════════════════════════════════════ */}
      {mainTab === 'tasks' && (
        <>
          {/* ── Personal tasks ── */}
          {scope === 'personal' && (
            <>
              <div className="flex gap-1 p-1 rounded-2xl" style={{ background: MUTEDBG }}>
                {(['today', 'upcoming', 'complete'] as const).map(tab => (
                  <button key={tab} onClick={() => setTimeTab(tab)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: timeTab === tab ? ACCENT : 'transparent', color: timeTab === tab ? '#fff' : MUTED }}
                  >
                    {tab === 'today' ? t('todos.today') : tab === 'upcoming' ? t('todos.upcoming') : t('todos.complete')}
                  </button>
                ))}
              </div>

              {/* Search + add on one row (was two stacked rows) */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
                  <input
                    placeholder={t('todos.searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none"
                    style={{ background: MUTEDBG, border: `1px solid ${BORDER}`, color: INK }}
                  />
                </div>
                <button
                  onClick={() => setIsAddOpen(true)}
                  aria-label={t('todos.newTask')}
                  className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: ACCENT, color: '#fff' }}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {taskItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: MUTEDBG }}>
                    <CheckSquare className="w-7 h-7" style={{ color: MUTED }} />
                  </div>
                  <p className="font-semibold" style={{ color: INK }}>
                    {timeTab === 'complete' ? t('todos.noCompletedYet') : t('todos.allClear')}
                  </p>
                  <p className="text-sm mt-1" style={{ color: MUTED }}>
                    {timeTab === 'complete' ? t('todos.completeToSeeHere') : t('todos.upcomingWillAppear')}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(groupByTaskCategory(taskItems)).map(([cat, catTasks]) => (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>{t(`todos.categories.${cat}`, cat)}</h3>
                        <span className="text-xs" style={{ color: MUTED }}>
                          {catTasks.length} {catTasks.length !== 1 ? t('todos.tasksPlural') : t('todos.tasks')}
                        </span>
                      </div>
                      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #EBE8E2' }}>
                        {catTasks.map((task, i) => {
                          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed;
                          const isCompleting = completingId === task.id;
                          return (
                            <div key={task.id}
                              className="flex items-center gap-3 px-4 py-3.5"
                              style={{ background: CARD, borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}
                            >
                              <button onClick={() => toggleItem(task.id)}
                                className="flex-shrink-0 rounded-full flex items-center justify-center appearance-none p-0"
                                style={{
                                  width: isCompleting ? '26px' : '22px',
                                  height: isCompleting ? '26px' : '22px',
                                  flexShrink: 0,
                                  border: (task.completed || isCompleting) ? 'none' : '2px solid #DAC1BB',
                                  background: isCompleting ? '#8FB399' : task.completed ? ACCENT : 'transparent',
                                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                }}
                              >
                                {(task.completed || isCompleting) && (
                                  <Check className={isCompleting ? "w-4 h-4 text-white" : "w-3.5 h-3.5 text-white"} />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                {editingItemId === task.id ? (
                                  <input
                                    autoFocus
                                    value={editingTitle}
                                    onChange={e => setEditingTitle(e.target.value)}
                                    onBlur={() => commitEdit(task.id)}
                                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(task.id); if (e.key === 'Escape') cancelEdit(); }}
                                    className="w-full text-[15px] outline-none rounded px-1"
                                    style={{ color: INK, background: MUTEDBG, border: `1px solid ${ACCENT}` }}
                                  />
                                ) : (
                                  <span
                                    className="text-[15px] cursor-text truncate block"
                                    style={{ color: task.completed ? MUTED : INK, textDecoration: task.completed ? 'line-through' : 'none' }}
                                    onClick={() => !task.completed && startEditing(task)}
                                    title={task.title}
                                  >
                                    {task.title}
                                  </span>
                                )}
                                {task.due_date && editingItemId !== task.id && (() => {
                                  const dd = new Date(task.due_date);
                                  const hasTime = dd.getHours() !== 0 || dd.getMinutes() !== 0;
                                  return (
                                    <div className="text-[13px] mt-0.5" style={{ color: isOverdue ? '#BA1A1A' : '#7A6660' }}>
                                      {isOverdue ? `${t('todos.urgent')} · ` : ''}
                                      {format(dd, hasTime ? "EEE, h:mm a" : "EEE, MMM d")}
                                    </div>
                                  );
                                })()}
                              </div>
                              <button onClick={() => deleteItem(task.id)} className="opacity-50 p-2 -mr-1.5 -my-1 rounded-lg transition-opacity active:opacity-100">
                                <Trash2 className="w-4 h-4" style={{ color: MUTED }} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Shared task lists ── */}
          {scope === 'shared' && (
            <div className="space-y-3">
              {/* Search + add on one row (matches Personal; + opens New List) */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
                  <input
                    placeholder={t('todos.searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none"
                    style={{ background: MUTEDBG, border: `1px solid ${BORDER}`, color: INK }}
                  />
                </div>
                <button
                  onClick={() => setIsAddOpen(true)}
                  aria-label={t('todos.newList')}
                  className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: ACCENT, color: '#fff' }}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Assignee filter strip */}
              {familyMembers.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {/* All */}
                  <button onClick={() => setAssigneeFilter('all')}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                    style={{ background: assigneeFilter === 'all' ? ACCENT : MUTEDBG, color: assigneeFilter === 'all' ? '#fff' : MUTED }}>
                    {t('todos.all')}
                  </button>
                  {/* Me — with own photo */}
                  {(() => {
                    const me = familyMembers.find(m => m.user_id === user?.id);
                    const sel = assigneeFilter === 'me';
                    return (
                      <button onClick={() => setAssigneeFilter('me')}
                        className="flex items-center gap-1.5 flex-shrink-0 rounded-full text-[11px] font-semibold transition-all"
                        style={{ background: sel ? ACCENT : '#EEF4F0', color: sel ? '#fff' : '#44664F', padding: '4px 10px 4px 4px' }}>
                        {me?.photo
                          ? <img src={me.photo} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          : <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ background: sel ? 'rgba(255,255,255,0.3)' : '#8FB399' }}>
                              {(me?.displayName || user?.email || 'M').charAt(0).toUpperCase()}
                            </span>
                        }
                        {t('todos.me')}
                      </button>
                    );
                  })()}
                  {/* Other members */}
                  {familyMembers.filter(m => m.user_id !== user?.id).map(m => {
                    const name = (m.displayName || m.full_name || 'Member').split(' ')[0];
                    const sel = assigneeFilter === m.user_id;
                    return (
                      <button key={m.user_id} onClick={() => setAssigneeFilter(m.user_id)}
                        className="flex items-center gap-1.5 flex-shrink-0 rounded-full text-[11px] font-semibold transition-all"
                        style={{ background: sel ? ACCENT : '#EEF4F0', color: sel ? '#fff' : '#44664F', padding: '4px 10px 4px 4px' }}>
                        {m.photo
                          ? <img src={m.photo} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          : <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ background: sel ? 'rgba(255,255,255,0.3)' : '#8FB399' }}>
                              {name.charAt(0).toUpperCase()}
                            </span>
                        }
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}

              {sharedLists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: MUTEDBG }}>
                    <Users className="w-7 h-7" style={{ color: MUTED }} />
                  </div>
                  <p className="font-semibold" style={{ color: INK }}>{t('todos.noSharedLists')}</p>
                  <p className="text-sm mt-1" style={{ color: MUTED }}>{t('todos.noSharedListsDesc')}</p>
                </div>
              ) : sharedLists.map(list => {
                const listItems = getListItems(list.id);
                const isExpanded = expandedLists.has(list.id);
                const doneCount = listItems.filter(i => i.completed).length;
                return (
                  <div key={list.id} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: CARD }}>
                    <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => { if (editingListId !== list.id) toggleList(list.id); }}>
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
                        : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />}
                      <ClipboardList className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
                      <div className="flex-1 min-w-0 space-y-1">
                        {editingListId === list.id ? (
                          <input
                            autoFocus
                            value={editingListTitle}
                            onChange={e => setEditingListTitle(e.target.value)}
                            onBlur={() => commitListRename(list.id)}
                            onKeyDown={e => { if (e.key === 'Enter') commitListRename(list.id); if (e.key === 'Escape') setEditingListId(null); }}
                            onClick={e => e.stopPropagation()}
                            className="w-full text-sm font-semibold outline-none bg-transparent border-b"
                            style={{ color: ACCENT, borderColor: ACCENT }}
                            maxLength={60}
                          />
                        ) : (
                          <p
                            className="font-semibold text-sm truncate cursor-text"
                            style={{ color: INK }}
                            onClick={e => { e.stopPropagation(); setEditingListTitle(list.title); setEditingListId(list.id); setExpandedLists(prev => new Set([...prev, list.id])); }}
                          >{list.title}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <p className="text-xs" style={{ color: MUTED }}>
                            {listItems.length === 0 ? t('todos.noItemsYet') : `${doneCount}/${listItems.length} ${t('todos.doneCount')}`}
                          </p>
                          {listItems.length > 0 && (
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: MUTEDBG }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${(doneCount / listItems.length) * 100}%`, background: ACCENT }} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); deleteItem(list.id); }} className="w-9 h-9 flex items-center justify-center rounded-xl opacity-50 transition-opacity active:opacity-100">
                          <Trash2 className="w-4 h-4" style={{ color: MUTED }} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${BORDER}` }}>
                        {listItems.map(item => {
                          const assignee = familyMembers.find(m => m.user_id === item.assigned_to);
                          const isAssigning = assigningItemId === item.id;
                          return (
                            <div key={item.id}>
                              <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: `1px solid ${BORDER}` }}>
                                <Checkbox checked={item.completed} onCheckedChange={() => toggleItem(item.id)} />
                                {editingItemId === item.id ? (
                                  <input
                                    autoFocus
                                    value={editingTitle}
                                    onChange={e => setEditingTitle(e.target.value)}
                                    onBlur={() => commitEdit(item.id)}
                                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(item.id); if (e.key === 'Escape') cancelEdit(); }}
                                    className="flex-1 text-sm outline-none rounded px-1"
                                    style={{ color: INK, background: MUTEDBG, border: `1px solid ${ACCENT}` }}
                                  />
                                ) : (
                                  <span
                                    className="flex-1 text-sm cursor-text"
                                    style={{ color: item.completed ? MUTED : INK, textDecoration: item.completed ? 'line-through' : 'none' }}
                                    onClick={() => !item.completed && startEditing(item)}
                                  >
                                    {item.title}
                                  </span>
                                )}
                                {/* Assignee avatar(s) — tap to open assign picker.
                                    Shows stacked avatars when assigned, subtle empty
                                    circle when unassigned. Replaces separate pills +
                                    dashed "+" button (ambiguous, wastes space). */}
                                <button
                                  onClick={() => setAssigningItemId(isAssigning ? null : item.id)}
                                  className="flex items-center flex-shrink-0"
                                  title="Assign"
                                >
                                  {(item.assigned_to_users?.length ?? 0) > 0 ? (
                                    <div className="flex -space-x-1.5">
                                      {(item.assigned_to_users ?? []).slice(0, 3).map(uid => {
                                        const m = familyMembers.find(fm => fm.user_id === uid);
                                        const name = (m?.displayName || m?.full_name || 'M').split(' ')[0];
                                        return m?.photo ? (
                                          <img key={uid} src={m.photo}
                                            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                                            style={{ outline: `2px solid ${CARD}` }}
                                            alt={name}
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                          />
                                        ) : (
                                          <span key={uid}
                                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                                            style={{ background: '#8FB399', outline: `2px solid ${CARD}` }}
                                          >
                                            {name.charAt(0).toUpperCase()}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span
                                      className="w-7 h-7 rounded-full flex-shrink-0"
                                      style={{ border: `1.5px dashed ${BORDER}` }}
                                    />
                                  )}
                                </button>
                                <button onClick={() => deleteItem(item.id)} className="w-8 h-8 flex items-center justify-center rounded-lg opacity-50 transition-opacity active:opacity-100 flex-shrink-0">
                                  <Trash2 className="w-4 h-4" style={{ color: MUTED }} />
                                </button>
                              </div>
                              {isAssigning && (
                                <div className="ml-4 mb-2 px-4 flex flex-wrap gap-1.5">
                                  {(() => {
                                    const myData = familyMembers.find(fm => fm.user_id === user?.id);
                                    const others = familyMembers.filter(m => m.user_id !== user?.id);
                                    return [{ user_id: user?.id ?? '', photo: myData?.photo, name: t('todos.me') }, ...others.map(m => ({ user_id: m.user_id, photo: m.photo, name: (m.displayName || m.full_name || 'Member').split(' ')[0] }))].map(m => {
                                      const sel = (item.assigned_to_users ?? []).includes(m.user_id);
                                      return (
                                        <button key={m.user_id} onClick={() => toggleAssignUser(item.id, m.user_id)}
                                          className="flex items-center gap-1 rounded-full text-xs font-semibold transition-all"
                                          style={{ background: sel ? ACCENT : '#EEF4F0', color: sel ? '#fff' : '#44664F', padding: '4px 10px 4px 4px' }}>
                                          {m.photo
                                            ? <img src={m.photo} className="w-4 h-4 rounded-full object-cover flex-shrink-0" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            : <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ background: sel ? 'rgba(255,255,255,0.3)' : '#8FB399' }}>
                                                {m.name.charAt(0).toUpperCase()}
                                              </span>
                                          }
                                          {m.name}
                                        </button>
                                      );
                                    });
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {addingToListId === list.id ? (
                          <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderTop: `1px solid ${BORDER}` }}>
                            <input
                              autoFocus
                              placeholder={t('todos.itemNamePlaceholder')}
                              value={newListItemTitle}
                              onChange={e => setNewListItemTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') addToList(list.id);
                                if (e.key === 'Escape') { setAddingToListId(null); setNewListItemTitle(''); }
                              }}
                              className="flex-1 min-w-0 h-9 rounded-lg px-3 text-sm outline-none"
                              style={{ background: MUTEDBG, border: `1px solid ${BORDER}`, color: INK }}
                            />
                            <button onClick={() => addToList(list.id)}
                              className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                              style={{ background: ACCENT }}>
                              <Check className="w-4 h-4 text-white" />
                            </button>
                            <button onClick={() => { setAddingToListId(null); setNewListItemTitle(''); }}
                              className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                              style={{ background: MUTEDBG }}>
                              <X className="w-4 h-4" style={{ color: MUTED }} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingToListId(list.id); setExpandedLists(prev => new Set([...prev, list.id])); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm"
                            style={{ color: MUTED, borderTop: `1px solid ${BORDER}` }}
                          >
                            <Plus className="w-4 h-4" />
                            {t('todos.addItem')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════
          SHOPPING TAB
          ══════════════════════════════════════════ */}
      {mainTab === 'shopping' && (
        <>
          {/* Add item bar */}
          <div className="flex items-center rounded-2xl px-3 py-2.5 gap-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <button onClick={addShoppingItem}
              className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 transition-colors"
              style={{ background: newShoppingItem.trim() ? ACCENT : '#F1EDE7' }}>
              <Plus className="w-4 h-4" style={{ color: newShoppingItem.trim() ? '#fff' : MUTED }} />
            </button>
            <input
              value={newShoppingItem}
              onChange={e => setNewShoppingItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addShoppingItem()}
              placeholder={t('shopping.addItemPlaceholder')}
              className="flex-1 outline-none text-sm"
              style={{ color: INK, background: 'transparent' }}
            />
          </div>

          {/* Predictions */}
          {filteredPredictions.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#EEF4F0', border: '1px solid #C8DDD0' }}>
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid #C8DDD0' }}>
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#44664F' }} />
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#44664F' }}>{t('shopping.probablyRunningLow')}</p>
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {filteredPredictions.map(p => (
                  <div key={p.itemName} className="flex items-center gap-1 text-xs font-medium rounded-full" style={{ background: '#C8DDD0', color: '#2D4F38' }}>
                    <button onClick={() => setNewShoppingItem(p.itemName)} className="pl-2.5 pr-1 py-1 max-w-[140px] truncate">
                      + {p.itemName}
                    </button>
                    <button
                      onClick={() => dismissPrediction(p.itemName)}
                      className="tap-pad flex items-center justify-center w-5 h-5 mr-1 rounded-full hover:bg-black/10 transition-colors flex-shrink-0"
                      title={t('shopping.removeSuggestion')}
                    >
                      <X className="w-2.5 h-2.5" style={{ color: '#44664F' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grouped uncompleted */}
          {Object.entries(shoppingGrouped).map(([cat, catItems]) => (
            <div key={cat} className="space-y-1.5">
              <p className="text-xs font-semibold tracking-widest uppercase px-1" style={{ color: MUTED }}>
                {t(`shopping.categories.${cat}`, cat)}
              </p>
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                {catItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3.5"
                    style={{ background: CARD, borderBottom: idx < catItems.length - 1 ? '1px solid #F1EDE7' : 'none' }}>
                    <button onClick={() => toggleItem(item.id)}
                      className="flex-shrink-0 rounded-md appearance-none p-0"
                      style={{ width: 22, height: 22, border: `2px solid ${BORDER}`, background: 'transparent' }}>
                    </button>
                    {editingItemId === item.id ? (
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onBlur={() => commitEdit(item.id)}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(item.id); if (e.key === 'Escape') cancelEdit(); }}
                        className="flex-1 min-w-0 text-[15px] outline-none rounded px-1"
                        style={{ color: INK, background: MUTEDBG, border: `1px solid ${ACCENT}` }}
                      />
                    ) : (
                      <span className="flex-1 min-w-0 text-[15px] cursor-text truncate" style={{ color: INK }} onClick={() => startEditing(item)} title={item.title}>{item.title}</span>
                    )}
                    {scope === 'shared' && renderAssigneePills(item.assigned_to_users)}
                    {/* Qty: compact tappable chip by default (frees the row for the name);
                        expands to a stepper only for the tapped row. */}
                    {qtyEditId === item.id ? (
                      <div className="flex items-center rounded-full flex-shrink-0" style={{ background: MUTEDBG, padding: '2px 4px', gap: '2px' }}>
                        <button onClick={() => updateQty(item.id, -1)}
                          style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: '18px', lineHeight: 1 }}>−</button>
                        <button onClick={() => setQtyEditId(null)} className="text-sm font-semibold" style={{ color: INK, minWidth: '18px', textAlign: 'center' }}>{getQty(item.id)}</button>
                        <button onClick={() => updateQty(item.id, 1)}
                          style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: '18px', lineHeight: 1 }}>+</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setQtyEditId(item.id)}
                        className="flex-shrink-0 rounded-full text-sm font-semibold flex items-center justify-center"
                        style={{
                          minWidth: 26, height: 26, padding: '0 8px',
                          background: getQty(item.id) > 1 ? MUTEDBG : 'transparent',
                          color: getQty(item.id) > 1 ? INK : MUTED,
                        }}
                        aria-label="Quantity"
                      >
                        {getQty(item.id) > 1 ? `×${getQty(item.id)}` : '1'}
                      </button>
                    )}
                    <button onClick={() => deleteItem(item.id)} className="flex-shrink-0 flex items-center justify-center opacity-50 active:opacity-100" style={{ width: 32, height: 32 }}>
                      <Trash2 className="w-4 h-4" style={{ color: MUTED }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Completed */}
          {shoppingCompleted.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: MUTED }}>{t('shopping.completed')}</p>
                <button onClick={clearCompleted} className="flex items-center gap-1 text-xs font-semibold" style={{ color: MUTED }}>
                  <RefreshCw className="w-3 h-3" />
                  {t('shopping.removeAll')}
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                {shoppingCompleted.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3.5"
                    style={{ background: CARD, borderBottom: idx < shoppingCompleted.length - 1 ? '1px solid #F1EDE7' : 'none' }}>
                    <button onClick={() => toggleItem(item.id)}
                      className="w-[22px] h-[22px] rounded-md flex items-center justify-center flex-shrink-0 appearance-none p-0"
                      style={{ background: ACCENT, border: `2px solid ${ACCENT}` }}>
                      <span className="text-white" style={{ fontSize: '12px', lineHeight: 1 }}>✓</span>
                    </button>
                    <span className="flex-1 min-w-0 text-[15px] line-through truncate" style={{ color: MUTED }} title={item.title}>{item.title}</span>
                    <button onClick={() => deleteItem(item.id)} className="w-8 h-8 flex items-center justify-center rounded-lg opacity-50 transition-opacity active:opacity-100 flex-shrink-0">
                      <Trash2 className="w-4 h-4" style={{ color: '#DAC1BB' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && shoppingItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">🛒</p>
              <p className="font-semibold" style={{ color: INK }}>{t('shopping.emptyList')}</p>
              <p className="text-sm mt-1" style={{ color: MUTED }}>{t('shopping.emptyListHint')}</p>
            </div>
          )}
        </>
      )}

      {/* ── Add Task / New List dialog ── */}
      <Dialog open={isAddOpen} onOpenChange={open => { setIsAddOpen(open); if (!open) { setNewTitle(''); setNewDueDate(''); setNewAssignees([]); setNewListVisibleTo('family'); } }}>
        <DialogContent className="w-[95%] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {scope === 'shared' ? t('todos.createSharedListTitle') : t('todos.addNewTask')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {scope === 'shared' ? t('todos.listNameLabel') : t('todos.taskTitleLabel')}
              </Label>
              <Input
                autoFocus
                placeholder={scope === 'shared' ? t('todos.enterListName') : t('todos.enterTaskDesc')}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
              />
            </div>
            {scope === 'personal' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('todos.dueDateOptional')}</Label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                />
              </div>
            )}
            {scope === 'shared' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('todos.visibleTo')}</Label>
                  <div className="flex gap-2">
                    {(['family', 'parents'] as const).map(v => (
                      <button key={v} type="button" onClick={() => setNewListVisibleTo(v)}
                        className="flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                        style={{ background: newListVisibleTo === v ? ACCENT : MUTEDBG, color: newListVisibleTo === v ? '#fff' : MUTED, borderColor: newListVisibleTo === v ? ACCENT : 'transparent' }}>
                        {v === 'family' ? t('todos.everyone') : t('todos.parentsOnly')}
                      </button>
                    ))}
                  </div>
                </div>
                {familyMembers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('todos.assignTo')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const myData = familyMembers.find(fm => fm.user_id === user?.id);
                        const others = familyMembers.filter(m => m.user_id !== user?.id);
                        return [{ user_id: user?.id ?? '', photo: myData?.photo, displayName: myData?.displayName, isSelf: true }, ...others.map(m => ({ ...m, isSelf: false }))].map(m => {
                          const uid = m.user_id;
                          const name = (m as any).isSelf ? t('todos.me') : ((m as FamilyMember).displayName || (m as FamilyMember).full_name || 'Member').split(' ')[0];
                          const photo = (m as any).photo as string | null | undefined;
                          const selected = newAssignees.includes(uid);
                          return (
                            <button key={uid} type="button"
                              onClick={() => setNewAssignees(prev => selected ? prev.filter(id => id !== uid) : [...prev, uid])}
                              className="flex items-center gap-1.5 rounded-full text-sm font-semibold transition-all"
                              style={{ background: selected ? ACCENT : '#EEF4F0', color: selected ? '#fff' : '#44664F', padding: '6px 14px 6px 6px' }}>
                              {photo
                                ? <img src={photo} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                : <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: selected ? 'rgba(255,255,255,0.3)' : '#8FB399' }}>
                                    {name.charAt(0).toUpperCase()}
                                  </span>
                              }
                              {name}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1">
              {t('todos.cancel')}
            </Button>
            <Button onClick={addTask} disabled={!newTitle.trim()} className="flex-1">
              {scope === 'shared' ? t('todos.createListBtn') : t('todos.addTaskBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lists;
