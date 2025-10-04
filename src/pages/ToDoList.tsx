import { useState, useEffect } from "react";
import { CheckSquare, ShoppingCart, Users, Filter, Plus, Check, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  type: "task" | "shopping" | "shared";
  dueDate?: Date;
  createdAt: Date;
}

const getInitialTasks = (): Task[] => {
  const saved = localStorage.getItem('eazy-family-todos');
  if (saved) {
    const parsed = JSON.parse(saved);
    return parsed.map((task: any) => ({
      ...task,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      createdAt: new Date(task.createdAt),
    }));
  }
  return [];
};

const ToDoList = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<Task[]>(getInitialTasks);
  const [activeTab, setActiveTab] = useState<"task" | "shopping" | "shared">("task");
  const [filterView, setFilterView] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    localStorage.setItem('eazy-family-todos', JSON.stringify(tasks));
  }, [tasks]);

  const filteredTasks = tasks.filter(task => {
    if (task.type !== activeTab) return false;
    if (filterView === "all") return true;
    if (filterView === "completed") return task.completed;
    if (filterView === "pending") return !task.completed;
    if (filterView === "overdue") {
      return task.dueDate && task.dueDate < new Date() && !task.completed;
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
    overdue: tasks.filter(t => t.type === activeTab && t.dueDate && t.dueDate < new Date() && !t.completed).length,
    pending: tasks.filter(t => t.type === activeTab && !t.completed).length,
  };
  
  const sharedStats = {
    sharedLists: 0,
    collaborators: 0,
    completedShared: tasks.filter(t => t.type === "shared" && t.completed).length,
    active: tasks.filter(t => t.type === "shared" && !t.completed).length,
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      completed: false,
      type: activeTab,
      dueDate: newTaskDueDate,
      createdAt: new Date(),
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle("");
    setNewTaskDueDate(undefined);
    setIsDialogOpen(false);
    
    toast({
      title: activeTab === "shopping" ? "Item Added" : "Task Added",
      description: `"${newTaskTitle}" has been added to your list.`,
    });
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
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
                  <div className="text-sm text-muted-foreground">Collaborators</div>
                </CardContent>
              </Card>
              <Card className="shadow-custom-md">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{sharedStats.completedShared}</div>
                  <div className="text-sm text-muted-foreground">todos.shared.completed</div>
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

          {/* Add New Task/Item */}
          {!isMobile && (
            <Card className="shadow-custom-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">{getAddText()}</span>
                  </div>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    {getButtonText()}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {isMobile && (
            <Button 
              className="w-full gradient-primary text-white border-0"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {activeTab === "shopping" ? "New Item" : "New Task"}
            </Button>
          )}

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
                  <p className="text-muted-foreground">Share tasks with family members to collaborate</p>
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
                        {task.dueDate && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {task.dueDate < new Date() && !task.completed ? (
                              <span className="text-destructive font-medium">Overdue: {format(task.dueDate, "MMM d, yyyy")}</span>
                            ) : (
                              <span>Due: {format(task.dueDate, "MMM d, yyyy")}</span>
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
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">
                    {activeTab === "shopping" ? "No items yet" : "No tasks yet"}
                  </h3>
                  <p className="text-muted-foreground">
                    {activeTab === "shopping" ? "Start by adding your first item" : "Start by adding your first task"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Task/Item Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeTab === "shopping" ? "Add New Item" : activeTab === "shared" ? "Add Shared List" : "Add New Task"}
            </DialogTitle>
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
                onKeyPress={(e) => e.key === "Enter" && !newTaskDueDate && handleAddTask()}
              />
            </div>
            {activeTab === "task" && (
              <div className="space-y-2">
                <Label htmlFor="task-due-date">Due Date (Optional)</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={newTaskDueDate ? format(newTaskDueDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setNewTaskDueDate(e.target.value ? new Date(e.target.value) : undefined)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
              {activeTab === "shopping" ? "Add Item" : activeTab === "shared" ? "Add List" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ToDoList;
