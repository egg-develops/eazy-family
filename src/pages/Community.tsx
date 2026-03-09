import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Users, MessageCircle, Plus, Heart, Share2, MapPin, Clock, ShoppingCart, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useGroups } from "@/hooks/useGroups";
import { useMarketplaceItems } from "@/hooks/useMarketplaceItems";

// Interfaces and mock data
interface Post {
  id: string;
  author: {
    initials: string;
    name: string;
  };
  group: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  location?: string;
}

const mockPosts: Post[] = [];

const Community = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isPremium } = useAuth();
  const { groups, createGroup } = useGroups();
  const { items, createItem } = useMarketplaceItems();
  
  const [activeTab, setActiveTab] = useState('messages');
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>('all');
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isMarketplaceDialogOpen, setIsMarketplaceDialogOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', category: 'general', is_public: false });
  const [marketplaceForm, setMarketplaceForm] = useState({ title: '', description: '', price: '', condition: 'good', category: 'other' });

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = category === 'all' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  const handleCreateGroup = async () => {
    if (!groupForm.name.trim()) {
      toast({ title: "Error", description: "Group name is required", variant: "destructive" });
      return;
    }
    try {
      await createGroup({
        name: groupForm.name,
        description: groupForm.description,
        category: groupForm.category,
        is_public: groupForm.is_public
      });
      toast({ title: "Success", description: "Group created successfully!" });
      setIsGroupDialogOpen(false);
      setGroupForm({ name: '', description: '', category: 'general', is_public: false });
    } catch (error) {
      console.error('Error creating group:', error);
      toast({ title: "Error", description: "Failed to create group", variant: "destructive" });
    }
  };

  const handleCreateMarketplaceItem = async () => {
    if (!marketplaceForm.title.trim()) {
      toast({ title: "Error", description: "Item title is required", variant: "destructive" });
      return;
    }
    try {
      await createItem({
        title: marketplaceForm.title,
        description: marketplaceForm.description,
        price: marketplaceForm.price,
        condition: marketplaceForm.condition as 'new' | 'like-new' | 'good' | 'fair',
        category: marketplaceForm.category
      });
      toast({ title: "Success", description: "Item listed successfully!" });
      setIsMarketplaceDialogOpen(false);
      setMarketplaceForm({ title: '', description: '', price: '', condition: 'good', category: 'other' });
    } catch (error) {
      console.error('Error creating marketplace item:', error);
      toast({ title: "Error", description: "Failed to list item", variant: "destructive" });
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'bg-green-100 text-green-700';
      case 'like-new': return 'bg-blue-100 text-blue-700';
      case 'good': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const PremiumGate = ({ children, fallbackAction }: { children: React.ReactNode; fallbackAction?: string }) => {
    if (isPremium) {
      return <>{children}</>;
    }
    return (
      <UpgradeDialog>
        {children}
      </UpgradeDialog>
    );
  };

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
          <TabsTrigger value="messages">
            <MessageCircle className="w-4 h-4 mr-2" />
            {t('community.messages')}
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Users className="w-4 h-4 mr-2" />
            {t('community.groups')}
          </TabsTrigger>
          <TabsTrigger value="marketplace">
            <ShoppingCart className="w-4 h-4 mr-2" />
            {t('community.marketplace')}
          </TabsTrigger>
        </TabsList>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t('community.marketplaceDesc')}</p>
            <PremiumGate>
              <Button size="sm" className="gradient-primary text-white border-0" onClick={isPremium ? () => setIsMarketplaceDialogOpen(true) : undefined}>
                <Plus className="w-4 h-4 mr-1" />
                {t('community.sellItem')}
              </Button>
            </PremiumGate>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('marketplace.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="flex-1">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('marketplace.categories.all')}</SelectItem>
                  <SelectItem value="toys">{t('marketplace.categories.toys')}</SelectItem>
                  <SelectItem value="baby-gear">{t('marketplace.categories.babyGear')}</SelectItem>
                  <SelectItem value="books">{t('marketplace.categories.books')}</SelectItem>
                  <SelectItem value="clothing">{t('marketplace.categories.clothing')}</SelectItem>
                  <SelectItem value="outdoor">{t('marketplace.categories.outdoor')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select defaultValue="any">
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t('community.anyCondition')}</SelectItem>
                  <SelectItem value="new">{t('marketplace.condition.new')}</SelectItem>
                  <SelectItem value="like-new">{t('marketplace.condition.likeNew')}</SelectItem>
                  <SelectItem value="good">{t('marketplace.condition.good')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items Grid */}
          <div className="space-y-4">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <Card key={item.id} className="shadow-custom-md">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className={`w-20 h-20 rounded-lg bg-gradient-to-br from-blue-200 to-purple-200 flex-shrink-0`} />
                      
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-sm leading-tight">{item.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>

                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getConditionColor(item.condition)}`}>
                            {t(`marketplace.condition.${item.condition}`)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold text-primary">{item.price}</div>
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
                  <h3 className="font-medium mb-2">No items for sale yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Be the first to list family items in your community
                  </p>
                  <PremiumGate>
                    <Button className="gradient-primary text-white border-0" onClick={isPremium ? () => setIsMarketplaceDialogOpen(true) : undefined}>
                      <Plus className="w-4 h-4 mr-1" />
                      List Your First Item
                    </Button>
                  </PremiumGate>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t('community.groupsDesc')}</p>
            <PremiumGate>
              <Button size="sm" className="gradient-primary text-white border-0" onClick={isPremium ? () => setIsGroupDialogOpen(true) : undefined}>
                <Plus className="w-4 h-4 mr-1" />
                {t('community.createGroup')}
              </Button>
            </PremiumGate>
          </div>

          {/* Groups List */}
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
                            {group.member_count} {t('community.members')}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">{t('community.view')}</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="shadow-custom-md">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No groups yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a group to connect with other families
                  </p>
                  <PremiumGate>
                    <Button className="gradient-primary text-white border-0" onClick={isPremium ? () => setIsGroupDialogOpen(true) : undefined}>
                      <Plus className="w-4 h-4 mr-1" />
                      Create Your First Group
                    </Button>
                  </PremiumGate>
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
              <h3 className="font-medium mb-2">{t('community.inAppMessaging')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('community.messagingDesc')}
              </p>
              {isPremium ? (
                <Button className="gradient-primary text-white border-0" onClick={() => toast({ title: "Coming soon", description: "Messaging is coming soon!" })}>
                  Start Messaging
                </Button>
              ) : (
                <UpgradeDialog>
                  <Button className="gradient-primary text-white border-0">
                    Upgrade to Family Plan
                  </Button>
                </UpgradeDialog>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Group Dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create a New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="e.g., Parents of Zurich"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Input
                id="group-description"
                placeholder="What's this group about?"
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-category">Category</Label>
              <Select value={groupForm.category} onValueChange={(value) => setGroupForm({ ...groupForm, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="activities">Activities</SelectItem>
                  <SelectItem value="parenting">Parenting</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="gradient-primary text-white border-0" onClick={handleCreateGroup}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Marketplace Item Dialog */}
      <Dialog open={isMarketplaceDialogOpen} onOpenChange={setIsMarketplaceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>List an Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-title">Item Title</Label>
              <Input
                id="item-title"
                placeholder="e.g., Child's Bicycle"
                value={marketplaceForm.title}
                onChange={(e) => setMarketplaceForm({ ...marketplaceForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-description">Description</Label>
              <Input
                id="item-description"
                placeholder="Describe the item..."
                value={marketplaceForm.description}
                onChange={(e) => setMarketplaceForm({ ...marketplaceForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price">Price (CHF)</Label>
              <Input
                id="item-price"
                placeholder="e.g., 50"
                value={marketplaceForm.price}
                onChange={(e) => setMarketplaceForm({ ...marketplaceForm, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-condition">Condition</Label>
              <Select value={marketplaceForm.condition} onValueChange={(value) => setMarketplaceForm({ ...marketplaceForm, condition: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="like-new">Like New</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-category">Category</Label>
              <Select value={marketplaceForm.category} onValueChange={(value) => setMarketplaceForm({ ...marketplaceForm, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toys">Toys</SelectItem>
                  <SelectItem value="baby-gear">Baby Gear</SelectItem>
                  <SelectItem value="books">Books</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMarketplaceDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="gradient-primary text-white border-0" onClick={handleCreateMarketplaceItem}>
              List Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Community;
