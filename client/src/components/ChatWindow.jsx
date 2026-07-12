import { useState, useRef, useEffect } from "react";
import { sendMessage } from "../services/chatApi.js";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { speakText } from "../hooks/useSpeechSynthesis.js";

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function buildHistory(msgs) {
  const firstUserIndex = msgs.findIndex((m) => m.role === "user");
  if (firstUserIndex === -1) return [];
  return msgs.slice(firstUserIndex).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));
}

function ChatWindow({
  activeConversation,
  onClose,
  onToggleHistory,
  onAppendMessage,
  onClear,
  onNewChat,
}) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages, isLoading]);

  // Handle auto resizing text input
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 100) + "px";
  }, [input]);

  const handleSend = async (textToSend) => {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    // Create session if none active
    if (!activeConversation) {
      onNewChat();
      // Store prompt to fire after render
      sessionStorage.setItem("nexusai_pending", text);
      setInput("");
      return;
    }

    const historyBefore = buildHistory(activeConversation.messages);
    const userMsg = { role: "user", text };
    onAppendMessage(userMsg);
    setInput("");
    setIsLoading(true);

    try {
      const reply = await sendMessage(text, historyBefore);
      onAppendMessage({ role: "model", text: reply });
      if (voiceReplyEnabled) speakText(reply);
    } catch {
      onAppendMessage({
        role: "model",
        text: "⚠️ Couldn't connect to the backend server. Is it running on port 5000?",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Run pending message if set (e.g. suggestions clicked in welcome screen)
  useEffect(() => {
    const pending = sessionStorage.getItem("nexusai_pending");
    if (pending && activeConversation) {
      sessionStorage.removeItem("nexusai_pending");
      handleSend(pending);
    }
  }, [activeConversation]);

  const { startListening, isListening, isSupported } = useSpeechRecognition(
    (transcript) => {
      setInput(transcript);
      handleSend(transcript);
    }
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="panel-main">
      {/* Header */}
      <header className="chat-header">
        <button
          className="history-toggle-btn"
          onClick={onToggleHistory}
          title="Toggle Chat History"
          aria-label="Toggle history panel"
        >
          ☰
        </button>

        <div className="chat-header-avatar">✦</div>

        <div className="chat-header-info">
          <div className="chat-header-name">
            {activeConversation?.title || "AI Assistant"}
          </div>
          <div className="chat-header-status">
            <span className="status-dot" />
            Online
          </div>
        </div>

        <button className="close-btn" onClick={onClose} title="Minimize Window">
          ✕
        </button>
      </header>

      {/* Welcome Screen or Message list */}
      {!activeConversation ? (
        <div className="panel-welcome">
          <div className="welcome-icon-bubble">✦</div>
          <h3 className="welcome-title-small">Hi there! 👋</h3>
          <p className="welcome-desc-small">
            I'm your AI assistant. Ask me anything or select a task below to get started.
          </p>

          <div className="panel-suggestions">
            <button
              className="panel-suggestion-card"
              onClick={() => handleSend("Explain quantum computing in simple terms")}
            >
              🧠 Explain a complex concept
            </button>
            <button
              className="panel-suggestion-card"
              onClick={() => handleSend("Write a professional email following up after a job interview")}
            >
              ✍️ Write something for me
            </button>
            <button
              className="panel-suggestion-card"
              onClick={() => handleSend("Give me 5 creative startup ideas")}
            >
              💡 Brainstorm ideas
            </button>
          </div>
        </div>
      ) : (
        <div className="chat-messages">
          {activeConversation.messages.map((msg, i) => (
            <div key={i} className={`msg-row ${msg.role}`}>
              <div className="msg-avatar">{msg.role === "model" ? "✦" : "👤"}</div>
              <div className="msg-bubble-wrap">
                <div className="msg-bubble">{msg.text}</div>
                {msg.timestamp && (
                  <span className="msg-time">{formatTime(msg.timestamp)}</span>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="msg-row model typing-row">
              <div className="msg-avatar">✦</div>
              <div className="typing-bubble">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input row */}
      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "🎤 Listening..." : "Ask me anything..."}
            disabled={isLoading}
          />

          <div className="input-actions">
            {isSupported && (
              <button
                className={`mic-btn ${isListening ? "listening" : ""}`}
                onClick={startListening}
                disabled={isLoading}
                title="Voice input"
              >
                🎤
              </button>
            )}

            <button
              className="send-btn"
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              title="Send message"
            >
              ➤
            </button>
          </div>
        </div>

        {/* Extra controls footer */}
        <div className="input-footer">
          <label className="voice-toggle-label">
            <input
              type="checkbox"
              checked={voiceReplyEnabled}
              onChange={(e) => setVoiceReplyEnabled(e.target.checked)}
            />
            Read replies aloud
          </label>

          {activeConversation && (
            <button className="clear-chat-btn" onClick={onClear} title="Clear conversation">
              🗑 Clear chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
