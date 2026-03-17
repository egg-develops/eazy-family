import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageCircle, Plus, ShoppingCart, Search, Filter, Lock, Gift } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState('groups');
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>('all');
  const [groups, setGroups] = useState<Group[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());
  const [loadingGroups, setLoadingGroups] = useState(true);

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

  const handleCreateGroup = async () => {
    toast({ title: "Create Group", description: "Group creation form coming soon!" });
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
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">{t('community.hub')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t('community.hubDesc')}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="groups">
            <Users className="w-4 h-4 mr-2" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="marketplace">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageCircle className="w-4 h-4 mr-2" />
            Messages
          </TabsTrigger>
        </TabsList>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Join or create community groups</p>
            {isPremium ? (
              <Button size="sm" className="gradient-primary text-white border-0" onClick={handleCreateGroup}>
                <Plus className="w-4 h-4 mr-1" />
                Create Group
              </Button>
            ) : (
              <UpgradeDialog>
                <Button size="sm" className="gradient-primary text-white border-0">
                  <Lock className="w-4 h-4 mr-1" />
                  Create Group
                </Button>
              </UpgradeDialog>
            )}
          </div>

          <div className="space-y-3">
            {groups.length > 0 ? (
              groups.map((group) => (
                <Card key={group.id} className="shadow-custom-md">
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
                        <Button variant="outline" size="sm" onClick={() => handleLeaveGroup(group.id)}>
                          Leave
                        </Button>
                      ) : (
                        <Button size="sm" className="gradient-primary text-white border-0" onClick={() => handleJoinGroup(group.id)}>
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Give away or sell family items</p>
            <Button size="sm" className="gradient-primary text-white border-0" onClick={() => setShowListingForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              List Item
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
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
          <div className="space-y-4">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <Card key={item.id} className="shadow-custom-md">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-sm">{item.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                        <div className="flex items-center gap-2">
                          {item.condition && (
                            <Badge variant="secondary" className="text-xs">{item.condition}</Badge>
                          )}
                          {item.category && (
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          )}
                        </div>
                        <div className="text-lg font-bold text-primary">
                          {item.price === 0 || !item.price ? (
                            <span className="flex items-center gap-1">
                              <Gift className="w-4 h-4" /> Free
                            </span>
                          ) : (
                            `CHF ${item.price}`
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="shadow-custom-md">
                <CardContent className="p-8 text-center">
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
        <DialogContent>
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

            <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
};

export default Community;
