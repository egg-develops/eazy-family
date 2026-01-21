import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Upload, Search, Filter, MapPin, Calendar, Sparkles, LayoutGrid, MapPin as MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParticleButton } from "@/components/ui/particle-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Marquee } from "@/components/ui/marquee";

interface Photo {
  id: string;
  src: string;
  title: string;
  date: string;
  location?: string;
  tags: string[];
  aiEnhanced?: boolean;
}

const mockPhotos: Photo[] = [];

const Memories = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  
  // In a real app, this would come from the database
  const totalPhotos = mockPhotos.length;
  const hasEnoughPhotosForAI = totalPhotos >= 7;

  const filteredPhotos = mockPhotos.filter(photo => {
    const matchesSearch = photo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         photo.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filter === 'all' || photo.tags.includes(filter);
    return matchesSearch && matchesFilter;
  });

  const aiEnhancedCount = mockPhotos.filter(p => p.aiEnhanced).length;
  const storageUsed = Math.round(mockPhotos.length * 2.3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">{t('memories.title')}</h1>
        </div>
        <Badge variant="secondary" className="text-xs">
          {filteredPhotos.length} {t('memories.title').toLowerCase()}
        </Badge>
      </div>

      {/* AI Enhancement Status */}
      <Card className="shadow-custom-md gradient-primary text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-semibold">{t('memories.aiEnhanced')}</h3>
              </div>
              <p className="text-white/90 text-sm">
                {aiEnhancedCount} {t('memories.autoOrganized')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{storageUsed} MB</div>
              <div className="text-white/80 text-xs">{t('memories.used')} {t('memories.unlimited')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('memories.searchPlaceholder')}
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
              <SelectItem value="all">{t('memories.filters.all')}</SelectItem>
              <SelectItem value="family">{t('memories.filters.family')}</SelectItem>
              <SelectItem value="outdoor">{t('memories.filters.outdoor')}</SelectItem>
              <SelectItem value="educational">{t('memories.filters.educational')}</SelectItem>
              <SelectItem value="creative">{t('memories.filters.creative')}</SelectItem>
              <SelectItem value="sport">{t('memories.filters.sport')}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="gap-2"
            >
              <MapPinIcon className="w-4 h-4" />
              Map
            </Button>
          </div>
        </div>
      </div>

      {/* Upload and Camera Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <ParticleButton 
          className="gradient-primary text-white border-0 hover:opacity-90"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = async (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files && files.length > 0) {
                toast({
                  title: "Uploading photos",
                  description: `Uploading ${files.length} photo${files.length > 1 ? 's' : ''}...`,
                });
                // Here you would upload to Supabase storage
                setTimeout(() => {
                  toast({
                    title: "Upload complete",
                    description: "Photos uploaded successfully!",
                  });
                }, 1500);
              }
            };
            input.click();
          }}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Photos
        </ParticleButton>

        <ParticleButton 
          className="gradient-primary text-white border-0 hover:opacity-90"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment'; // Use camera
            input.onchange = async (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files && files.length > 0) {
                toast({
                  title: "Capturing photo",
                  description: "Processing photo from camera...",
                });
                // Here you would upload to Supabase storage
                setTimeout(() => {
                  toast({
                    title: "Photo captured",
                    description: "Photo saved successfully!",
                  });
                }, 1500);
              }
            };
            input.click();
          }}
        >
          <Camera className="w-4 h-4 mr-2" />
          Take Photo
        </ParticleButton>
      </div>

      {/* AI Search */}
      <Card className="shadow-custom-md border-l-4 border-l-accent">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-accent mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-sm">{t('memories.aiSearch')}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {t('memories.aiSearchDesc')}
              </p>
              {!hasEnoughPhotosForAI && (
                <p className="text-xs text-warning mt-2 font-medium">
                  Need {7 - totalPhotos} more {7 - totalPhotos === 1 ? 'photo' : 'photos'} to activate AI search
                </p>
              )}
            </div>
            <Button 
              size="sm" 
              disabled={!hasEnoughPhotosForAI}
              className="gap-2"
              onClick={() => {
                toast({
                  title: "AI Search",
                  description: "AI search functionality coming soon!",
                });
              }}
            >
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Photos Grid */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          {filteredPhotos.length > 0 ? (
            <>
              {/* Recent Photos - Marquee */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('memories.recent')}</h3>
                
                <div className="space-y-4 overflow-hidden">
                  <Marquee speed={30} pauseOnHover className="[--gap:0.5rem]">
                    {filteredPhotos.map((photo) => (
                      <div key={photo.id} className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                        <div className={`w-full h-full ${photo.src}`} />
                        {photo.aiEnhanced && (
                          <div className="absolute top-1 right-1">
                            <Sparkles className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </Marquee>
                </div>
              </div>

              {/* Photo Details */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">{t('memories.details')}</h3>
                
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
            </>
          ) : (
            <Card className="shadow-custom-md">
              <CardContent className="p-8 text-center">
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No memories yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start capturing family moments by uploading photos
                </p>
                <Button 
                  className="gradient-primary text-white border-0"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.click();
                  }}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload Your First Photos
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <Card className="shadow-custom-md h-64">
          <CardContent className="p-6 h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-medium">{t('memories.viewMode.mapView')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('memories.viewMode.mapComingSoon')}
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
          {t('memories.memoryBooks')}
        </h3>
        
        <Card className="shadow-custom-md gradient-warm text-white">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">January Adventures</h4>
            <p className="text-white/90 text-sm mb-3">
              {t('memories.memoryBookDesc')}
            </p>
            <Button 
              variant="secondary" 
              size="sm"
              disabled={!hasEnoughPhotosForAI}
              onClick={() => {
                if (hasEnoughPhotosForAI) {
                  toast({
                    title: "Memory Book",
                    description: "Creating your memory book...",
                  });
                } else {
                  toast({
                    title: "Not enough photos",
                    description: `You need at least 7 photos to create a memory book. Currently you have ${totalPhotos}.`,
                    variant: "destructive",
                  });
                }
              }}
            >
              {hasEnoughPhotosForAI ? t('memories.viewMemoryBook') : `Need ${7 - totalPhotos} more photos`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Memories;
