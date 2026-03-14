import React, { useState } from 'react';

export interface MessageInputProps {
  onSendMessage?: (message: string, attachments?: File[]) => void;
  onTyping?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping?.();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024); // Max 10MB per file
    setAttachments(prev => [...prev, ...validFiles]);
    setShowAttachments(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = () => {
    if (message.trim() || attachments.length > 0) {
      onSendMessage?.(message, attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      style={{
        padding: '1rem',
        borderTop: '1px solid #eee',
        backgroundColor: '#f8f9fa',
        borderRadius: '0 0 8px 8px',
      }}
    >
      {attachments.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#666' }}>
            Attachments ({attachments.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {attachments.map((file, index) => (
              <div
                key={index}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>📎</span>
                <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
                <button
                  onClick={() => removeAttachment(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAttachments(!showAttachments)}
            disabled={disabled}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              padding: '0.5rem',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            📎
          </button>

          {showAttachments && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
                zIndex: 10,
                minWidth: '150px',
                marginBottom: '0.5rem',
              }}
            >
              <label
                style={{
                  display: 'block',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLLabelElement).style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLLabelElement).style.backgroundColor = 'transparent';
                }}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                📷 Image
              </label>
              <label
                style={{
                  display: 'block',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  borderTop: '1px solid #eee',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLLabelElement).style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLLabelElement).style.backgroundColor = 'transparent';
                }}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                📄 File
              </label>
            </div>
          )}
        </div>

        <textarea
          value={message}
          onChange={handleMessageChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          style={{
            flex: 1,
            padding: '0.75rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            resize: 'none',
            opacity: disabled ? 0.5 : 1,
          }}
        />

        <button
          onClick={handleSendMessage}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          style={{
            padding: '0.75rem 1.2rem',
            backgroundColor: disabled || (!message.trim() && attachments.length === 0) ? '#ddd' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: disabled || (!message.trim() && attachments.length === 0) ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};
