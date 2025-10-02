import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, MessageCircle, Plus, Heart, Share2, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  {
    id: '4',
    name: 'Outdoor Adventures',
    description: 'Family-friendly outdoor activities and hikes',
    memberCount: 156,
    category: 'activities',
    isJoined: true
  }
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
  {
    id: '2',
    author: { initials: 'JS', name: 'John S.' },
    group: "Mother's Corner",
    content: 'Looking for recommendations for indoor activities during this rainy weather. Any ideas for toddlers?',
    timestamp: '4h ago',
    likes: 8,
    comments: 15
  },
  {
    id: '3',
    author: { initials: 'AL', name: 'Anna L.' },
    group: 'Play Dates Zurich',
    content: 'Planning a picnic this Saturday at Lake Zurich. Who wants to join? Kids ages 4-7 welcome! 🌞',
    timestamp: '6h ago',
    likes: 23,
    comments: 12,
    location: 'Lake Zurich'
  }
];

const Community = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('feed');

  const joinedGroups = mockGroups.filter(group => group.isJoined);
  const suggestedGroups = mockGroups.filter(group => !group.isJoined);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">{t('community.title')}</h1>
        </div>
        <Button size="sm" className="gradient-primary text-white border-0">
          <Plus className="w-4 h-4 mr-1" />
          {t('community.createGroup')}
        </Button>
      </div>

      {/* Community Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center p-3 shadow-custom-md">
          <div className="text-xl font-bold text-primary">{joinedGroups.length}</div>
          <div className="text-xs text-muted-foreground">{t('community.groupsJoined')}</div>
        </Card>
        <Card className="text-center p-3 shadow-custom-md">
          <div className="text-xl font-bold text-accent">47</div>
          <div className="text-xs text-muted-foreground">{t('community.connections')}</div>
        </Card>
        <Card className="text-center p-3 shadow-custom-md">
          <div className="text-xl font-bold text-success">12</div>
          <div className="text-xs text-muted-foreground">{t('community.thisWeek')}</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="feed">{t('community.feed')}</TabsTrigger>
          <TabsTrigger value="groups">{t('community.groups')}</TabsTrigger>
          <TabsTrigger value="messages">{t('community.messages')}</TabsTrigger>
        </TabsList>

        {/* Feed Tab */}
        <TabsContent value="feed" className="space-y-4 mt-6">
          {/* Create Post */}
          <Card className="shadow-custom-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="gradient-primary text-white text-sm font-bold">
                    EF
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" className="flex-1 justify-start text-muted-foreground">
                  {t('community.shareSomething')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Posts Feed */}
          <div className="space-y-4">
            {mockPosts.map((post) => (
              <Card key={post.id} className="shadow-custom-md">
                <CardContent className="p-4 space-y-4">
                  {/* Post Header */}
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="gradient-cool text-white text-sm font-bold">
                        {post.author.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{post.author.name}</span>
                        <span className="text-muted-foreground text-xs">{t('community.postedIn')}</span>
                        <Badge variant="secondary" className="text-xs">
                          {post.group}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {post.timestamp}
                        {post.location && (
                          <>
                            <span>•</span>
                            <MapPin className="w-3 h-3" />
                            {post.location}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <p className="text-sm leading-relaxed">{post.content}</p>

                  {/* Post Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <Heart className="w-4 h-4 mr-1" />
                        {post.likes}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {post.comments}
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-6 mt-6">
          {/* My Groups */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('community.myGroups')}</h3>
            
            <div className="space-y-3">
              {joinedGroups.map((group) => (
                <Card key={group.id} className="shadow-custom-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{group.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {group.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {group.memberCount} {t('community.members')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {group.category}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        {t('community.view')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Suggested Groups */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('community.suggestedForYou')}</h3>
            
            <div className="space-y-3">
              {suggestedGroups.map((group) => (
                <Card key={group.id} className="shadow-custom-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{group.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {group.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {group.memberCount} {t('community.members')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {group.category}
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" className="gradient-primary text-white border-0">
                        {t('community.join')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
              <Badge variant="secondary" className="text-xs">
                {t('community.premiumFeature')}
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Community;