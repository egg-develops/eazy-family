import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { CheckSquare, ShoppingCart, ClipboardList, Users, Filter, Plus, Check, UserPlus, Mail, Phone, Send, Search, ChevronDown, ChevronRight, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ParticleButton } from "@/components/ui/particle-button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptic";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { VoiceShoppingAssistant } from "@/components/VoiceShoppingAssistant";

interface Task {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  type: "task" | "shopping" | "shared";
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  shared_with?: string[] | null;
  parent_id?: string | null;
}

interface FamilyMember {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
}

const ToDoList = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<"task" | "shopping" | "shared">("task");
  const [filterView, setFilterView] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState<string | undefined>(undefined);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [newListItemTitle, setNewListItemTitle] = useState("");
  const [timeTab, setTimeTab] = useState<'today'|'upcoming'|'complete'>('today');
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('eazy-task-custom-categories') || '[]'); } catch { return []; }
  });
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('eazy-task-category-overrides') || '{}'); } catch { return {}; }
  });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewCategoryField, setShowNewCategoryField] = useState(false);

  const currentUserId = user?.id || '';

  useEffect(() => {
    if (currentUserId) localStorage.setItem('eazy-family-user-id', currentUserId);
  }, [currentUserId]);

  // Load tasks from Supabase
  useEffect(() => {
    loadTasks();
  }, []);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks((data || []) as Task[]);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: t('todos.errorLoading'),
        description: t('todos.errorLoadingDesc'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "shared" && isDialogOpen) {
      loadFamilyMembers();
    }
  }, [activeTab, isDialogOpen]);

  const loadFamilyMembers = async () => {
    if (!user) return;
    setLoadingMembers(true);
    try {
      const { data: mine } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!mine?.family_id) { setFamilyMembers([]); return; }

      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', mine.family_id)
        .eq('is_active', true);

      if (error) throw error;
      setFamilyMembers(data || []);
    } catch (error) {
      console.error('Error loading family members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const filteredTasks = tasks.filter(task => {
    if (task.type !== activeTab) return false;
    // For shared tab, only show top-level list headers (no parent_id)
    if (activeTab === "shared" && task.parent_id) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterView === "all") return true;
    if (filterView === "completed") return task.completed;
    if (filterView === "pending") return !task.completed;
    if (filterView === "overdue") {
      return task.due_date && new Date(task.due_date) < new Date() && !task.completed;
    }
    return true;
  });

  // Items within a shared list
  const getListItems = (listId: string) =>
    tasks.filter(t => t.parent_id === listId);

  const toggleListExpand = (listId: string) => {
    setExpandedLists(prev => {
      const next = new Set(prev);
      next.has(listId) ? next.delete(listId) : next.add(listId);
      return next;
    });
  };

  const handleAddListItem = async (listId: string) => {
    if (!newListItemTitle.trim() || !user?.id) return;
    try {
      await supabase.from('tasks').insert([{
        title: newListItemTitle.trim(),
        type: 'shared',
        user_id: user.id,
        parent_id: listId,
        completed: false,
      }]);
      setNewListItemTitle("");
      setAddingToListId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const getButtonText = () => {
    if (activeTab === "shopping") {
      return isMobile ? "+ New Item" : "New Item";
    }
    return isMobile ? "+ New Task" : "New Task";
  };

  const getAddText = () => {
    if (activeTab === "shopping") return "Add Item";
    if (activeTab === "shared") return "Add List";
    return "Add New Task";
  };

  const stats = {
    total: tasks.filter(t => t.type === activeTab).length,
    completed: tasks.filter(t => t.type === activeTab && t.completed).length,
    overdue: tasks.filter(t => t.type === activeTab && t.due_date && new Date(t.due_date) < new Date() && !t.completed).length,
    pending: tasks.filter(t => t.type === activeTab && !t.completed).length,
  };
  
  const sharedStats = {
    sharedLists: 0,
    collaborators: 0,
    completedShared: tasks.filter(t => t.type === "shared" && t.completed).length,
    active: tasks.filter(t => t.type === "shared" && !t.completed).length,
  };

  const handleVoiceItemsAdded = async (items: string[]) => {
    try {
      if (activeTab === "shared") {
        if (expandedLists.size !== 1) {
          toast({
            title: "Expand a list first",
            description: "Please expand exactly one shared list before using voice.",
            variant: "destructive",
          });
          return;
        }
        const targetListId = [...expandedLists][0];
        const targetList = tasks.find(task => task.id === targetListId);
        const insertPromises = items.map(item =>
          supabase.from('tasks').insert([{
            title: item,
            type: 'shared',
            user_id: user?.id || '',
            parent_id: targetListId,
            completed: false,
          }])
        );
        const results = await Promise.all(insertPromises);
        if (results.some(r => r.error)) throw new Error("Some items failed to add");
        toast({
          title: t('todos.itemsAdded'),
          description: `${items.length} ${t('todos.itemsAddedDesc')} "${targetList?.title ?? 'list'}".`,
        });
        return;
      }

      const insertPromises = items.map(item =>
        supabase.from('tasks').insert([{
          title: item,
          type: activeTab,
          user_id: user?.id || '',
          due_date: null,
          shared_with: null,
        }])
      );
      const results = await Promise.all(insertPromises);
      if (results.some(r => r.error)) throw new Error("Some items failed to add");
      toast({
        title: activeTab === "task" ? t('todos.tasksAdded') : t('todos.itemsAdded'),
        description: `${items.length} ${activeTab === "task" ? t('todos.tasksAddedSimple') : t('todos.itemsAddedSimple')}`,
      });
    } catch (error) {
      console.error('Error adding voice items:', error);
      toast({
        title: t('common.error'),
        description: t('todos.errorLoadingDesc'),
        variant: "destructive",
      });
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    if (!user?.id) {
      toast({
        title: t('todos.notAuthenticated'),
        description: t('todos.signInToCreate'),
        variant: "destructive",
      });
      return;
    }
    
    try {
      const taskData = {
        title: newTaskTitle.trim(),
        type: activeTab,
        user_id: user.id,
        due_date: newTaskDueDate || null,
        shared_with: activeTab === "shared" ? selectedMembers : null,
      };

      const { data: insertedTask, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (insertedTask && selectedCategory) {
        saveCategoryOverride(insertedTask.id, selectedCategory);
      }

      setNewTaskTitle("");
      setNewTaskDueDate(undefined);
      setSelectedMembers([]);
      setSelectedCategory('');
      setIsDialogOpen(false);
      
      toast({
        title: activeTab === "shopping" ? t('todos.itemAdded') : activeTab === "shared" ? t('todos.listCreated') : t('todos.taskAdded'),
        description: `"${newTaskTitle}" has been ${activeTab === "shared" ? `${t('todos.sharedWith')} ${selectedMembers.length} member(s)` : t('todos.addedToList')}.`,
      });
    } catch (error) {
      console.error('Error adding task:', error);
      const errorMsg = (error as any)?.message || t('todos.errorLoadingDesc');
      toast({
        title: t('common.error'),
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const wasCompleted = task.completed;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', id);

      if (error) throw error;

      if (!wasCompleted) {
        haptic('success');
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      toast({
        title: t('common.error'),
        description: t('todos.errorUpdating'),
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('todos.taskDeleted'),
        description: t('todos.taskDeletedDesc'),
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: t('common.error'),
        description: t('todos.errorDeleting'),
        variant: "destructive",
      });
    }
  };

  // Time-based filter for "Today" tab
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const tasksByTime = (view: string) => tasks.filter(t => {
    if (t.type !== 'task' || !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      if (t.type !== 'task') return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (view === 'today') {
        if (t.completed) return false;
        if (!t.due_date) return true; // no due date = treat as today
        const d = new Date(t.due_date); d.setHours(0,0,0,0);
        return d <= tomorrow;
      }
      if (view === 'upcoming') {
        if (t.completed) return false;
        if (!t.due_date) return false;
        const d = new Date(t.due_date); d.setHours(0,0,0,0);
        return d >= tomorrow;
      }
      if (view === 'complete') return t.completed;
    }
    return false;
  });

  const guessCategory = (title: string): string => {
    const lower = title.toLowerCase();
    if (/school|homework|lesson|class|pick up|drop off|practice|leo|mia|kid|child|son|daughter/.test(lower)) return 'Kids';
    if (/budget|bill|review|admin|account|insurance|tax|bank|report/.test(lower)) return 'Admin';
    if (/clean|laundry|water|plant|groceries|cook|kitchen|garden|fix|repair|furnace|filter/.test(lower)) return 'Home';
    return 'Personal';
  };

  const allCategories = ['Personal', 'Kids', 'Admin', 'Home', ...customCategories];

  const addCustomCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || allCategories.includes(trimmed)) return;
    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    localStorage.setItem('eazy-task-custom-categories', JSON.stringify(updated));
    setSelectedCategory(trimmed);
    setNewCategoryInput('');
    setShowNewCategoryField(false);
  };

  const saveCategoryOverride = (taskId: string, cat: string) => {
    if (!cat) return;
    const updated = { ...categoryOverrides, [taskId]: cat };
    setCategoryOverrides(updated);
    localStorage.setItem('eazy-task-category-overrides', JSON.stringify(updated));
  };

  const groupByCategory = (taskList: Task[]) => {
    const groups: Record<string, Task[]> = {};
    taskList.forEach(t => {
      const cat = categoryOverrides[t.id] || guessCategory(t.title);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  };

  return (
    <div className="space-y-4 pb-4">

      {/* Time tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: '#F1EDE7' }}>
        {(['today','upcoming','complete'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setTimeTab(tab)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all"
            style={{
              background: timeTab === tab ? '#964735' : 'transparent',
              color: timeTab === tab ? '#FFFFFF' : '#7A6660',
            }}
          >
            {tab === 'today' ? t('todos.today') : tab === 'upcoming' ? t('todos.upcoming') : t('todos.complete')}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#B5A09A' }} />
        <input
          placeholder={t('todos.searchPlaceholder')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none"
          style={{ background: '#F1EDE7', border: '1px solid #DAC1BB', color: '#1C1C18' }}
        />
      </div>

      {/* Voice mic + shared lists toggle row */}
      <div className="flex items-center justify-between">
        {activeTab !== 'shared' && (
          <VoiceShoppingAssistant
            onItemsAdded={handleVoiceItemsAdded}
            mode={activeTab === 'shopping' ? 'shopping' : 'task'}
            listenerDescription={activeTab === 'shopping' ? t('todos.speakShoppingItems', 'Speak your shopping items') : t('todos.speakTasks', 'Speak your tasks')}
          />
        )}
        <button
          onClick={() => setActiveTab(activeTab === 'shared' ? 'task' : 'shared')}
          className="flex items-center gap-2 text-sm font-medium ml-auto"
          style={{ color: activeTab === 'shared' ? '#964735' : '#7A6660' }}
        >
          <Users className="w-4 h-4" />
          {activeTab === 'shared' ? t('todos.backToMyTasks') : t('todos.viewSharedLists')}
        </button>
      </div>

      {/* Shared Lists */}
          {activeTab === "shared" ? (
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <Card className="shadow-custom-md">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{t('todos.noSharedLists')}</h3>
                    <p className="text-muted-foreground mb-4 text-sm">{t('todos.noSharedListsDesc')}</p>
                    <Button onClick={() => setIsDialogOpen(true)} className="gradient-primary text-white border-0">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('todos.createSharedList')}
                    </Button>
                  </CardContent>
                </Card>
              ) : filteredTasks.map(list => {
                const items = getListItems(list.id);
                const isExpanded = expandedLists.has(list.id);
                const doneCount = items.filter(i => i.completed).length;
                return (
                  <Card key={list.id} className="shadow-custom-md overflow-hidden">
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleListExpand(list.id)}
                    >
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                      <ClipboardList className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-semibold text-sm truncate">{list.title}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {items.length === 0 ? t('todos.noItemsYet') : `${doneCount}/${items.length} ${t('todos.doneCount')}`}
                            {list.shared_with && list.shared_with.length > 0 && ` · ${list.shared_with.length} member(s)`}
                          </p>
                          {items.length > 0 && (
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${(doneCount / items.length) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteTask(list.id); }}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 flex-shrink-0"
                        aria-label={t('todos.deleteList')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t bg-muted/20">
                        {items.length > 0 && (
                          <div className="p-3 space-y-1">
                            {items.map(item => (
                              <div key={item.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                                <Checkbox
                                  checked={item.completed}
                                  onCheckedChange={() => toggleTask(item.id)}
                                />
                                <span className={`flex-1 text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                                  {item.title}
                                </span>
                                <button
                                  onClick={() => deleteTask(item.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {addingToListId === list.id ? (
                          <div className="flex gap-2 p-3 pt-1">
                            <Input
                              autoFocus
                              placeholder={t('todos.itemNamePlaceholder')}
                              value={newListItemTitle}
                              onChange={e => setNewListItemTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") handleAddListItem(list.id);
                                if (e.key === "Escape") { setAddingToListId(null); setNewListItemTitle(""); }
                              }}
                              className="h-9 text-sm"
                            />
                            <Button size="sm" onClick={() => handleAddListItem(list.id)}>{t('todos.add')}</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setAddingToListId(null); setNewListItemTitle(""); }}>{t('todos.cancel')}</Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingToListId(list.id); setExpandedLists(prev => new Set([...prev, list.id])); }}
                            className="flex items-center gap-2 w-full p-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            {t('todos.addItem')}
                          </button>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="min-h-[200px]">
                {(() => {
                  const listed = tasksByTime(timeTab);
                  if (listed.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: '#F1EDE7' }}>
                          <CheckSquare className="w-7 h-7" style={{ color: '#B5A09A' }} />
                        </div>
                        <p className="font-semibold" style={{ color: '#1C1C18' }}>
                          {timeTab === 'complete' ? t('todos.noCompletedYet') : t('todos.allClear')}
                        </p>
                        <p className="text-sm mt-1" style={{ color: '#7A6660' }}>
                          {timeTab === 'complete' ? t('todos.completeToSeeHere') : t('todos.upcomingWillAppear')}
                        </p>
                      </div>
                    );
                  }
                  const groups = groupByCategory(listed);
                  return (
                    <div className="space-y-5">
                      {Object.entries(groups).map(([cat, catTasks]) => (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#7A6660' }}>{cat}</h3>
                            <span className="text-xs" style={{ color: '#B5A09A' }}>{catTasks.length} {catTasks.length !== 1 ? t('todos.tasksPlural') : t('todos.tasks')}</span>
                          </div>
                          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #EBE8E2' }}>
                            {catTasks.map((task, i) => {
                              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed;
                              return (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-3 px-4 py-3 transition-colors"
                                  style={{
                                    background: '#FFFFFF',
                                    borderTop: i > 0 ? '1px solid #F1EDE7' : 'none',
                                  }}
                                >
                                  <button
                                    onClick={() => toggleTask(task.id)}
                                    className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all appearance-none p-0"
                                    style={{
                                      border: task.completed ? 'none' : '1.5px solid #DAC1BB',
                                      background: task.completed ? '#964735' : 'transparent',
                                    }}
                                  >
                                    {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm" style={{
                                      color: task.completed ? '#B5A09A' : '#1C1C18',
                                      textDecoration: task.completed ? 'line-through' : 'none',
                                    }}>
                                      {task.title}
                                    </span>
                                    {task.due_date && (
                                      <div className="text-xs mt-0.5" style={{ color: isOverdue ? '#BA1A1A' : '#7A6660' }}>
                                        {isOverdue ? `${t('todos.urgent')} · ` : ''}{format(new Date(task.due_date), "EEE, h:mm a")}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => deleteTask(task.id)}
                                    className="opacity-40 hover:opacity-100 transition-opacity p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" style={{ color: '#7A6660' }} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
            </div>
          )}

      {/* Add Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95%] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {activeTab === "shopping" ? t('todos.addNewItemTitle') : activeTab === "shared" ? t('todos.createSharedListTitle') : t('todos.addNewTask')}
            </DialogTitle>
            {activeTab === "shared" && (
              <DialogDescription>
                {t('todos.createSharedListDesc')}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-3 sm:py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title" className="text-xs sm:text-sm font-medium">
                {activeTab === "shopping" ? t('todos.itemNameLabel') : activeTab === "shared" ? t('todos.listNameLabel') : t('todos.taskTitleLabel')}
              </Label>
              <Input
                id="task-title"
                placeholder={
                  activeTab === "shopping"
                    ? t('todos.enterItemName')
                    : activeTab === "shared"
                    ? t('todos.enterListName')
                    : t('todos.enterTaskDesc')
                }
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && activeTab !== "shared" && !newTaskDueDate && handleAddTask()}
                className="w-full h-10 sm:h-11 text-xs sm:text-sm min-h-[44px]"
              />
            </div>
            {activeTab === "task" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="task-due-date" className="text-xs sm:text-sm font-medium">{t('todos.dueDateOptional')}</Label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={newTaskDueDate || ""}
                    onChange={(e) => setNewTaskDueDate(e.target.value || undefined)}
                    className="w-full h-10 sm:h-11 text-xs sm:text-sm min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">{t('todos.category')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {allCategories.map(cat => (
                      <button key={cat} type="button"
                        onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                        style={{ background: selectedCategory === cat ? '#964735' : '#F1EDE7', color: selectedCategory === cat ? '#fff' : '#7A6660', border: `1px solid ${selectedCategory === cat ? '#964735' : '#DAC1BB'}` }}>
                        {cat}
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => setShowNewCategoryField(p => !p)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: '#F1EDE7', color: '#7A6660', border: '1px dashed #DAC1BB' }}>
                      {t('todos.categoryNew')}
                    </button>
                  </div>
                  {showNewCategoryField && (
                    <div className="flex gap-2">
                      <Input
                        autoFocus
                        placeholder={t('todos.categoryNamePlaceholder')}
                        value={newCategoryInput}
                        onChange={e => setNewCategoryInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addCustomCategory(newCategoryInput); }}
                        className="h-9 text-sm flex-1"
                      />
                      <Button size="sm" onClick={() => addCustomCategory(newCategoryInput)}>{t('todos.add')}</Button>
                    </div>
                  )}
                </div>
              </>
            )}
            {activeTab === "shared" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm sm:text-base">{t('todos.selectMembers')}</Label>
                  <Badge variant="secondary" className="text-xs">{selectedMembers.length} {t('todos.selectedCount')}</Badge>
                </div>
                {loadingMembers ? (
                  <div className="text-center py-4 text-xs sm:text-sm text-muted-foreground">
                    {t('todos.loadingMembers')}
                  </div>
                ) : familyMembers.length === 0 ? (
                  <InlineFamilyInvite onMemberAdded={loadFamilyMembers} />
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto border rounded-lg p-2 sm:p-3">
                    {familyMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleMemberSelection(member.id)}
                      >
                        <Checkbox
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={() => toggleMemberSelection(member.id)}
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{member.full_name || "No name"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email || member.phone || "No contact"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">{member.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedMembers([]);
              }}
              className="h-10 sm:h-11 flex-1 sm:flex-none"
            >
              {t('todos.cancel')}
            </Button>
            <Button
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim()}
              className="h-10 sm:h-11 flex-1 sm:flex-none"
            >
              {activeTab === "shopping" ? t('todos.addItemBtn') : activeTab === "shared" ? t('todos.createListBtn') : t('todos.addTaskBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Inline Family Invite Component
const InlineFamilyInvite = ({ onMemberAdded }: { onMemberAdded: () => void }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [inviteMethod, setInviteMethod] = useState<"email" | "phone">("email");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<"parent" | "child" | "grandparent" | "caretaker" | "other">("parent");
  const [sending, setSending] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadFamilyId();
    }
  }, [user]);

  const loadFamilyId = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      setFamilyId(data?.family_id || null);
    } catch (error) {
      console.error("Error loading family ID:", error);
    }
  };

  const handleInvite = async () => {
    if (!user) return;
    if (!familyId) {
      toast({
        title: t('todos.noFamilyFound'),
        description: t('todos.noFamilyFoundDesc'),
        variant: "destructive",
      });
      return;
    }

    const inviteSchema = z.object({
      email: z.string().trim().email().optional(),
      phone: z.string().trim().regex(/^\+?[1-9]\d{1,14}$/u).optional(),
    }).refine((data) => data.email || data.phone);

    try {
      const validatedData = inviteSchema.parse({
        email: inviteMethod === "email" ? inviteEmail : undefined,
        phone: inviteMethod === "phone" ? invitePhone : undefined,
      });

      setSending(true);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from("family_invitations").insert([
        {
          family_id: familyId,
          inviter_id: user.id,
          invitee_email: validatedData.email || null,
          invitee_phone: validatedData.phone || null,
          role: inviteRole,
          expires_at: expiresAt.toISOString(),
          token: crypto.randomUUID(),
        },
      ]);

      if (error) throw error;

      toast({
        title: t('todos.invitationSent') || "Invitation sent",
        description: `Invitation sent to ${validatedData.email || validatedData.phone}`,
      });

      setInviteEmail("");
      setInvitePhone("");
      onMemberAdded();
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({
          title: t('todos.validationError'),
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('common.error'),
          description: error instanceof Error ? error.message : t('todos.failedToSendInvitation'),
          variant: "destructive",
        });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
      <div className="text-center mb-2">
        <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-medium">{t('todos.inviteFamilyMember')}</p>
      </div>

      <div className="space-y-3">
        <Select value={inviteMethod} onValueChange={(value: "email" | "phone") => setInviteMethod(value)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                {t('family.email')}
              </div>
            </SelectItem>
            <SelectItem value="phone">
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3" />
                {t('family.phone')}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {inviteMethod === "email" ? (
          <Input
            type="email"
            placeholder="family@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="h-9"
          />
        ) : (
          <Input
            type="tel"
            placeholder="+1 234 567 8900"
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
            className="h-9"
          />
        )}

        <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as "parent" | "child" | "grandparent" | "caretaker" | "other")}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="parent">{t('family.roles.parent')}</SelectItem>
            <SelectItem value="child">{t('family.roles.child')}</SelectItem>
            <SelectItem value="grandparent">{t('family.roles.grandparent')}</SelectItem>
            <SelectItem value="caretaker">{t('family.roles.caretaker')}</SelectItem>
            <SelectItem value="other">{t('family.roles.other')}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={handleInvite}
          disabled={sending}
          size="sm"
          className="w-full gradient-primary text-white border-0"
        >
          <Send className="h-3 w-3 mr-2" />
          {sending ? t('todos.sending') : t('todos.sendInvitation')}
        </Button>
      </div>
    </div>
  );
};

export default ToDoList;
