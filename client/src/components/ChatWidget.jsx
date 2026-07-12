import { useState, useCallback, useEffect } from "react";
import { useChatHistory } from "../hooks/useChatHistory.js";
import ChatWindow from "./ChatWindow.jsx";
import Sidebar from "./Sidebar.jsx";

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    conversations,
    activeId,
    activeConversation,
    createConversation,
    selectConversation,
    appendMessage,
    deleteConversation,
    renameConversation,
    clearActive,
  } = useChatHistory();

  // Create a brand new chat session
  const handleNewChat = useCallback(() => {
    createConversation();
  }, [createConversation]);

  // Open the widget when clicked from anywhere (like the hero panel)
  useEffect(() => {
    const handleOpenRequest = () => {
      setIsOpen(true);
    };
    window.addEventListener("open-nexus-chat", handleOpenRequest);
    return () => window.removeEventListener("open-nexus-chat", handleOpenRequest);
  }, []);

  return (
    <div className="chat-widget-container">
      {/* Floating launcher trigger */}
      <button
        className={`chat-trigger-btn${isOpen ? " open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? "Close AI Assistant" : "Chat with AI Assistant"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        )}
      </button>

      {/* Floating Chat Panel */}
      <div className={`chat-panel${isOpen ? " open" : ""}${historyOpen ? " history-open" : ""}`}>
        {/* Sliding Sidebar for Chat History */}
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelectConversation={selectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={deleteConversation}
          onRenameConversation={renameConversation}
        />

        {/* Chat Window Main Area */}
        <ChatWindow
          activeConversation={activeConversation}
          onClose={() => setIsOpen(false)}
          onToggleHistory={() => setHistoryOpen((v) => !v)}
          onAppendMessage={appendMessage}
          onClear={clearActive}
          onNewChat={handleNewChat}
        />
      </div>
    </div>
  );
}

export default ChatWidget;
