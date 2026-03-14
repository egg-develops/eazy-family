import React, { useEffect, useRef } from 'react';

export interface ThreadMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

export interface ChatThreadProps {
  participantName: string;
  participantAvatar?: string;
  messages?: ThreadMessage[];
  currentUserId?: string;
  onBackClick?: () => void;
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  participantName,
  participantAvatar,
  messages = [],
  currentUserId = 'user1',
  onBackClick,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white' }}>
      {/* Header */}
      <div
        style={{
          padding: '1rem',
          borderBottom: '1px solid #eee',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <button
          onClick={onBackClick}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '0.5rem',
          }}
        >
          ←
        </button>
        {participantAvatar && (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#ddd',
              backgroundImage: `url(${participantAvatar})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>{participantName}</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#999' }}>Online</p>
        </div>
      </div>

      {/* Messages Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', margin: 'auto' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💬</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const showDate =
                index === 0 ||
                formatDate(messages[index - 1].timestamp) !== formatDate(message.timestamp);

              return (
                <div key={message.id}>
                  {showDate && (
                    <div style={{ textAlign: 'center', margin: '1rem 0', fontSize: '0.8rem', color: '#999' }}>
                      {formatDate(message.timestamp)}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: message.senderId === currentUserId ? 'flex-end' : 'flex-start',
                      gap: '0.5rem',
                      alignItems: 'flex-end',
                    }}
                  >
                    {message.senderId !== currentUserId && (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: message.senderAvatar ? 'transparent' : '#ddd',
                          backgroundImage: message.senderAvatar ? `url(${message.senderAvatar})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          flexShrink: 0,
                        }}
                      />
                    )}

                    <div
                      style={{
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: message.senderId === currentUserId ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: message.senderId === currentUserId ? '#007bff' : '#f0f0f0',
                          color: message.senderId === currentUserId ? 'white' : '#000',
                          padding: '0.75rem 1rem',
                          borderRadius: '12px',
                          wordWrap: 'break-word',
                          lineHeight: '1.4',
                        }}
                      >
                        {message.content}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: '#999',
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        {formatTime(message.timestamp)}
                        {message.senderId === currentUserId && (
                          <span>{getStatusIcon(message.status)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
};
