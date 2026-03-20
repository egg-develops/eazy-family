import React, { useRef, useEffect, useState } from 'react';
import { Phone, Video, Info } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isCurrentUser: boolean;
  status?: 'sent' | 'delivered' | 'read';
  attachments?: Array<{ type: string; url: string; name: string }>;
}

interface MessagingChatThreadProps {
  userName?: string;
  userAvatar?: string;
  isOnline?: boolean;
  messages?: Message[];
  isLoading?: boolean;
  onCallClick?: () => void;
  onVideoCallClick?: () => void;
  onInfoClick?: () => void;
}

const MessagingChatThread: React.FC<MessagingChatThreadProps> = ({
  userName = 'User',
  userAvatar,
  isOnline = false,
  messages = [],
  isLoading = false,
  onCallClick,
  onVideoCallClick,
  onInfoClick,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedAttachments, setExpandedAttachments] = useState<Set<string>>(
    new Set()
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year:
        messageDate.getFullYear() !== today.getFullYear()
          ? 'numeric'
          : undefined,
    });
  };

  const groupedMessages = messages.reduce(
    (acc, msg) => {
      const dateKey = formatDate(msg.timestamp);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(msg);
      return acc;
    },
    {} as Record<string, Message[]>
  );

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
    <div className="w-full bg-white rounded-lg shadow-lg flex flex-col h-full">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-4 rounded-t-lg flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <img
                src={
                  userAvatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`
                }
                alt={userName}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
              />
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-white" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base truncate">{userName}</h3>
              <p className="text-xs sm:text-sm text-blue-100">
                {isOnline ? 'Active now' : 'Offline'}
              </p>
            </div>
          </div>

          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={onCallClick}
              className="p-1.5 sm:p-2 hover:bg-blue-700 rounded-full transition"
              title="Voice call"
            >
              <Phone size={16} className="sm:hidden" />
              <Phone size={20} className="hidden sm:block" />
            </button>
            <button
              onClick={onVideoCallClick}
              className="p-1.5 sm:p-2 hover:bg-blue-700 rounded-full transition"
              title="Video call"
            >
              <Video size={16} className="sm:hidden" />
              <Video size={20} className="hidden sm:block" />
            </button>
            <button
              onClick={onInfoClick}
              className="p-1.5 sm:p-2 hover:bg-blue-700 rounded-full transition"
              title="Info"
            >
              <Info size={16} className="sm:hidden" />
              <Info size={20} className="hidden sm:block" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4 bg-gray-50">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="flex items-center justify-center my-2">
              <div className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full">
                {date}
              </div>
            </div>

            {dateMessages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-1 sm:gap-2 mb-2 sm:mb-3 ${
                  message.isCurrentUser ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex flex-col ${
                    message.isCurrentUser ? 'items-end' : 'items-start'
                  } max-w-[85%] sm:max-w-xs`}
                >
                  <div
                    className={`px-3 sm:px-4 py-2 rounded-lg break-words text-sm sm:text-base ${
                      message.isCurrentUser
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-white text-gray-900 rounded-bl-none'
                    }`}
                  >
                    {message.content}
                  </div>

                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-1 sm:mt-2 space-y-1 sm:space-y-2">
                      {message.attachments.map((attachment, idx) => (
                        <div
                          key={idx}
                          className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm truncate ${
                            message.isCurrentUser
                              ? 'bg-blue-600'
                              : 'bg-gray-200'
                          }`}
                          title={attachment.name}
                        >
                          📎 {attachment.name}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-1 text-xs">
                    <span
                      className={
                        message.isCurrentUser
                          ? 'text-blue-100'
                          : 'text-gray-500'
                      }
                    >
                      {formatTime(message.timestamp)}
                    </span>
                    {message.isCurrentUser && (
                      <span
                        className={
                          message.status === 'read'
                            ? 'text-blue-200'
                            : 'text-blue-100'
                        }
                      >
                        {getStatusIcon(message.status)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessagingChatThread;
