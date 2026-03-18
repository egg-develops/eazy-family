import React, { useState } from 'react';
import { Send, Smile } from 'lucide-react';

interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  isCurrentUser: boolean;
}

const CommunityGroupChat: React.FC<{
  groupName?: string;
  messages?: Message[];
  onSendMessage?: (content: string) => void;
}> = ({ groupName = 'Group Chat', messages = [], onSendMessage }) => {
  const [messageText, setMessageText] = useState('');

  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage?.(messageText);
      setMessageText('');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg flex flex-col h-96">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg">
        <h2 className="text-lg font-bold">{groupName}</h2>
        <p className="text-sm text-blue-100">{messages.length} messages</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${
              message.isCurrentUser ? 'justify-end' : 'justify-start'
            }`}
          >
            {!message.isCurrentUser && (
              <img
                src={
                  message.userAvatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.userId}`
                }
                alt={message.userName}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
            )}
            <div
              className={`flex flex-col ${
                message.isCurrentUser ? 'items-end' : 'items-start'
              }`}
            >
              {!message.isCurrentUser && (
                <p className="text-xs text-gray-600 font-semibold mb-1">
                  {message.userName}
                </p>
              )}
              <div
                className={`px-4 py-2 rounded-lg ${
                  message.isCurrentUser
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-900 rounded-bl-none'
                }`}
              >
                {message.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4 bg-gray-50 rounded-b-lg">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg">
            <Smile size={20} />
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className="p-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunityGroupChat;
