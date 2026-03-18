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
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg flex flex-col h-screen md:h-96">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={
                  userAvatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`
                }
                alt={userName}
                className="w-10 h-10 rounded-full"
              />
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{userName}</h3>
              <p className="text-sm text-blue-100">
                {isOnline ? 'Active now' : 'Offline'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onCallClick}
              className="p-2 hover:bg-blue-700 rounded-full transition"
              title="Voice call"
            >
              <Phone size={20} />
            </button>
            <button
              onClick={onVideoCallClick}
              className="p-2 hover:bg-blue-700 rounded-full transition"
              title="Video call"
            >
              <Video size={20} />
            </button>
            <button
              onClick={onInfoClick}
              className="p-2 hover:bg-blue-700 rounded-full transition"
              title="Info"
            >
              <Info size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
                className={`flex gap-2 mb-3 ${
                  message.isCurrentUser ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex flex-col ${
                    message.isCurrentUser ? 'items-end' : 'items-start'
                  } max-w-xs`}
                >
                  <div
                    className={`px-4 py-2 rounded-lg break-words ${
                      message.isCurrentUser
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-white text-gray-900 rounded-bl-none'
                    }`}
                  >
                    {message.content}
                  </div>

                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((attachment, idx) => (
                        <div
                          key={idx}
                          className={`px-3 py-2 rounded-lg text-sm ${
                            message.isCurrentUser
                              ? 'bg-blue-600'
                              : 'bg-gray-200'
                          }`}
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
