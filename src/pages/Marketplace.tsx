import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Plus, Search, Filter, Heart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MarketItem {
  id: string;
  title: string;
  description: string;
  price: string;
  condition: 'new' | 'like-new' | 'good' | 'fair';
  category: string;
  ageRange?: string;
  seller: {
    initials: string;
    name: string;
    location: string;
  };
  images: string[];
  postedAt: string;
  isFavorited?: boolean;
}

const mockItems: MarketItem[] = [
  {
    id: '1',
    title: 'LEGO Classic Building Set',
    description: 'Complete set with all pieces. Great condition, barely used. Perfect for ages 4-8.',
    price: 'CHF 45',
    condition: 'like-new',
    category: 'toys',
    ageRange: '4-8 years',
    seller: {
      initials: 'MK',
      name: 'Maria K.',
      location: 'Zurich Center'
    },
    images: ['bg-gradient-to-br from-red-400 to-red-600'],
    postedAt: '2h ago',
    isFavorited: true
  },
  {
    id: '2',
    title: 'Baby Stroller - Premium Brand',
    description: 'High-quality stroller in excellent condition. Suitable from birth to 3 years.',
    price: 'CHF 150',
    condition: 'good',
    category: 'baby-gear',
    ageRange: '0-3 years',
    seller: {
      initials: 'JS',
      name: 'John S.',
      location: 'Seefeld'
    },
    images: ['bg-gradient-to-br from-blue-400 to-blue-600'],
    postedAt: '5h ago'
  },
  {
    id: '3',
    title: 'Children\'s Books Collection',
    description: 'Set of 20 picture books for toddlers. Stories in English and German.',
    price: 'CHF 25',
    condition: 'good',
    category: 'books',
    ageRange: '2-5 years',
    seller: {
      initials: 'AL',
      name: 'Anna L.',
      location: 'Oerlikon'
    },
    images: ['bg-gradient-to-br from-green-400 to-green-600'],
    postedAt: '1d ago'
  },
  {
    id: '4',
    title: 'Kids Bicycle with Training Wheels',
    description: 'Perfect first bike for learning to ride. Adjustable seat height.',
    price: 'CHF 80',
    condition: 'good',
    category: 'outdoor',
    ageRange: '3-6 years',
    seller: {
      initials: 'TH',
      name: 'Thomas H.',
      location: 'Altstetten'
    },
    images: ['bg-gradient-to-br from-purple-400 to-purple-600'],
    postedAt: '2d ago'
  }
];

const Marketplace = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>('all');

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
      case 'fair': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">{t('marketplace.title')}</h1>
        </div>
        <Button size="sm" className="gradient-primary text-white border-0">
          <Plus className="w-4 h-4 mr-1" />
          {t('marketplace.sellItem')}
        </Button>
      </div>

      {/* Subscription Notice */}
      <Card className="shadow-custom-md border-l-4 border-l-warning">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-sm">{t('marketplace.marketplaceAccess')}</h3>
              <p className="text-xs text-muted-foreground">
                {t('marketplace.upgradeDesc')}
              </p>
            </div>
            <Button variant="outline" size="sm">
              {t('marketplace.upgrade')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">{t('marketplace.browse')}</TabsTrigger>
          <TabsTrigger value="favorites">{t('marketplace.favorites')}</TabsTrigger>
          <TabsTrigger value="selling">{t('marketplace.myItems')}</TabsTrigger>
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-4 mt-6">
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

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
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
                <SelectItem value="electronics">{t('marketplace.categories.electronics')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items Grid */}
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="shadow-custom-md">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Item Image */}
                    <div className={`w-20 h-20 rounded-lg ${item.images[0]} flex-shrink-0`} />
                    
                    {/* Item Details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-sm leading-tight">{item.title}</h4>
                        <Button variant="ghost" size="sm" className="p-1">
                          <Heart className={`w-4 h-4 ${item.isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                        </Button>
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getConditionColor(item.condition)}`}>
                          {t(`marketplace.condition.${item.condition}`)}
                        </Badge>
                        {item.ageRange && (
                          <Badge variant="outline" className="text-xs">
                            {item.ageRange}
                          </Badge>
                        )}
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
                          <span>•</span>
                          <Clock className="w-3 h-3" />
                          <span>{item.postedAt}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites" className="space-y-4 mt-6">
          <Card className="shadow-custom-md">
            <CardContent className="p-8 text-center">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">{t('marketplace.yourFavorites')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('marketplace.favoritesDesc')}
              </p>
              <Button variant="outline" onClick={() => setActiveTab('browse')}>
                {t('marketplace.browseItems')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Items Tab */}
        <TabsContent value="selling" className="space-y-4 mt-6">
          <Card className="shadow-custom-md">
            <CardContent className="p-8 text-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">{t('marketplace.startSelling')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('marketplace.startSellingDesc')}
              </p>
              <Badge variant="secondary" className="text-xs mb-4">
                {t('marketplace.familyPlanFeature')}
              </Badge>
              <br />
              <Button className="gradient-primary text-white border-0">
                <Plus className="w-4 h-4 mr-2" />
                {t('marketplace.listFirstItem')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Categories */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('marketplace.popularCategories')}</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="text-sm">{t('marketplace.categories.toys')}</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="text-sm">{t('marketplace.categories.babyGear')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;