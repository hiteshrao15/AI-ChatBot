import { useState, useRef, useEffect, useCallback } from "react";
import { sendMessage } from "../services/chatApi.js";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { speakText } from "../hooks/useSpeechSynthesis.js";

/**
 * Formats an ISO timestamp into a human-readable "HH:MM AM/PM" string.
 */
function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Builds the Gemini-style history array.
 * Gemini requires history to start with role "user", so any leading
 * model messages (like the greeting) are stripped before sending.
 */
function buildHistory(msgs) {
  const firstUserIndex = msgs.findIndex((m) => m.role === "user");
  if (firstUserIndex === -1) return [];
  return msgs.slice(firstUserIndex).map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));
}

/**
 * ChatView — the full-page chat panel for an active conversation.
 *
 * Props:
 *  - conversation  { id, title, messages }
 *  - onAppend      fn(message) — save a new message to history
 *  - onClear       fn() — wipe the current conversation
 */
function ChatView({ conversation, onAppend, onClear }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const pendingFired = useRef(false);

  // Fire a pending prompt set by WelcomeScreen suggestion cards
  useEffect(() => {
    if (pendingFired.current) return;
    const pending = sessionStorage.getItem("nexusai_pending_prompt");
    if (pending) {
      sessionStorage.removeItem("nexusai_pending_prompt");
      pendingFired.current = true;
      // Small delay so the component is fully mounted
      setTimeout(() => handleSend(pending), 80);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages, isLoading]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const handleSend = useCallback(
    async (textOverride) => {
      const text = (textOverride ?? input).trim();
      if (!text || isLoading) return;

      // Build history BEFORE appending the new user message
      const historyBeforeThisMessage = buildHistory(conversation.messages);

      const userMessage = { role: "user", text };
      onAppend(userMessage);
      setInput("");
      setIsLoading(true);

      try {
        const reply = await sendMessage(text, historyBeforeThisMessage);
        onAppend({ role: "model", text: reply });
        if (voiceReplyEnabled) speakText(reply);
      } catch {
        onAppend({
          role: "model",
          text: "⚠️ Sorry, I couldn't reach the server. Make sure the backend is running on port 5000.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, conversation.messages, onAppend, voiceReplyEnabled]
  );

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
    <>
      {/* Messages */}
      <div className="messages-area" id="messages-area">
        {conversation.messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === "model" ? "✦" : "👤"}
            </div>
            <div className="message-content">
              <div className={`message-bubble ${msg.role}`}>
                {msg.text}
              </div>
              {msg.timestamp && (
                <span className="message-time">{formatTime(msg.timestamp)}</span>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="typing-row">
            <div
              className="message-avatar"
              style={{ background: "var(--accent-gradient)", boxShadow: "0 4px 12px var(--accent-glow)", width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}
            >
              ✦
            </div>
            <div className="typing-bubble">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            id="chat-input"
            className="chat-textarea"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "🎤 Listening…" : "Message NexusAI… (Shift+Enter for new line)"}
            disabled={isLoading}
            aria-label="Chat input"
          />

          <div className="input-actions">
            {isSupported && (
              <button
                id="mic-btn"
                className={`mic-btn${isListening ? " listening" : ""}`}
                onClick={startListening}
                disabled={isLoading}
                title={isListening ? "Listening…" : "Voice input"}
                aria-label="Voice input"
              >
                🎤
              </button>
            )}
            <button
              id="send-btn"
              className="send-btn"
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              title="Send message"
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </div>

        <div className="input-footer">
          <label className="voice-toggle-label" htmlFor="voice-toggle">
            <input
              id="voice-toggle"
              type="checkbox"
              checked={voiceReplyEnabled}
              onChange={(e) => setVoiceReplyEnabled(e.target.checked)}
            />
            Read replies aloud
          </label>

          <button
            id="clear-chat-btn"
            className="clear-chat-btn"
            onClick={onClear}
            title="Clear this conversation"
          >
            🗑 Clear chat
          </button>
        </div>
      </div>
    </>
  );
}

export default ChatView;
