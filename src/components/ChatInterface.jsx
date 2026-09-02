import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Mic,
  Bot,
  Pill,
  Droplets,
  Stethoscope,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import Loading from './Loading';
import { sendMessage, getConversationMessages } from '../services/api';

const sampleQuestions = [
  {
    text: 'Are antibiotics effective against viral infections?',
    icon: Pill,
  },
  {
    text: 'Is drinking a large amount of water quickly always the safest treatment for dehydration?',
    icon: Droplets,
  },
  {
    text: 'Why might a doctor prescribe antibiotics to someone who initially has a viral infection?',
    icon: Stethoscope,
  },
  {
    text: 'Should I take leftover antibiotics at home?',
    icon: AlertCircle,
  },
];

export default function ChatInterface({ activeChat, onChatCreated }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch messages when activeChat changes
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsFetchingMessages(true);
      setError(null);
      try {
        const historyMessages = await getConversationMessages(activeChat);
        setMessages(historyMessages);
      } catch (err) {
        console.error('Error loading conversation messages:', err);
        setError('Failed to load past messages.');
      } finally {
        setIsFetchingMessages(false);
      }
    };

    loadMessages();
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSendMessage = async (text = null) => {
    const messageText = text || inputValue.trim();
    if (!messageText || isLoading) return;

    setError(null);

    // Add user message locally
    const userMessage = {
      id: crypto.randomUUID(),
      text: messageText,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendMessage(messageText, activeChat);

      if (response) {
        const aiMessage = {
          id: response.id || crypto.randomUUID(),
          text: response.message || 'Thank you for your question. Here is evidence-based healthcare information.',
          isUser: false,
          timestamp: response.timestamp || new Date().toISOString(),
          factCheck: response.factCheck,
          safetyLevel: response.safetyLevel,
        };

        setMessages((prev) => [...prev, aiMessage]);

        // If a new conversation was created on Supabase, notify parent
        if (response.chatId && response.chatId !== activeChat && onChatCreated) {
          onChatCreated(response.chatId);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = typeof err === 'string' ? err : err?.message || 'Unable to get a response. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    const lastUserMessage = [...messages].reverse().find((m) => m.isUser);
    if (lastUserMessage) {
      setMessages((prev) => prev.filter((m) => m.id !== lastUserMessage.id));
      handleSendMessage(lastUserMessage.text);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSampleClick = (question) => {
    setInputValue('');
    handleSendMessage(question);
  };

  const isEmpty = messages.length === 0 && !isFetchingMessages;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isFetchingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loading size="md" text="Loading conversation..." />
          </div>
        ) : (
          <AnimatePresence>
            {isEmpty ? (
              /* Empty state */
              <motion.div
                className="flex flex-col items-center justify-center h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-accent-500/10 flex items-center justify-center mb-5">
                  <Bot className="w-8 h-8 text-accent-400" />
                </div>
                <h3 className="text-xl font-heading font-semibold text-base-700 dark:text-base-200 mb-2">
                  Ask me anything about healthcare
                </h3>
                <p className="text-sm text-base-400 dark:text-base-400 mb-8 max-w-md text-center">
                  Get evidence-based information, verify health claims, and understand medical topics with reliable sources.
                </p>

                {/* Sample questions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                  {sampleQuestions.map((q, index) => {
                    const IconComp = q.icon;
                    return (
                      <motion.button
                        key={index}
                        className="flex items-start gap-3 p-4 rounded-xl bg-base-100 dark:bg-base-800 border border-base-200 dark:border-base-700 hover:border-accent-400/40 hover:bg-accent-50 dark:hover:bg-accent-900/10 transition-all duration-200 text-left group"
                        onClick={() => handleSampleClick(q.text)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -2 }}
                        aria-label={`Ask: ${q.text}`}
                      >
                        <IconComp className="w-5 h-5 text-accent-500 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-sm text-base-600 dark:text-base-300 group-hover:text-accent-500 transition-colors">
                          {q.text}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              /* Messages */
              <div className="max-w-3xl mx-auto space-y-2">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg.text}
                    isUser={msg.isUser}
                    timestamp={msg.timestamp}
                    factCheck={msg.factCheck}
                    safetyLevel={msg.safetyLevel}
                  />
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <motion.div
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="w-8 h-8 rounded-xl bg-base-200 dark:bg-base-700 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-base-500 dark:text-base-300" />
                    </div>
                    <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-md bg-base-100 dark:bg-base-800 border border-base-200/60 dark:border-base-700/60">
                      <motion.div
                        className="w-2 h-2 bg-accent-400 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-accent-400 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-accent-400 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Error state */}
                {error && (
                  <motion.div
                    className="flex items-center justify-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-500/20 text-sm">
                      <AlertCircle className="w-4 h-4 text-danger-500 shrink-0" aria-hidden="true" />
                      <span className="text-danger-600 dark:text-danger-400">{error}</span>
                      <button
                        onClick={handleRetry}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-danger-500 hover:bg-danger-600 text-white text-xs font-medium transition-colors"
                        aria-label="Retry sending message"
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        Retry
                      </button>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-base-200 dark:border-base-800 bg-base-50/80 dark:bg-base-950/80 backdrop-blur-sm px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a healthcare question..."
                rows={1}
                className="w-full px-4 py-3 pr-12 rounded-xl bg-base-100 dark:bg-base-800 border border-base-200 dark:border-base-700 text-base-700 dark:text-base-200 placeholder:text-base-400 focus:outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-400/30 resize-none text-sm transition-colors"
                aria-label="Type your healthcare question"
                style={{
                  minHeight: '44px',
                  maxHeight: '120px',
                }}
              />
              {/* Mic button (placeholder) */}
              <button
                className="absolute right-3 bottom-3 text-base-300 dark:text-base-600 cursor-not-allowed"
                disabled
                title="Voice input — coming soon"
                aria-label="Voice input — coming soon"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className="p-3 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:bg-base-300 dark:disabled:bg-base-700 disabled:cursor-not-allowed text-white transition-colors duration-200"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
