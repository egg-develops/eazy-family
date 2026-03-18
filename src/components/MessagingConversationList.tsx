import React, { useState } from 'react';
import { Search, MessageCircle, ChevronRight, BadgeCheck } from 'lucide-react';

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline?: boolean;
  isVerified?: boolean;
}

interface MessagingConversationListProps {
  conversations?: Conversation[];
  onConversationClick?: (conversationId: string) => void;
  onStartNewConversation?: () => void;
  isLoading?: boolean;
}

const MessagingConversationList: React.FC<MessagingConversationListProps> = ({
  conversations = [],
  onConversationClick,
  onStartNewConversation,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedConversations = [...filteredConversations].sort(
    (a, b) =>
      new Date(b.lastMessageTime).getTime() -
      new Date(a.lastMessageTime).getTime()
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg flex flex-col h-screen md:h-96">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Messages</h2>
          <button
            onClick={onStartNewConversation}
            className="p-2 rounded-full hover:bg-gray-100 transition"
            title="Start new message"
          >
            <MessageCircle size={20} className="text-blue-500" />
          </button>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : sortedConversations.length > 0 ? (
          <div className="divide-y">
            {sortedConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onConversationClick?.(conversation.id)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition border-l-4 border-transparent hover:border-blue-500"
              >
                <div className="flex gap-3">
                  <div className="relative flex-shrink-0">
                    <img
                      src={
                        conversation.userAvatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.userId}`
                      }
                      alt={conversation.userName}
                      className="w-12 h-12 rounded-full"
                    />
                    {conversation.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {conversation.userName}
                        </h3>
                        {conversation.isVerified && (
                          <BadgeCheck
                            size={14}
                            className="text-blue-500 flex-shrink-0"
                          />
                        )}
                      </div>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatTime(conversation.lastMessageTime)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage}
                    </p>

                    {conversation.unreadCount > 0 && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>

                  <ChevronRight
                    size={18}
                    className="text-gray-300 flex-shrink-0"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle size={48} className="mb-3 opacity-30" />
            <p>
              {searchTerm
                ? 'No conversations found'
                : 'No conversations yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingConversationList;
