import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageCircle, Plus, ShoppingCart, Search, Filter, Lock, Gift, Send, ArrowLeft, Share2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { error as logError } from "@/lib/logger";

interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  member_count: number | null;
  category: string | null;
  is_public: boolean | null;
  created_by: string;
}

const Community = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isPremium } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('groups');
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>('all');
  const [groups, setGroups] = useState<Group[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showGroupDetailDialog, setShowGroupDetailDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupDetailTab, setGroupDetailTab] = useState("chat");
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedMarketItem, setSelectedMarketItem] = useState<any | null>(null);

  // Marketplace state
  const [marketItems, setMarketItems] = useState<any[]>([]);
  const [showListingForm, setShowListingForm] = useState(false);
  const [listingTitle, setListingTitle] = useState("");
  const [listingDesc, setListingDesc] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [listingCategory, setListingCategory] = useState("toys");
  const [listingCondition, setListingCondition] = useState("good");
  const [isGiveaway, setIsGiveaway] = useState(true);

  useEffect(() => {
    loadGroups();
    loadMarketItems();
  }, [user?.id]);

  // Handle group invite links: /app/community?join=GROUP_ID
  useEffect(() => {
    const joinGroupId = searchParams.get('join');
    if (!joinGroupId || !user?.id) return;
    const autoJoin = async () => {
      if (joinedGroupIds.has(joinGroupId)) return;
      await handleJoinGroup(joinGroupId);
      // Open the group detail after joining
      const { data: group } = await supabase.from('groups').select('*').eq('id', joinGroupId).single();
      if (group) handleViewGroup(group);
    };
    // Wait for groups to load first
    if (!loadingGroups) autoJoin();
  }, [searchParams, user?.id, loadingGroups]);

  const loadGroups = async () => {
    try {
      const { data: allGroups } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      setGroups(allGroups || []);

      if (user?.id) {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        setJoinedGroupIds(new Set(memberships?.map(m => m.group_id) || []));
      }
    } catch (error) {
      logError('Error loading groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadMarketItems = async () => {
    try {
      const { data } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      setMarketItems(data || []);
    } catch (error) {
      logError('Error loading marketplace items:', error);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: user.id });

      if (error) throw error;
      setJoinedGroupIds(prev => new Set([...prev, groupId]));
      toast({ title: "Joined!", description: "You've joined the group." });
    } catch (error) {
      logError('Error joining group:', error);
      toast({ title: "Error", description: "Could not join group.", variant: "destructive" });
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;
      setJoinedGroupIds(prev => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
      toast({ title: "Left group", description: "You've left the group." });
    } catch (error) {
      logError('Error leaving group:', error);
    }
  };

  const handleViewGroup = (group: Group) => {
    setSelectedGroup(group);
    setGroupDetailTab("chat");
    setGroupMessages([]);
    setGroupMembers([]);
    setShowGroupDetailDialog(true);
    loadGroupMessages(group.id);
    loadGroupMembers(group.id);
  };

  const loadGroupMessages = async (groupId: string) => {
    try {
      const { data: msgs, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      if (!msgs || msgs.length === 0) {
        setGroupMessages([]);
        return;
      }

      // Two-query approach: profiles table has no direct FK from group_messages
      const userIds = [...new Set(msgs.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setGroupMessages(msgs.map(msg => ({
        ...msg,
        profiles: profileMap.get(msg.user_id) || null,
      })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      logError('Error loading group messages:', error);
    }
  };

  const loadGroupMembers = async (groupId: string) => {
    try {
      const { data: members, error } = await supabase
        .from('group_members')
        .select('user_id, joined_at')
        .eq('group_id', groupId)
        .limit(50);

      if (error) throw error;
      if (!members || members.length === 0) {
        setGroupMembers([]);
        return;
      }

      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setGroupMembers(members.map(member => ({
        ...member,
        profiles: profileMap.get(member.user_id) || null,
      })));
    } catch (error) {
      logError('Error loading group members:', error);
    }
  };

  const handleShareGroup = async (group: Group) => {
    const url = `${window.location.origin}/app/community?join=${group.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: group.name, text: `Join "${group.name}" on Eazy.Family!`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Invite link copied!", description: "Share it with others to invite them to the group." });
      }
    } catch {
      // User cancelled share
    }
  };

  const handleSendMessage = async () => {
    if (!user?.id || !selectedGroup || !newMessage.trim()) return;
    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({ group_id: selectedGroup.id, user_id: user.id, content: newMessage.trim() });
      if (error) throw error;
      setNewMessage("");
      loadGroupMessages(selectedGroup.id);
    } catch (error) {
      logError('Error sending message:', error);
      toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateGroup = () => {
    // Creating custom groups requires premium
    if (!isPremium) {
      setShowUpgradeDialog(true);
      return;
    }
    
    setShowCreateGroupDialog(true);
  };

  const handleCreateGroupSubmit = async () => {
    if (!user?.id || !newGroupName.trim()) return;

    try {
      const { error } = await supabase
        .from('groups')
        .insert({
          name: newGroupName,
          description: newGroupDesc,
          category: 'custom',
          created_by: user.id,
          is_public: true,
        });

      if (error) throw error;
      
      setShowCreateGroupDialog(false);
      setNewGroupName("");
      setNewGroupDesc("");
      loadGroups();
      toast({ title: "Group Created!", description: `"${newGroupName}" is now ready for members.` });
    } catch (error) {
      logError('Error creating group:', error);
      toast({ title: "Error", description: "Could not create group.", variant: "destructive" });
    }
  };

  const handleCreateListing = async () => {
    if (!user?.id || !listingTitle.trim()) return;

    // If selling (not giveaway), require premium
    if (!isGiveaway && !isPremium) {
      toast({ title: "Premium Required", description: "Selling items requires the Family Plan.", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from('marketplace_items')
        .insert({
          title: listingTitle,
          description: listingDesc,
          price: isGiveaway ? 0 : parseFloat(listingPrice) || 0,
          category: listingCategory,
          condition: listingCondition,
          user_id: user.id,
          status: 'active',
        });

      if (error) throw error;
      setShowListingForm(false);
      setListingTitle("");
      setListingDesc("");
      setListingPrice("");
      loadMarketItems();
      toast({ title: "Listed!", description: isGiveaway ? "Your giveaway item is now listed." : "Your item is now for sale." });
    } catch (error) {
      logError('Error creating listing:', error);
      toast({ title: "Error", description: "Could not create listing.", variant: "destructive" });
    }
  };

  const filteredItems = marketItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === 'all' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold">{t('community.hub')}</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">{t('community.hubDesc')}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-1 sm:gap-0 h-auto">
          <TabsTrigger value="groups" className="text-xs sm:text-sm">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Groups</span>
            <span className="sm:hidden">G</span>
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="text-xs sm:text-sm">
            <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Marketplace</span>
            <span className="sm:hidden">M</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="text-xs sm:text-sm">
            <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Messages</span>
            <span className="sm:hidden">Msg</span>
          </TabsTrigger>
        </TabsList>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-muted-foreground">Join or create community groups</p>
            {isPremium ? (
              <Button size="sm" className="gradient-primary text-white border-0 w-full sm:w-auto" onClick={handleCreateGroup}>
                <Plus className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Create Group</span>
                <span className="sm:hidden">New Group</span>
              </Button>
            ) : (
              <UpgradeDialog>
                <Button size="sm" className="gradient-primary text-white border-0 w-full sm:w-auto">
                  <Lock className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Create Group</span>
                  <span className="sm:hidden">New Group</span>
                </Button>
              </UpgradeDialog>
            )}
          </div>

          <div className="space-y-3">
            {groups.length > 0 ? (
              groups.map((group) => (
                <Card key={group.id} className={`shadow-custom-md transition-shadow ${joinedGroupIds.has(group.id) ? 'cursor-pointer hover:shadow-lg' : ''}`} onClick={() => joinedGroupIds.has(group.id) && handleViewGroup(group)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{group.name}</h4>
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {group.member_count || 0} members
                          </Badge>
                          {group.category && (
                            <Badge variant="outline" className="text-xs">{group.category}</Badge>
                          )}
                        </div>
                      </div>
                      {joinedGroupIds.has(group.id) ? (
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleLeaveGroup(group.id); }}>
                          Leave
                        </Button>
                      ) : (
                        <Button size="sm" className="gradient-primary text-white border-0" onClick={(e) => { e.stopPropagation(); handleJoinGroup(group.id); }}>
                          Join
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="shadow-custom-md">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No groups available yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Be the first to create a group in your community
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-muted-foreground">Give away or sell family items</p>
            <Button size="sm" className="gradient-primary text-white border-0 w-full sm:w-auto" onClick={() => setShowListingForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">List Item</span>
              <span className="sm:hidden">New Item</span>
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-10">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="toys">Toys</SelectItem>
                <SelectItem value="baby-gear">Baby Gear</SelectItem>
                <SelectItem value="books">Books</SelectItem>
                <SelectItem value="clothing">Clothing</SelectItem>
                <SelectItem value="outdoor">Outdoor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <Card key={item.id} className="shadow-custom-md flex flex-col cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedMarketItem(item)}>
                  <CardContent className="p-4 flex flex-col flex-1">
                    <div className="w-full h-40 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mb-3">
                      <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-2 flex flex-col">
                      <h4 className="font-semibold text-sm line-clamp-2">{item.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{item.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.condition && (
                          <Badge variant="secondary" className="text-xs">{item.condition}</Badge>
                        )}
                        {item.category && (
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        )}
                      </div>
                      <div className="text-lg font-bold text-primary mt-auto pt-2">
                        {item.price === 0 || !item.price ? (
                          <span className="flex items-center gap-1">
                            <Gift className="w-4 h-4" /> Free
                          </span>
                        ) : (
                          `CHF ${item.price}`
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="shadow-custom-md col-span-full">
                <CardContent className="p-6 sm:p-8 text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No items listed yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    List family items to give away for free, or sell them with a Family Plan
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4 mt-6">
          <Card className="shadow-custom-md">
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">Group Messaging</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Join a group above to message within it. Free for all users!
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Listing Form Dialog */}
      <Dialog open={showListingForm} onOpenChange={setShowListingForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 w-[95%] sm:w-full">
          <DialogHeader>
            <DialogTitle>List an Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={listingTitle} onChange={(e) => setListingTitle(e.target.value)} placeholder="Item name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={listingDesc} onChange={(e) => setListingDesc(e.target.value)} placeholder="Describe your item" />
            </div>

            {/* Giveaway vs Sale toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isGiveaway ? "default" : "outline"}
                className={isGiveaway ? "flex-1 gradient-primary text-white border-0" : "flex-1"}
                onClick={() => setIsGiveaway(true)}
              >
                <Gift className="w-4 h-4 mr-1" /> Free Giveaway
              </Button>
              {isPremium ? (
                <Button
                  type="button"
                  variant={!isGiveaway ? "default" : "outline"}
                  className={!isGiveaway ? "flex-1 gradient-primary text-white border-0" : "flex-1"}
                  onClick={() => setIsGiveaway(false)}
                >
                  <ShoppingCart className="w-4 h-4 mr-1" /> Sell
                </Button>
              ) : (
                <UpgradeDialog>
                  <Button type="button" variant="outline" className="flex-1">
                    <Lock className="w-4 h-4 mr-1" /> Sell (Premium)
                  </Button>
                </UpgradeDialog>
              )}
            </div>

            {!isGiveaway && (
              <div className="space-y-2">
                <Label>Price (CHF)</Label>
                <Input type="number" value={listingPrice} onChange={(e) => setListingPrice(e.target.value)} placeholder="0.00" />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={listingCategory} onValueChange={setListingCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toys">Toys</SelectItem>
                    <SelectItem value="baby-gear">Baby Gear</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={listingCondition} onValueChange={setListingCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="like-new">Like New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowListingForm(false)}>Cancel</Button>
            <Button onClick={handleCreateListing} disabled={!listingTitle.trim()}>
              {isGiveaway ? "List for Free" : "List for Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Zurich Parents"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="What's this group about?"
                maxLength={200}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGroupDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateGroupSubmit} disabled={!newGroupName.trim()} className="gradient-primary text-white border-0">
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog for Group Creation */}
      {showUpgradeDialog && (
        <UpgradeDialog onClose={() => setShowUpgradeDialog(false)}>
          <div />
        </UpgradeDialog>
      )}

      {/* Marketplace Item Detail Dialog */}
      <Dialog open={!!selectedMarketItem} onOpenChange={(open) => !open && setSelectedMarketItem(null)}>
        <DialogContent className="max-w-md p-4 sm:p-6 w-[95%] sm:w-full">
          <DialogHeader>
            <DialogTitle>{selectedMarketItem?.title}</DialogTitle>
          </DialogHeader>
          {selectedMarketItem && (
            <div className="space-y-4">
              <div className="w-full h-48 rounded-lg bg-muted flex items-center justify-center">
                <ShoppingCart className="w-12 h-12 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{selectedMarketItem.description || "No description provided."}</p>
              <div className="flex gap-2 flex-wrap">
                {selectedMarketItem.condition && <Badge variant="secondary">{selectedMarketItem.condition}</Badge>}
                {selectedMarketItem.category && <Badge variant="outline">{selectedMarketItem.category}</Badge>}
              </div>
              <div className="text-2xl font-bold text-primary">
                {selectedMarketItem.price === 0 || !selectedMarketItem.price ? (
                  <span className="flex items-center gap-2"><Gift className="w-5 h-5" /> Free Giveaway</span>
                ) : (
                  `CHF ${selectedMarketItem.price}`
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedMarketItem(null)}>Close</Button>
            <Button
              className="gradient-primary text-white border-0"
              onClick={() => {
                toast({ title: "Interest noted!", description: "The seller will be notified. Direct messaging coming soon." });
                setSelectedMarketItem(null);
              }}
            >
              I'm Interested
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Detail Dialog - Full Experience */}
      <Dialog open={showGroupDetailDialog} onOpenChange={setShowGroupDetailDialog}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
          {/* Group Header */}
          <div className="flex items-center gap-3 p-4 border-b flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setShowGroupDetailDialog(false)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-base truncate">{selectedGroup?.name}</h2>
              {selectedGroup?.description && (
                <p className="text-xs text-muted-foreground truncate">{selectedGroup.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="secondary" className="text-xs">
                {groupMembers.length || selectedGroup?.member_count || 0} members
              </Badge>
              {selectedGroup && (
                <Button variant="ghost" size="icon" onClick={() => handleShareGroup(selectedGroup)} aria-label="Invite to group">
                  <Share2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={groupDetailTab} onValueChange={setGroupDetailTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-2 mx-4 mt-3 flex-shrink-0">
              <TabsTrigger value="chat" className="text-sm">
                <MessageCircle className="w-4 h-4 mr-1" /> Chat
              </TabsTrigger>
              <TabsTrigger value="members" className="text-sm">
                <Users className="w-4 h-4 mr-1" /> Members
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0 px-0">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {groupMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  groupMessages.map((msg) => {
                    const isOwn = msg.user_id === user?.id;
                    const displayName = (msg.profiles as any)?.full_name || "Member";
                    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isOwn && (
                          <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                            <AvatarFallback className="text-xs bg-primary/10">{initials}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          {!isOwn && (
                            <span className="text-xs text-muted-foreground px-1">{displayName}</span>
                          )}
                          <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                            {msg.content}
                          </div>
                          <span className="text-xs text-muted-foreground px-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="flex gap-2 p-4 border-t flex-shrink-0">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  maxLength={2000}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  size="icon"
                  className="gradient-primary text-white border-0 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="flex-1 overflow-y-auto p-4 mt-0">
              {groupMembers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading members...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groupMembers.map((member) => {
                    const name = (member.profiles as any)?.full_name || "Member";
                    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                    const isYou = member.user_id === user?.id;
                    return (
                      <div key={member.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{name}{isYou ? ' (you)' : ''}</p>
                          {member.joined_at && (
                            <p className="text-xs text-muted-foreground">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Community;
