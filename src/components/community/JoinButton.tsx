import React, { useState } from 'react';

export const JoinButton: React.FC<{ groupId: string; isJoined?: boolean; onJoinClick?: (groupId: string) => void; onLeaveClick?: (groupId: string) => void; size?: 'small' | 'medium' | 'large'; variant?: 'primary' | 'secondary' | 'outline' }> = ({ groupId, isJoined = false, onJoinClick, onLeaveClick, size = 'medium', variant = 'primary' }) => {
  const [loading, setLoading] = useState(false);
  const sizeStyles: Record<string, { padding: string; fontSize: string }> = { small: { padding: '0.4rem 0.8rem', fontSize: '0.8rem' }, medium: { padding: '0.6rem 1.2rem', fontSize: '0.9rem' }, large: { padding: '0.8rem 1.6rem', fontSize: '1rem' } };
  const variantStyles = { primary: { bg: isJoined ? '#f0f0f0' : '#007bff', text: isJoined ? '#666' : 'white', border: 'none' }, secondary: { bg: isJoined ? '#e8f5e9' : '#f0f0f0', text: isJoined ? '#2e7d32' : '#666', border: 'none' }, outline: { bg: isJoined ? '#f0f0f0' : 'transparent', text: isJoined ? '#666' : '#007bff', border: `2px solid ${isJoined ? '#ddd' : '#007bff'}` } };
  const style = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const handleClick = async () => {
    setLoading(true);
    try {
      if (isJoined) onLeaveClick?.(groupId);
      else onJoinClick?.(groupId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading} style={{ padding: sizeStyle.padding, fontSize: sizeStyle.fontSize, backgroundColor: style.bg, color: style.text, border: style.border, borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: 'all 0.2s', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap' }}>
      {loading ? (<><span style={{ display: 'inline-block', marginRight: '0.5rem' }}>⏳</span>{isJoined ? 'Leaving...' : 'Joining...'}</>) : (<>{isJoined ? (<><span style={{ marginRight: '0.4rem' }}>✓</span>Joined</>) : (<><span style={{ marginRight: '0.4rem' }}>+</span>Join Community</>)}</>)}
    </button>
  );
};
