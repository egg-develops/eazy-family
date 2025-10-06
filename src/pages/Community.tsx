import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, MessageCircle, Plus, Heart, Share2, MapPin, Clock, ShoppingCart, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UpgradeDialog } from "@/components/UpgradeDialog";

// Interfaces and mock data
interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  category: string;
  isJoined: boolean;
}

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

interface MarketItem {
  id: string;
  title: string;
  description: string;
  price: string;
  condition: 'new' | 'like-new' | 'good' | 'fair';
  category: string;
  seller: {
    initials: string;
    name: string;
    location: string;
  };
  images: string[];
  postedAt: string;
}

const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Daddy Day',
    description: 'Dads sharing experiences and planning activities',
    memberCount: 124,
    category: 'parenting',
    isJoined: true
  },
  {
    id: '2',
    name: "Mother's Corner",
    description: 'A supportive space for moms to connect and share',
    memberCount: 89,
    category: 'parenting',
    isJoined: true
  },
  {
    id: '3',
    name: 'Play Dates Zurich',
    description: 'Organizing fun playdates for kids in Zurich area',
    memberCount: 67,
    category: 'playdates',
    isJoined: false
  },
];

const mockPosts: Post[] = [
  {
    id: '1',
    author: { initials: 'MK', name: 'Maria K.' },
    group: 'Daddy Day',
    content: 'Great playground at Seefeld Park! Kids loved the new equipment. Highly recommend for ages 3-8 🎪',
    timestamp: '2h ago',
    likes: 12,
    comments: 5,
    location: 'Seefeld Park'
  },
];

const mockItems: MarketItem[] = [
  {
    id: '1',
    title: 'LEGO Classic Building Set',
    description: 'Complete set with all pieces. Great condition, barely used.',
    price: 'CHF 45',
    condition: 'like-new',
    category: 'toys',
    seller: {
      initials: 'MK',
      name: 'Maria K.',
      location: 'Zurich Center'
    },
    images: ['bg-gradient-to-br from-red-400 to-red-600'],
    postedAt: '2h ago'
  },
];

const Community = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('messages');
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>('all');

  const joinedGroups = mockGroups.filter(group => group.isJoined);
  const filteredItems = mockItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === 'all' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'bg-green-100 text-green-700';
      case 'like-new': return 'bg-blue-100 text-blue-700';
      case 'good': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
            <Button size="sm" className="gradient-primary text-white border-0">
              <Plus className="w-4 h-4 mr-1" />
              {t('community.sellItem')}
            </Button>
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
            {filteredItems.map((item) => (
              <Card key={item.id} className="shadow-custom-md">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className={`w-20 h-20 rounded-lg ${item.images[0]} flex-shrink-0`} />
                    
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
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="gradient-cool text-white text-xs">
                              {item.seller.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span>{item.seller.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t('community.groupsDesc')}</p>
            <Button size="sm" className="gradient-primary text-white border-0">
              <Plus className="w-4 h-4 mr-1" />
              {t('community.createGroup')}
            </Button>
          </div>

          {/* My Groups */}
          <div className="space-y-3">
            {joinedGroups.map((group) => (
              <Card key={group.id} className="shadow-custom-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{group.name}</h4>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {group.memberCount} {t('community.members')}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">{t('community.view')}</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
              <UpgradeDialog>
                <Button className="gradient-primary text-white border-0">
                  Upgrade to Family Plan
                </Button>
              </UpgradeDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Community;
