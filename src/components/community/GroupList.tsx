import React, { useState } from 'react';

export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  category: string;
  image?: string;
  isJoined?: boolean;
}

export const GroupList: React.FC<{ groups?: Group[]; onGroupClick?: (group: Group) => void; onJoinClick?: (groupId: string) => void }> = ({ groups = [], onGroupClick, onJoinClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const categories = Array.from(new Set(groups.map(g => g.category)));
  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) || group.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || group.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ padding: '1rem', maxWidth: '900px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem 0' }}>Communities</h2>
        <div style={{ marginBottom: '1rem' }}>
          <input type="text" placeholder="Search communities..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setSelectedCategory('all')} style={{ padding: '0.5rem 1rem', backgroundColor: selectedCategory === 'all' ? '#007bff' : '#f0f0f0', color: selectedCategory === 'all' ? 'white' : '#000', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.9rem' }}>All</button>
          {categories.map(category => (
            <button key={category} onClick={() => setSelectedCategory(category)} style={{ padding: '0.5rem 1rem', backgroundColor: selectedCategory === category ? '#007bff' : '#f0f0f0', color: selectedCategory === category ? 'white' : '#000', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.9rem', textTransform: 'capitalize' }}>{category}</button>
          ))}
        </div>
      </div>
      {filteredGroups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔍</div>
          <p>No communities found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {filteredGroups.map(group => (
            <div key={group.id} onClick={() => onGroupClick?.(group)} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              {group.image && <div style={{ width: '100%', height: '150px', backgroundColor: '#f5f5f5', backgroundImage: `url(${group.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
              <div style={{ padding: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{group.name}</h3>
                <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem', height: '2.7em', overflow: 'hidden' }}>{group.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingTop: '0.5rem', borderTop: '1px solid #eee' }}>
                  <div style={{ fontSize: '0.85rem', color: '#999' }}>👥 {group.memberCount} members</div>
                  <div style={{ fontSize: '0.75rem', backgroundColor: '#f0f0f0', padding: '0.25rem 0.5rem', borderRadius: '12px', textTransform: 'capitalize' }}>{group.category}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onJoinClick?.(group.id); }} style={{ width: '100%', padding: '0.75rem', backgroundColor: group.isJoined ? '#f0f0f0' : '#007bff', color: group.isJoined ? '#666' : 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>{group.isJoined ? '✓ Joined' : 'Join Community'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
