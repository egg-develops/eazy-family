import React, { useState, useEffect } from "react";
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
}

type MainTab = 'tasks' | 'shopping';
type Scope = 'personal' | 'shared';
type TimeTab = 'today' | 'upcoming' | 'complete';

// ─── Category helpers ─────────────────────────────────────────────────────────

const SHOPPING_CATS = ['Produce', 'Dairy', 'Meat', 'Bakery', 'Household', 'Baby', 'Drinks', 'Other'];

const guessShoppingCat = (title: string): string => {
  const t = title.toLowerCase();
  if (/apple|banana|orange|lemon|lime|lettuce|tomato|carrot|spinach|kale|fruit|vegetable|avocado|onion|garlic|potato|pepper|celery|cucumber/.test(t)) return 'Produce';
  if (/\bmilk\b|cheese|yogurt|butter|cream|egg|dairy|oat milk|almond milk|soy milk/.test(t)) return 'Dairy';
  if (/chicken|beef|pork|lamb|fish|salmon|tuna|shrimp|meat|turkey|ham|bacon|sausage/.test(t)) return 'Meat';
  if (/bread|bagel|muffin|cake|pastry|croissant|oatmeal|oat|cereal|granola|flour|rice|pasta|noodle/.test(t)) return 'Bakery';
  if (/paper|soap|detergent|cleaning|towel|toilet|sponge|trash|bag|foil|wrap|wipe/.test(t)) return 'Household';
  if (/diaper|formula|baby|puree/.test(t)) return 'Baby';
  if (/water|juice|coffee|tea|beer|wine|soda|drink|beverage|smoothie/.test(t)) return 'Drinks';
  return 'Other';
};

const guessTaskCat = (title: string): string => {
  const lower = title.toLowerCase();
  if (/school|homework|lesson|class|pick up|drop off|practice|kid|child|son|daughter/.test(lower)) return 'Kids';
  if (/budget|bill|review|admin|account|insurance|tax|bank|report/.test(lower)) return 'Admin';
  if (/clean|laundry|water|plant|groceries|cook|kitchen|garden|fix|repair/.test(lower)) return 'Home';
  return 'Personal';
};

