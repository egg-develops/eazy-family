import { useState } from "react";
import { Camera, Upload, Search, Filter, MapPin, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Photo {
  id: string;
  src: string;
  title: string;
  date: string;
  location?: string;
  tags: string[];
  aiEnhanced?: boolean;
}

const mockPhotos: Photo[] = [
  {
    id: '1',
    src: 'bg-gradient-to-br from-yellow-400 to-orange-500',
    title: 'Family picnic at the park',
    date: '2024-01-15',
    location: 'Seefeld Park',
    tags: ['outdoor', 'family'],
    aiEnhanced: true
  },
  {
    id: '2',
    src: 'bg-gradient-to-br from-blue-400 to-purple-600',
    title: 'Birthday celebration',
    date: '2024-01-10',
    location: 'Home',
    tags: ['birthday', 'celebration'],
  },
  {
    id: '3',
    src: 'bg-gradient-to-br from-green-400 to-blue-500',
    title: 'Swimming lesson',
    date: '2024-01-08',
    location: 'Aquatic Center',
    tags: ['sport', 'learning'],
    aiEnhanced: true
  },
  {
    id: '4',
    src: 'bg-gradient-to-br from-pink-400 to-red-500',
    title: 'Art workshop',
    date: '2024-01-05',
    location: 'Community Center',
    tags: ['creative', 'workshop'],
  },
  {
    id: '5',
    src: 'bg-gradient-to-br from-purple-400 to-pink-500',
    title: 'Museum visit',
    date: '2024-01-03',
    location: 'Natural History Museum',
    tags: ['educational', 'museum'],
  },
  {
    id: '6',
    src: 'bg-gradient-to-br from-indigo-400 to-blue-600',
    title: 'Playground fun',
    date: '2024-01-01',
    location: 'Local Playground',
    tags: ['playground', 'fun'],
    aiEnhanced: true
  },
];

const Photos = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const filteredPhotos = mockPhotos.filter(photo => {
    const matchesSearch = photo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         photo.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filter === 'all' || photo.tags.includes(filter);
    return matchesSearch && matchesFilter;
  });

  const aiEnhancedCount = mockPhotos.filter(p => p.aiEnhanced).length;
  const storageUsed = Math.round(mockPhotos.length * 2.3); // Mock calculation

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Photos</h1>
        </div>
        <Badge variant="secondary" className="text-xs">
          {filteredPhotos.length} photos
        </Badge>
      </div>

      {/* AI Enhancement Status */}
      <Card className="shadow-custom-md gradient-primary text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-semibold">AI Enhanced</h3>
              </div>
              <p className="text-white/90 text-sm">
                {aiEnhancedCount} photos automatically organized
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{storageUsed} MB</div>
              <div className="text-white/80 text-xs">used of unlimited</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search photos, locations, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="flex-1">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Photos</SelectItem>
              <SelectItem value="family">Family</SelectItem>
              <SelectItem value="outdoor">Outdoor</SelectItem>
              <SelectItem value="educational">Educational</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
              <SelectItem value="sport">Sports</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 bg-muted rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-background shadow-sm' : ''}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              className={viewMode === 'map' ? 'bg-background shadow-sm' : ''}
            >
              Map
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Button */}
      <Button className="w-full gradient-primary text-white border-0 hover:opacity-90">
        <Upload className="w-4 h-4 mr-2" />
        Upload New Photos
      </Button>

      {/* AI Query Example */}
      <Card className="shadow-custom-md border-l-4 border-l-accent">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-accent mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">AI Search Example</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Try: "Show me photos from the park last month" or "Find all birthday photos"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photos Grid */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          {/* Recent Photos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recent</h3>
            
            <div className="grid grid-cols-3 gap-2">
              {filteredPhotos.slice(0, 6).map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden">
                  <div className={`w-full h-full ${photo.src}`} />
                  {photo.aiEnhanced && (
                    <div className="absolute top-1 right-1">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Photo Details */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Details</h3>
            
            {filteredPhotos.slice(0, 3).map((photo) => (
              <Card key={photo.id} className="shadow-custom-md">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className={`w-16 h-16 rounded-lg ${photo.src} flex-shrink-0`}>
                      {photo.aiEnhanced && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold text-sm">{photo.title}</h4>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(photo.date).toLocaleDateString()}
                        </div>
                        {photo.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {photo.location}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 flex-wrap">
                        {photo.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <Card className="shadow-custom-md h-64">
          <CardContent className="p-6 h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-medium">Map View</h3>
                <p className="text-sm text-muted-foreground">
                  Photos organized by location coming soon
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Memory Books */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          AI Memory Books
        </h3>
        
        <Card className="shadow-custom-md gradient-warm text-white">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">January Adventures</h4>
            <p className="text-white/90 text-sm mb-3">
              AI created a beautiful memory book from your recent activities
            </p>
            <Button variant="secondary" size="sm">
              View Memory Book
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Photos;