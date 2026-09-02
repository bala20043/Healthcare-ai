import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ChatInterface from '../components/ChatInterface';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const handleNewChat = () => {
    setActiveChat(null);
  };

  const handleSelectChat = (chatId) => {
    setActiveChat(chatId);
  };

  const handleChatCreated = (newChatId) => {
    setActiveChat(newChatId);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="h-screen flex flex-col bg-base-50 dark:bg-base-950">
      <Navbar
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        showMenuButton
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          activeChat={activeChat}
          refreshTrigger={refreshTrigger}
        />

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Welcome header */}
          {!activeChat && (
            <motion.div
              className="px-4 lg:px-6 pt-6 pb-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-2xl font-heading font-bold text-base-800 dark:text-base-100">
                Hello, {userName} 👋
              </h1>
              <p className="text-sm text-base-400 dark:text-base-400 mt-1">
                How can I help you understand your healthcare question today?
              </p>
            </motion.div>
          )}

          {/* Chat area */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              activeChat={activeChat}
              onChatCreated={handleChatCreated}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
