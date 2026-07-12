import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "nexusai_conversations";
const MAX_CONVERSATIONS = 50;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getTimestamp() {
  return new Date().toISOString();
}

function generateTitle(firstUserText) {
  const trimmed = firstUserText.trim();
  return trimmed.length > 40 ? trimmed.slice(0, 37) + "…" : trimmed;
}

function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(conversations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // storage full — silently ignore
  }
}

/**
 * useChatHistory — manages a list of conversations with persistence.
 *
 * Each conversation: { id, title, messages, createdAt, updatedAt }
 * Each message: { role: "user"|"model", text, timestamp }
 */
export function useChatHistory() {
  const [conversations, setConversations] = useState(() => loadConversations());
  const [activeId, setActiveId] = useState(null);

  // Persist whenever conversations change
  useEffect(() => {
    saveConversations(conversations.slice(0, MAX_CONVERSATIONS));
  }, [conversations]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  // ── Create a brand-new conversation ──────────────────────────────────
  const createConversation = useCallback(() => {
    const id = generateId();
    const newConv = {
      id,
      title: "New conversation",
      messages: [
        {
          role: "model",
          text: "Hi! I'm NexusAI, your intelligent assistant. Ask me anything — by typing or by voice 🎤",
          timestamp: getTimestamp(),
        },
      ],
      createdAt: getTimestamp(),
      updatedAt: getTimestamp(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(id);
    return id;
  }, []);

  // ── Select an existing conversation ──────────────────────────────────
  const selectConversation = useCallback((id) => {
    setActiveId(id);
  }, []);

  // ── Append a message to the active conversation ───────────────────────
  const appendMessage = useCallback(
    (message) => {
      if (!activeId) return;
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== activeId) return conv;
          const newMessages = [...conv.messages, { ...message, timestamp: getTimestamp() }];
          // Auto-generate title from first user message
          const title =
            conv.title === "New conversation"
              ? message.role === "user"
                ? generateTitle(message.text)
                : conv.title
              : conv.title;
          return { ...conv, messages: newMessages, title, updatedAt: getTimestamp() };
        })
      );
    },
    [activeId]
  );

  // ── Delete a conversation ─────────────────────────────────────────────
  const deleteConversation = useCallback(
    (id) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) setActiveId(null);
    },
    [activeId]
  );

  // ── Rename a conversation ─────────────────────────────────────────────
  const renameConversation = useCallback((id, newTitle) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  }, []);

  // ── Clear all messages in active conversation ─────────────────────────
  const clearActive = useCallback(() => {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== activeId) return conv;
        return {
          ...conv,
          messages: [
            {
              role: "model",
              text: "Hi! I'm NexusAI, your intelligent assistant. Ask me anything — by typing or by voice 🎤",
              timestamp: getTimestamp(),
            },
          ],
          title: "New conversation",
          updatedAt: getTimestamp(),
        };
      })
    );
  }, [activeId]);

  return {
    conversations,
    activeId,
    activeConversation,
    createConversation,
    selectConversation,
    appendMessage,
    deleteConversation,
    renameConversation,
    clearActive,
  };
}
