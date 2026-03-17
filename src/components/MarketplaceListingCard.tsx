import { Heart, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MarketItem {
  id: string;
  title: string;
  description: string;
  price: number | null;
  condition: string;
  category: string;
  imageUrl?: string;
  seller: {
    name: string;
    initials: string;
    location?: string;
  };
}

interface Props {
  item: MarketItem;
  onContact?: (id: string) => void;
  onFavorite?: (id: string) => void;
}

const conditionColors: Record<string, string> = {
  new: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "like-new": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  good: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  fair: "bg-muted text-muted-foreground",
};

const MarketplaceListingCard = ({ item, onContact, onFavorite }: Props) => {
  return (
    <Card className="shadow-custom-md overflow-hidden" role="article" aria-label={item.title}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No image</span>
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-2">
            <h4 className="font-semibold text-sm leading-tight truncate">{item.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
            <div className="flex items-center gap-2">
              {item.condition && (
                <Badge className={`text-xs ${conditionColors[item.condition] || conditionColors.fair}`}>
                  {item.condition}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">{item.category}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-primary">
                {item.price ? `$${item.price}` : "Free"}
              </div>
              <div className="flex items-center gap-2">
                {onFavorite && (
                  <Button size="icon" variant="ghost" onClick={() => onFavorite(item.id)} aria-label="Favorite">
                    <Heart className="w-4 h-4" />
                  </Button>
                )}
                {onContact && (
                  <Button size="sm" variant="outline" onClick={() => onContact(item.id)}>
                    Contact
                  </Button>
                )}
              </div>
            </div>
            {item.seller && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{item.seller.initials}</AvatarFallback>
                </Avatar>
                {item.seller.location && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {item.seller.location}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketplaceListingCard;
