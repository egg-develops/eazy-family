import React, { useState } from 'react';
import { Heart, Share2, MapPin, Clock } from 'lucide-react';

interface ListingCardProps {
  id: string;
  title: string;
  price: number;
  images: string[];
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  seller: {
    name: string;
    rating?: number;
  };
  location?: string;
  postedAt?: Date;
}

const MarketplaceListingCard: React.FC<ListingCardProps> = ({
  id,
  title,
  price,
  images,
  condition,
  seller,
  location,
  postedAt,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  const conditionColors: Record<string, string> = {
    new: 'bg-green-100 text-green-800',
    'like-new': 'bg-emerald-100 text-emerald-800',
    good: 'bg-blue-100 text-blue-800',
    fair: 'bg-yellow-100 text-yellow-800',
    poor: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden">
      <div className="relative bg-gray-200 h-48 overflow-hidden">
        {images.length > 0 ? (
          <img
            src={images[currentImageIndex]}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No Image
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFavorited(!isFavorited);
            }}
            className={`p-2 rounded-full transition ${
              isFavorited
                ? 'bg-red-500 text-white'
                : 'bg-white/90 text-gray-700 hover:bg-white'
            }`}
          >
            <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
          <button className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white transition">
            <Share2 size={18} />
          </button>
        </div>

        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold ${conditionColors[condition]}`}>
          {condition.charAt(0).toUpperCase() + condition.slice(1)}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg line-clamp-2 mb-2">{title}</h3>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold text-blue-600">
            ${price.toFixed(2)}
          </span>
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-3">
          {location && (
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{location}</span>
            </div>
          )}
          {postedAt && (
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>
                {Math.floor(
                  (new Date().getTime() - new Date(postedAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}d ago
              </span>
            </div>
          )}
        </div>

        <div className="border-t pt-3 flex items-center justify-between">
          <div className="text-sm">
            <p className="font-semibold">{seller.name}</p>
            {seller.rating !== undefined && (
              <p className="text-gray-500">★ {seller.rating.toFixed(1)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceListingCard;
