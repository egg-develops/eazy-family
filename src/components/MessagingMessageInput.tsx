import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Mic, X } from 'lucide-react';

interface Attachment {
  file: File;
  preview?: string;
  type: 'image' | 'file' | 'voice';
}

interface MessagingMessageInputProps {
  onSendMessage?: (message: string, attachments?: Attachment[]) => void;
  onAttachmentChange?: (attachments: Attachment[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  maxAttachments?: number;
}

const MessagingMessageInput: React.FC<MessagingMessageInputProps> = ({
  onSendMessage,
  onAttachmentChange,
  isLoading = false,
  placeholder = 'Type a message...',
  maxAttachments = 5,
}) => {
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const emojis = [
    '😀', '😂', '❤️', '👍', '🎉', '😍', '🔥', '💯',
    '😢', '😡', '😲', '😎', '🤔', '👏', '🙌', '🚀',
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files) {
      const newAttachments: Attachment[] = [];

      for (let i = 0; i < files.length; i++) {
        if (attachments.length + newAttachments.length >= maxAttachments) {
          break;
        }

        const file = files[i];
        const type = file.type.startsWith('image/') ? 'image' : 'file';

        const attachment: Attachment = {
          file,
          type,
        };

        if (type === 'image') {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
              attachment.preview = event.target.result;
            }
          };
          reader.readAsDataURL(file);
        }

        newAttachments.push(attachment);
      }

      const updated = [...attachments, ...newAttachments];
      setAttachments(updated);
      onAttachmentChange?.(updated);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    const updated = attachments.filter((_, i) => i !== index);
    setAttachments(updated);
    onAttachmentChange?.(updated);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const file = new File([audioBlob], 'voice-message.webm', {
          type: 'audio/webm',
        });

        const updated = [
          ...attachments,
          {
            file,
            type: 'voice' as const,
          },
        ];
        setAttachments(updated);
        onAttachmentChange?.(updated);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setIsRecording(false);
    setRecordingTime(0);
  };

  const handleSendMessage = () => {
    if (messageText.trim() || attachments.length > 0) {
      onSendMessage?.(messageText, attachments);
      setMessageText('');
      setAttachments([]);
      setShowEmojiPicker(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-white border-t">
      {isRecording && (
        <div className="bg-red-50 border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-red-600">
              Recording: {formatTime(recordingTime)}
            </span>
          </div>
          <button
            onClick={stopRecording}
            className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
          >
            Stop
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="p-3 bg-gray-50 border-b">
          <p className="text-xs text-gray-600 font-semibold mb-2">
            Attachments ({attachments.length}/{maxAttachments})
          </p>
          <div className="flex gap-2 flex-wrap">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="relative group bg-white rounded-lg p-2 border"
              >
                {attachment.type === 'image' && attachment.preview ? (
                  <img
                    src={attachment.preview}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : attachment.type === 'voice' ? (
                  <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded">
                    <Mic size={20} className="text-blue-600" />
                  </div>
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded">
                    <Paperclip size={20} className="text-gray-600" />
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEmojiPicker && (
        <div className="p-3 bg-gray-50 border-b flex gap-2 flex-wrap">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setMessageText(messageText + emoji);
                setShowEmojiPicker(false);
              }}
              className="text-xl hover:bg-gray-200 p-1 rounded transition"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="p-4">
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={isLoading}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />

        <div className="flex items-center gap-2 mt-3 justify-end">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || attachments.length >= maxAttachments}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            title="Add emoji"
          >
            <Smile size={20} />
          </button>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className={`p-2 rounded-lg transition ${
              isRecording
                ? 'text-red-600 hover:bg-red-50'
                : 'text-gray-600 hover:bg-gray-100'
            } disabled:opacity-50`}
            title={isRecording ? 'Stop recording' : 'Start voice message'}
          >
            <Mic size={20} />
          </button>

          <button
            onClick={handleSendMessage}
            disabled={(!messageText.trim() && attachments.length === 0) || isLoading}
            className="p-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition disabled:opacity-50"
            title="Send message"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessagingMessageInput;
