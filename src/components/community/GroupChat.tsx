import React, { useState } from 'react';

export interface ChatMessage {
  id: string;
  author: string;
  authorId: string;
  content: string;
  timestamp: Date;
  avatar?: string;
}

export const GroupChat: React.FC<{ groupName: string; messages?: ChatMessage[]; currentUserId?: string; onSendMessage?: (content: string) => void }> = ({ groupName, messages = [], currentUserId = 'user1', onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage?.(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(date);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '600px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
        <h3 style={{ margin: 0 }}>{groupName}</h3>
        <p style={{ margin: '0.25rem 0 0 0', color: '#999', fontSize: '0.85rem' }}>{messages.length} messages</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', margin: 'auto' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(message => (
            <div key={message.id} style={{ display: 'flex', justifyContent: message.authorId === currentUserId ? 'flex-end' : 'flex-start', gap: '0.5rem', alignItems: 'flex-end' }}>
              {message.authorId !== currentUserId && <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: message.avatar ? 'transparent' : '#ddd', backgroundImage: message.avatar ? `url(${message.avatar})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />}
              <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column' }}>
                {message.authorId !== currentUserId && <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#333' }}>{message.author}</div>}
                <div style={{ backgroundColor: message.authorId === currentUserId ? '#007bff' : '#f0f0f0', color: message.authorId === currentUserId ? 'white' : '#000', padding: '0.75rem 1rem', borderRadius: '12px', wordWrap: 'break-word' }}>{message.content}</div>
                <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>{formatTime(message.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <div style={{ padding: '1rem', borderTop: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder="Type a message..." rows={2} style={{ flex: 1, padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'none' }} />
          <button onClick={handleSendMessage} disabled={!newMessage.trim()} style={{ padding: '0.75rem 1rem', backgroundColor: newMessage.trim() ? '#007bff' : '#ddd', color: 'white', border: 'none', borderRadius: '4px', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '0.9rem', alignSelf: 'flex-end' }}>Send</button>
        </div>
      </div>
    </div>
  );
};
