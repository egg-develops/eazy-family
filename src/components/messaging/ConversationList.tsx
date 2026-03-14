import React, { useState } from 'react';

export interface Conversation {
  id: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isActive?: boolean;
}

export const ConversationList: React.FC<{ conversations?: Conversation[]; onConversationSelect?: (conversationId: string) => void }> = ({ conversations = [], onConversationSelect }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  };

  const filteredConversations = conversations.filter(conv => conv.participantName.toLowerCase().includes(searchTerm.toLowerCase()) || conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    onConversationSelect?.(id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Messages</h3>
        <input type="text" placeholder="Search conversations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredConversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
            <p>{searchTerm ? 'No conversations found' : 'No conversations yet'}</p>
          </div>
        ) : (
          filteredConversations.map(conversation => (
            <div key={conversation.id} onClick={() => handleSelectConversation(conversation.id)} style={{ padding: '1rem', borderBottom: '1px solid #eee', backgroundColor: selectedId === conversation.id ? '#f0f7ff' : 'white', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: conversation.participantAvatar ? 'transparent' : '#ddd', backgroundImage: conversation.participantAvatar ? `url(${conversation.participantAvatar})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <h4 style={{ margin: 0, fontWeight: conversation.unreadCount > 0 ? 'bold' : 'normal' }}>{conversation.participantName}</h4>
                  <span style={{ fontSize: '0.8rem', color: '#999' }}>{formatTime(conversation.lastMessageTime)}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: conversation.unreadCount > 0 ? '#333' : '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: conversation.unreadCount > 0 ? 'bold' : 'normal' }}>{conversation.lastMessage}</p>
              </div>
              {conversation.unreadCount > 0 && <div style={{ backgroundColor: '#007bff', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>{conversation.unreadCount}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
