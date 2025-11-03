import { useState, useEffect } from "react";
import { CheckSquare, ShoppingCart, Users, Filter, Plus, Check, UserPlus, Mail, Phone, Send } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { triggerGamification } from "@/components/GamificationToast";
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
}

interface FamilyMember {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
}

const ToDoList = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
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

  const currentUserId = localStorage.getItem('eazy-family-user-id') || crypto.randomUUID();

  useEffect(() => {
    localStorage.setItem('eazy-family-user-id', currentUserId);
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
        title: "Error loading tasks",
        description: "Could not load your tasks. Please try again.",
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
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', currentUserId)
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
    if (filterView === "all") return true;
    if (filterView === "completed") return task.completed;
    if (filterView === "pending") return !task.completed;
    if (filterView === "overdue") {
      return task.due_date && new Date(task.due_date) < new Date() && !task.completed;
    }
    return true;
  });

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
      const insertPromises = items.map(item => 
        supabase
          .from('tasks')
          .insert([{
            title: item,
            type: 'shopping',
            due_date: null,
            shared_with: null,
          } as any])
      );

      const results = await Promise.all(insertPromises);
      
      const hasErrors = results.some(result => result.error);
      if (hasErrors) {
        throw new Error("Some items failed to add");
      }

      toast({
        title: "Items Added",
        description: `${items.length} item(s) added to your shopping list.`,
      });
    } catch (error) {
      console.error('Error adding voice items:', error);
      toast({
        title: "Error",
        description: "Could not add all items. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    if (activeTab === "shared" && selectedMembers.length === 0) {
      toast({
        title: "No members selected",
        description: "Please select at least one family member to share with.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .insert([{
          title: newTaskTitle,
          type: activeTab,
          due_date: newTaskDueDate || null,
          shared_with: activeTab === "shared" ? selectedMembers : null,
        } as any]);

      if (error) throw error;

      setNewTaskTitle("");
      setNewTaskDueDate(undefined);
      setSelectedMembers([]);
      setIsDialogOpen(false);
      
      toast({
        title: activeTab === "shopping" ? "Item Added" : activeTab === "shared" ? "List Created" : "Task Added",
        description: `"${newTaskTitle}" has been ${activeTab === "shared" ? "shared with " + selectedMembers.length + " member(s)" : "added to your list"}.`,
      });
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: "Error",
        description: "Could not add task. Please try again.",
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

      // Trigger celebration when marking as complete (not when uncompleting)
      if (!wasCompleted) {
        triggerGamification({
          type: activeTab === 'task' ? 'list_created' : activeTab === 'shopping' ? 'photo_shared' : 'event_added',
          title: '✨ Task Complete!',
          points: 10
        });
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      toast({
        title: "Error",
        description: "Could not update task. Please try again.",
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
        title: "Task deleted",
        description: "The task has been removed.",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Could not delete task. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <CheckSquare className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">To-Do Lists</h1>
        </div>
        <p className="text-muted-foreground">Organize your family tasks and shopping lists</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="task" className="gap-2">
            <CheckSquare className="w-4 h-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="shopping" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Shopping
          </TabsTrigger>
          <TabsTrigger value="shared" className="gap-2">
            <Users className="w-4 h-4" />
            Shared
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {/* Stats Cards */}
          {activeTab === "shared" ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="shadow-custom-md">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">{sharedStats.sharedLists}</div>
                  <div className="text-sm text-muted-foreground">Shared Lists</div>
                </CardContent>
              </Card>
              <Card className="shadow-custom-md">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{sharedStats.collaborators}</div>
                  <div className="text-sm text-muted-foreground">Members</div>
                </CardContent>
              </Card>
              <Card className="shadow-custom-md">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{sharedStats.completedShared}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
              <Card className="shadow-custom-md">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600">{sharedStats.active}</div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="shadow-custom-md">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">
                    {activeTab === "shopping" ? "Total Items" : "Total Tasks"}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-custom-md">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
              {activeTab !== "shopping" && (
                <Card className="shadow-custom-md">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-orange-600">{stats.overdue}</div>
                    <div className="text-sm text-muted-foreground">Overdue</div>
                  </CardContent>
                </Card>
              )}
              <Card className="shadow-custom-md">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add New Task/Item and Voice Assistant */}
          <div className="space-y-4">
            <ParticleButton 
              className="w-full gradient-primary text-white border-0"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {activeTab === "shopping" ? "New Item" : activeTab === "shared" ? "New List" : "New Task"}
            </ParticleButton>
            
            {activeTab === "shopping" && (
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Voice Assistant</p>
                  <p className="text-xs text-muted-foreground">Tap the mic and say your shopping items</p>
                </div>
                <VoiceShoppingAssistant onItemsAdded={handleVoiceItemsAdded} />
              </div>
            )}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterView} onValueChange={setFilterView}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tasks List */}
          <Card className="shadow-custom-md min-h-[300px]">
            <CardContent className="p-6">
              {activeTab === "shared" && filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <UserPlus className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No shared lists</h3>
                  <p className="text-muted-foreground mb-4">Create a shared list to invite members.</p>
                  <Button onClick={() => setIsDialogOpen(true)} className="gradient-primary text-white border-0">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Shared List
                  </Button>
                </div>
              ) : filteredTasks.length > 0 ? (
                <div className="space-y-3">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => toggleTask(task.id)}
                      />
                      <div className="flex-1">
                        <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                          {task.title}
                        </span>
                        {task.due_date && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(task.due_date) < new Date() && !task.completed ? (
                              <span className="text-destructive font-medium">Overdue: {format(new Date(task.due_date), "MMM d, yyyy")}</span>
                            ) : (
                              <span>Due: {format(new Date(task.due_date), "MMM d, yyyy")}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTask(task.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ParticleButton onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {activeTab === "shopping" ? "Add a New Item" : "Add a New Task"}
                  </ParticleButton>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Task/Item Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeTab === "shopping" ? "Add New Item" : activeTab === "shared" ? "Create Shared List" : "Add New Task"}
            </DialogTitle>
            {activeTab === "shared" && (
              <DialogDescription>
                Create a shared list to invite members.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">
                {activeTab === "shopping" ? "Item Name" : activeTab === "shared" ? "List Name" : "Task Title"}
              </Label>
              <Input
                id="task-title"
                placeholder={
                  activeTab === "shopping" 
                    ? "Enter item name..." 
                    : activeTab === "shared"
                    ? "Enter list name..."
                    : "Enter task description..."
                }
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && activeTab !== "shared" && !newTaskDueDate && handleAddTask()}
              />
            </div>
            {activeTab === "task" && (
              <div className="space-y-2">
                <Label htmlFor="task-due-date">Due Date (Optional)</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={newTaskDueDate || ""}
                  onChange={(e) => setNewTaskDueDate(e.target.value || undefined)}
                />
              </div>
            )}
            {activeTab === "shared" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Select Family Members</Label>
                  <Badge variant="secondary">{selectedMembers.length} selected</Badge>
                </div>
                {loadingMembers ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Loading family members...
                  </div>
                ) : familyMembers.length === 0 ? (
                  <InlineFamilyInvite onMemberAdded={loadFamilyMembers} />
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2">
                    {familyMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleMemberSelection(member.id)}
                      >
                        <Checkbox
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={() => toggleMemberSelection(member.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{member.full_name || "No name"}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.email || member.phone || "No contact"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">{member.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false);
              setSelectedMembers([]);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddTask} 
              disabled={!newTaskTitle.trim() || (activeTab === "shared" && selectedMembers.length === 0)}
            >
              {activeTab === "shopping" ? "Add Item" : activeTab === "shared" ? "Create List" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Inline Family Invite Component
const InlineFamilyInvite = ({ onMemberAdded }: { onMemberAdded: () => void }) => {
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
    if (!user || !familyId) return;

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
        title: "Invitation sent",
        description: `Invitation sent to ${validatedData.email || validatedData.phone}`,
      });

      setInviteEmail("");
      setInvitePhone("");
      onMemberAdded();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send invitation",
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
        <p className="text-sm font-medium">Invite a family member</p>
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
                Email
              </div>
            </SelectItem>
            <SelectItem value="phone">
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3" />
                Phone
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
            <SelectItem value="parent">Parent</SelectItem>
            <SelectItem value="child">Child</SelectItem>
            <SelectItem value="grandparent">Grandparent</SelectItem>
            <SelectItem value="caretaker">Caretaker</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          onClick={handleInvite} 
          disabled={sending}
          size="sm"
          className="w-full gradient-primary text-white border-0"
        >
          <Send className="h-3 w-3 mr-2" />
          {sending ? "Sending..." : "Send Invitation"}
        </Button>
      </div>
    </div>
  );
};

export default ToDoList;
