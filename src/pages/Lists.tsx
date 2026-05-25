import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  CheckSquare, ShoppingCart, Users, Plus, Check, Trash2,
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
import { VoiceShoppingAssistant } from "@/components/VoiceShoppingAssistant";

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

  // ── Shopping state ────────────────────────────────────────────────────────────
  const [newShoppingItem, setNewShoppingItem] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { predictions } = useShoppingPredictions();

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
    }]);
    if (error) { toast({ title: 'Could not add', variant: 'destructive' }); return; }
    setNewTitle(''); setNewDueDate(''); setIsAddOpen(false);
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
  const getListItems = (listId: string) => items.filter(i => i.parent_id === listId);

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
            {tab === 'tasks' ? <CheckSquare className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
            {tab === 'tasks' ? t('nav.todos', 'Tasks') : t('nav.shopping', 'Shopping')}
          </button>
        ))}
      </div>

      {/* ── Scope toggle: Personal | Shared ── */}
      <div className="flex w-fit mx-auto gap-0.5 p-0.5 rounded-full" style={{ background: MUTEDBG, border: `1px solid ${BORDER}` }}>
        {(['personal', 'shared'] as const).map(s => (
          <button key={s} onClick={() => setScope(s)}
            className="px-5 py-1.5 rounded-full text-xs font-semibold transition-all"
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
          {/* Voice + Add button row */}
          <div className="flex items-center gap-2">
            <VoiceShoppingAssistant
              onItemsAdded={handleVoiceItemsAdded}
              mode="task"
              listenerDescription={t('todos.speakTasks', 'Speak your tasks')}
            />
            <button
              onClick={() => setIsAddOpen(true)}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold"
              style={{ background: ACCENT, color: '#fff' }}
            >
              <Plus className="w-3.5 h-3.5" />
              {scope === 'shared' ? t('todos.newList', 'New List') : t('todos.newTask', 'New Task')}
            </button>
          </div>

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
                                <span className="text-sm" style={{
                                  color: task.completed ? MUTED : INK,
                                  textDecoration: task.completed ? 'line-through' : 'none',
                                }}>
                                  {task.title}
                                </span>
                                {task.due_date && (() => {
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
                                <span className="flex-1 text-sm" style={{
                                  color: item.completed ? MUTED : INK,
                                  textDecoration: item.completed ? 'line-through' : 'none',
                                }}>
                                  {item.title}
                                </span>
                                <button
                                  onClick={() => setAssigningItemId(isAssigning ? null : item.id)}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                  style={{ background: assignee ? ACCENT : MUTEDBG, color: assignee ? '#fff' : MUTED }}
                                  title={assignee ? `Assigned to ${assignee.full_name || 'member'}` : 'Assign'}
                                >
                                  {assignee ? (assignee.full_name?.charAt(0).toUpperCase() ?? '?') : '+'}
                                </button>
                                <button onClick={() => deleteItem(item.id)} className="p-1 opacity-40 hover:opacity-100 transition-opacity">
                                  <Trash2 className="w-3 h-3" style={{ color: MUTED }} />
                                </button>
                              </div>
                              {isAssigning && (
                                <div className="ml-12 mb-2 px-4 flex flex-wrap gap-1.5">
                                  {item.assigned_to && (
                                    <button onClick={() => assignTask(item.id, null)}
                                      className="px-2.5 py-1 rounded-full text-xs font-medium"
                                      style={{ background: MUTEDBG, color: MUTED }}>
                                      Unassign
                                    </button>
                                  )}
                                  {familyMembers.map(m => (
                                    <button key={m.id} onClick={() => assignTask(item.id, m.user_id)}
                                      className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                                      style={{
                                        background: item.assigned_to === m.user_id ? ACCENT : MUTEDBG,
                                        color: item.assigned_to === m.user_id ? '#fff' : INK,
                                      }}>
                                      {m.full_name || m.email || 'Member'}
                                    </button>
                                  ))}
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
            <VoiceShoppingAssistant
              onItemsAdded={handleVoiceItemsAdded}
              mode="shopping"
              listenerDescription={t('todos.speakShoppingItems', 'Speak your shopping items')}
            />
          </div>

          {/* Predictions */}
          {predictions.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#EEF4F0', border: '1px solid #C8DDD0' }}>
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid #C8DDD0' }}>
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#44664F' }} />
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#44664F' }}>Probably Running Low</p>
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {predictions.map(p => (
                  <button key={p.itemName} onClick={() => setNewShoppingItem(p.itemName)}
                    className="text-xs font-medium px-2.5 py-1 rounded-full transition-colors"
                    style={{ background: '#C8DDD0', color: '#2D4F38' }}>
                    + {p.itemName}
                  </button>
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
                    <span className="flex-1 text-sm" style={{ color: INK }}>{item.title}</span>
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
      <Dialog open={isAddOpen} onOpenChange={open => { setIsAddOpen(open); if (!open) { setNewTitle(''); setNewDueDate(''); } }}>
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
