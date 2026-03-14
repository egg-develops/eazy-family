import React from 'react';

export interface ListingCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: 'new' | 'like-new' | 'good' | 'fair';
  location: string;
  image?: string;
  seller?: { name: string; rating: number };
  onViewDetails?: (id: string) => void;
  onContact?: (id: string) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  id, title, description, price, condition, location, image, seller, onViewDetails, onContact
}) => {
  const conditionColors: Record<string, string> = {
    'new': '#28a745', 'like-new': '#20c997', 'good': '#ffc107', 'fair': '#fd7e14',
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '300px', backgroundColor: 'white' }}>
      {image && <div style={{ width: '100%', height: '200px', backgroundColor: '#f5f5f5', backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
      <div style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{title}</h3>
          <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', backgroundColor: conditionColors[condition], color: 'white', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'capitalize' }}>{condition}</div>
        </div>
        <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</p>
        <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>${price.toFixed(2)}</div>
          <div style={{ fontSize: '0.85rem', color: '#999' }}>{location}</div>
        </div>
        {seller && <div style={{ padding: '0.5rem 0', borderTop: '1px solid #eee', marginBottom: '1rem' }}><div style={{ fontSize: '0.85rem', color: '#666' }}>{seller.name} ({seller.rating}★)</div></div>}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => onViewDetails?.(id)} style={{ flex: 1, padding: '0.5rem', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>View Details</button>
          <button onClick={() => onContact?.(id)} style={{ flex: 1, padding: '0.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>Contact</button>
        </div>
      </div>
    </div>
  );
};
