import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Trash2,
  X,
  MessageCircle,
} from 'lucide-react';
import { getChatHistory, deleteChat } from '../services/api';
import EmptyState from './EmptyState';

export default function Sidebar({ isOpen, onClose, onNewChat, onSelectChat, activeChat, refreshTrigger }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadChatHistory = useCallback(async () => {
    setLoading(true);
    try {
      const history = await getChatHistory();
      setChatHistory(history);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory, activeChat, refreshTrigger]);

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      await deleteChat(chatId);
      setChatHistory((prev) => prev.filter((chat) => chat.id !== chatId));
      if (activeChat === chatId) {
        onNewChat();
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  // Group chats by date
  const today = new Date().toDateString();
  const todayChats = chatHistory.filter(
    (chat) => new Date(chat.createdAt).toDateString() === today
  );
  const previousChats = chatHistory.filter(
    (chat) => new Date(chat.createdAt).toDateString() !== today
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-base-50 dark:bg-base-900">
      {/* Header */}
      <div className="p-4 border-b border-base-200/60 dark:border-base-800/60 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-heading font-semibold text-base-500 dark:text-base-400 uppercase tracking-wider">
            Chat History
          </h2>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-base-200 dark:hover:bg-base-800 text-base-400 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium transition-colors duration-200 shadow-glow-sm"
          aria-label="Start a new chat"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 rounded-lg bg-base-200 dark:bg-base-800 animate-pulse"
              />
            ))}
          </div>
        ) : chatHistory.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            description="Start a new chat to begin exploring healthcare information."
          />
        ) : (
          <div className="space-y-4">
            {/* Today */}
            {todayChats.length > 0 && (
              <div>
                <p className="text-xs font-medium text-base-400 dark:text-base-500 uppercase tracking-wider px-2 mb-2">
                  Today
                </p>
                <div className="space-y-1">
                  {todayChats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={activeChat === chat.id}
                      onSelect={() => onSelectChat?.(chat.id)}
                      onDelete={(e) => handleDeleteChat(e, chat.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Previous */}
            {previousChats.length > 0 && (
              <div>
                <p className="text-xs font-medium text-base-400 dark:text-base-500 uppercase tracking-wider px-2 mb-2">
                  Previous
                </p>
                <div className="space-y-1">
                  {previousChats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={activeChat === chat.id}
                      onSelect={() => onSelectChat?.(chat.id)}
                      onDelete={(e) => handleDeleteChat(e, chat.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet sidebar */}
      <aside className="hidden md:flex w-64 lg:w-72 shrink-0 border-r border-base-200/60 dark:border-base-800/60 bg-base-50 dark:bg-base-900 h-full overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 top-16 bg-black/60 z-40 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.div
              className="md:hidden fixed left-0 top-16 bottom-0 w-72 z-50 bg-base-50 dark:bg-base-900 border-r border-base-200/60 dark:border-base-800/60 shadow-2xl overflow-hidden"
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ChatItem({ chat, isActive, onSelect, onDelete }) {
  return (
    <div
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group cursor-pointer ${
        isActive
          ? 'bg-accent-500/10 text-accent-500 border border-accent-400/20'
          : 'hover:bg-base-100 dark:hover:bg-base-800 text-base-600 dark:text-base-300'
      }`}
      role="button"
      tabIndex={0}
      aria-label={`Open chat: ${chat.title}`}
    >
      <MessageSquare className="w-4 h-4 shrink-0 opacity-60" aria-hidden="true" />
      <span className="text-sm truncate flex-1">{chat.title}</span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-base-200 dark:hover:bg-base-700 text-base-400 hover:text-danger-500 transition-all"
        title="Delete chat"
        aria-label="Delete chat"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