const parseShoppingItems = (text: string): string[] =>
  text
    .split(/,|;|&|\band\b|\balso\b|\bund\b|\bet\b|\be\b/i)
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

  // ── Shopping state ────────────────────────────────────────────────────────────
  const [newShoppingItem, setNewShoppingItem] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
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
      .then(({ data: mine }) => {
        if (!mine?.family_id) return;
        setUserFamilyId(mine.family_id);
        supabase.from('family_members').select('id, user_id, full_name, email, role')
          .eq('family_id', mine.family_id).eq('is_active', true)
          .then(({ data }) => setFamilyMembers(data || []));
      });
  }, [user]);

  useEffect(() => { setAssigneeFilter('all'); }, [scope]);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const toggleItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    haptic('light');
    setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
    const { error } = await supabase.from('tasks').update({ completed: !item.completed }).eq('id', id);
    if (error) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, completed: item.completed } : i));
    } else if (!item.completed && user && item.type.startsWith('shopping')) {
      logPurchase(user.id, item.title);
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
      titles.map(title => ({ title, type: dbType, user_id: user.id, completed: false }))
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
    if (timeTab === 'today') {
      if (i.completed) return false;
      if (!i.due_date) return true;
      const d = new Date(i.due_date); d.setHours(0, 0, 0, 0);
      return d <= tomorrowDate;
    }
    if (timeTab === 'upcoming') {
      if (i.completed || !i.due_date) return false;
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

  const sharedLists = items.filter(i => i.type === 'shared' && !i.parent_id);
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
            {tab === 'tasks' ? t('nav.todos', 'Tasks') : t('nav.shopping', 'Shopping')}
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
            {s === 'personal' ? t('shopping.personalList', 'Personal') : t('shopping.sharedList', 'Shared')}
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

              {/* Add button row — below the time filter tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="ml-auto flex items-center px-4 py-2 rounded-full text-xs font-semibold"
                  style={{ background: ACCENT, color: '#fff' }}
                >
                  {t('todos.newTask', 'New Task')}
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
                <input
                  placeholder={t('todos.searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none"
                  style={{ background: MUTEDBG, border: `1px solid ${BORDER}`, color: INK }}
                />
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
                        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>{cat}</h3>
                        <span className="text-xs" style={{ color: MUTED }}>
                          {catTasks.length} {catTasks.length !== 1 ? t('todos.tasksPlural') : t('todos.tasks')}
                        </span>
                      </div>
                      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #EBE8E2' }}>
                        {catTasks.map((task, i) => {
                          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed;
                          return (
                            <div key={task.id}
                              className="flex items-center gap-3 px-4 py-3"
                              style={{ background: CARD, borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}
                            >
                              <button onClick={() => toggleItem(task.id)}
                                className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all appearance-none p-0"
                                style={{ border: task.completed ? 'none' : '1.5px solid #DAC1BB', background: task.completed ? ACCENT : 'transparent' }}
                              >
                                {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                {editingItemId === task.id ? (
                                  <input
                                    autoFocus
                                    value={editingTitle}
                                    onChange={e => setEditingTitle(e.target.value)}
                                    onBlur={() => commitEdit(task.id)}
                                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(task.id); if (e.key === 'Escape') cancelEdit(); }}
                                    className="w-full text-sm outline-none rounded px-1"
                                    style={{ color: INK, background: MUTEDBG, border: `1px solid ${ACCENT}` }}
                                  />
                                ) : (
                                  <span
                                    className="text-sm cursor-text"
                                    style={{ color: task.completed ? MUTED : INK, textDecoration: task.completed ? 'line-through' : 'none' }}
                                    onClick={() => !task.completed && startEditing(task)}
                                  >
                                    {task.title}
                                  </span>
                                )}
                                {task.due_date && editingItemId !== task.id && (() => {
                                  const dd = new Date(task.due_date);
                                  const hasTime = dd.getHours() !== 0 || dd.getMinutes() !== 0;
                                  return (
                                    <div className="text-xs mt-0.5" style={{ color: isOverdue ? '#BA1A1A' : '#7A6660' }}>
                                      {isOverdue ? `${t('todos.urgent')} · ` : ''}
                                      {format(dd, hasTime ? "EEE, h:mm a" : "EEE, MMM d")}
                                    </div>
                                  );
                                })()}
                              </div>
                              <button onClick={() => deleteItem(task.id)} className="opacity-40 hover:opacity-100 transition-opacity p-1">
                                <Trash2 className="w-3.5 h-3.5" style={{ color: MUTED }} />
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="ml-auto flex items-center px-4 py-2 rounded-full text-xs font-semibold"
                  style={{ background: ACCENT, color: '#fff' }}
                >
                  {t('todos.newList', 'New List')}
                </button>
              </div>

              {/* Assignee filter strip */}
              {familyMembers.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {[{ id: 'all', label: 'All' }, { id: 'me', label: 'Me' }, ...familyMembers.map(m => ({ id: m.user_id, label: (m.full_name || m.email || 'Member').split(' ')[0] }))].map(f => (
                    <button key={f.id} onClick={() => setAssigneeFilter(f.id)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={{ background: assigneeFilter === f.id ? ACCENT : MUTEDBG, color: assigneeFilter === f.id ? '#fff' : MUTED }}>
                      {f.label}
                    </button>
                  ))}
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
                    <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => toggleList(list.id)}>
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
                        : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />}
                      <ClipboardList className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-semibold text-sm truncate" style={{ color: INK }}>{list.title}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs" style={{ color: MUTED }}>
                            {listItems.length === 0 ? t('todos.noItemsYet') : `${doneCount}/${listItems.length} ${t('todos.doneCount')}`}
                          </p>
                          {listItems.length > 0 && (
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: MUTEDBG }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${(doneCount / listItems.length) * 100}%`, background: '#4CAF50' }} />
                            </div>
                          )}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteItem(list.id); }} className="p-1 opacity-40 hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" style={{ color: MUTED }} />
                      </button>
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
                                {/* Multi-assignee avatars */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {(item.assigned_to_users ?? []).slice(0, 3).map(uid => {
                                    const m = familyMembers.find(fm => fm.user_id === uid);
                                    return (
                                      <span key={uid} className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                        style={{ background: ACCENT }} title={m?.full_name || 'Member'}>
                                        {(m?.full_name || '?').charAt(0).toUpperCase()}
                                      </span>
                                    );
                                  })}
                                  <button
                                    onClick={() => setAssigningItemId(isAssigning ? null : item.id)}
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                    style={{ background: (item.assigned_to_users?.length ?? 0) > 0 ? 'transparent' : MUTEDBG, color: MUTED, border: `1px dashed ${MUTED}` }}
                                    title="Assign">
                                    +
                                  </button>
                                </div>
                                <button onClick={() => deleteItem(item.id)} className="p-1 opacity-40 hover:opacity-100 transition-opacity">
                                  <Trash2 className="w-3 h-3" style={{ color: MUTED }} />
                                </button>
                              </div>
                              {isAssigning && (
                                <div className="ml-12 mb-2 px-4 flex flex-wrap gap-1.5">
                                  {[{ user_id: user?.id ?? '', full_name: 'Me', id: 'self', email: null, role: 'parent' }, ...familyMembers].map(m => {
                                    const isSelected = (item.assigned_to_users ?? []).includes(m.user_id);
                                    return (
                                      <button key={m.user_id} onClick={() => toggleAssignUser(item.id, m.user_id)}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                                        style={{ background: isSelected ? ACCENT : MUTEDBG, color: isSelected ? '#fff' : INK }}>
                                        {isSelected && <span>✓</span>}
                                        {m.full_name || m.email || 'Member'}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {addingToListId === list.id ? (
                          <div className="flex gap-2 px-4 py-2.5" style={{ borderTop: `1px solid ${BORDER}` }}>
                            <input
                              autoFocus
                              placeholder={t('todos.itemNamePlaceholder')}
                              value={newListItemTitle}
                              onChange={e => setNewListItemTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') addToList(list.id);
                                if (e.key === 'Escape') { setAddingToListId(null); setNewListItemTitle(''); }
                              }}
                              className="flex-1 h-9 rounded-lg px-3 text-sm outline-none"
                              style={{ background: MUTEDBG, border: `1px solid ${BORDER}`, color: INK }}
                            />
                            <Button size="sm" onClick={() => addToList(list.id)}>{t('todos.add')}</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setAddingToListId(null); setNewListItemTitle(''); }}>
                              {t('todos.cancel')}
                            </Button>
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
              className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 transition-colors"
              style={{ background: newShoppingItem.trim() ? ACCENT : '#F1EDE7' }}>
              <Plus className="w-3.5 h-3.5" style={{ color: newShoppingItem.trim() ? '#fff' : MUTED }} />
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
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#44664F' }}>Probably Running Low</p>
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {filteredPredictions.map(p => (
                  <div key={p.itemName} className="flex items-center gap-1 text-xs font-medium rounded-full" style={{ background: '#C8DDD0', color: '#2D4F38' }}>
                    <button onClick={() => setNewShoppingItem(p.itemName)} className="pl-2.5 pr-1 py-1">
                      + {p.itemName}
                    </button>
                    <button
                      onClick={() => dismissPrediction(p.itemName)}
                      className="flex items-center justify-center w-5 h-5 mr-1 rounded-full hover:bg-black/10 transition-colors flex-shrink-0"
                      title="Remove suggestion"
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
                  <div key={item.id} className="flex items-center gap-2.5 px-3 py-2.5"
                    style={{ background: CARD, borderBottom: idx < catItems.length - 1 ? '1px solid #F1EDE7' : 'none' }}>
                    <button onClick={() => toggleItem(item.id)}
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 appearance-none p-0"
                      style={{ border: `1.5px solid ${BORDER}`, background: 'transparent' }}>
                    </button>
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
                      <span className="flex-1 text-sm cursor-text" style={{ color: INK }} onClick={() => startEditing(item)}>{item.title}</span>
                    )}
                    <div className="flex items-center rounded-full flex-shrink-0" style={{ background: MUTEDBG, padding: '1px 6px', gap: '4px' }}>
                      <button onClick={() => updateQty(item.id, -1)}
                        style={{ color: MUTED, fontSize: '14px', lineHeight: 1, width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span className="text-xs font-semibold" style={{ color: INK, minWidth: '14px', textAlign: 'center' }}>{getQty(item.id)}</span>
                      <button onClick={() => updateQty(item.id, 1)}
                        style={{ color: MUTED, fontSize: '14px', lineHeight: 1, width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                    <button onClick={() => deleteItem(item.id)} className="opacity-40 hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: MUTED }} />
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
                  <div key={item.id} className="flex items-center gap-2.5 px-3 py-2.5"
                    style={{ background: CARD, borderBottom: idx < shoppingCompleted.length - 1 ? '1px solid #F1EDE7' : 'none' }}>
                    <button onClick={() => toggleItem(item.id)}
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 appearance-none p-0"
                      style={{ background: ACCENT, border: `2px solid ${ACCENT}` }}>
                      <span className="text-white" style={{ fontSize: '9px', lineHeight: 1 }}>✓</span>
                    </button>
                    <span className="flex-1 text-sm line-through" style={{ color: MUTED }}>{item.title}</span>
                    <button onClick={() => deleteItem(item.id)} className="opacity-40 hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: '#DAC1BB' }} />
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
                  <Label className="text-sm font-medium">Visible to</Label>
                  <div className="flex gap-2">
                    {(['family', 'parents'] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setNewListVisibleTo(v)}
                        className="flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                        style={{
                          background: newListVisibleTo === v ? ACCENT : MUTEDBG,
                          color: newListVisibleTo === v ? '#fff' : MUTED,
                          borderColor: newListVisibleTo === v ? ACCENT : 'transparent',
                        }}
                      >
                        {v === 'family' ? 'Everyone' : 'Parents only'}
                      </button>
                    ))}
                  </div>
                </div>
                {familyMembers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Assign to</Label>
                    <div className="flex flex-wrap gap-2">
                      {[{ user_id: user?.id ?? '', full_name: 'Me' }, ...familyMembers].map(m => {
                        const uid = m.user_id;
                        const name = (m.full_name || 'Member').split(' ')[0];
                        const selected = newAssignees.includes(uid);
                        return (
                          <button
                            key={uid}
                            type="button"
                            onClick={() => setNewAssignees(prev => selected ? prev.filter(id => id !== uid) : [...prev, uid])}
                            className="px-3 py-1 rounded-full text-sm font-medium border transition-colors"
                            style={{
                              background: selected ? ACCENT : MUTEDBG,
                              color: selected ? '#fff' : MUTED,
                              borderColor: selected ? ACCENT : 'transparent',
                            }}
                          >
                            {name}
                          </button>
                        );
                      })}
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
