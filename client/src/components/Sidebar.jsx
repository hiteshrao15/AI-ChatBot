import { useState } from "react";

function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const startRename = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditValue(conv.title);
  };

  const saveRename = (id) => {
    const trimmed = editValue.trim();
    if (trimmed) onRenameConversation(id, trimmed);
    setEditingId(null);
  };

  const handleKeyDown = (e, id) => {
    if (e.key === "Enter") saveRename(id);
    if (e.key === "Escape") setEditingId(null);
  };

  // Group items by recency
  const now = Date.now();
  const msDay = 86_400_000;
  const msWeek = msDay * 7;

  const groups = { Today: [], "This week": [], Older: [] };
  for (const conv of conversations) {
    const age = now - new Date(conv.updatedAt).getTime();
    if (age < msDay) groups["Today"].push(conv);
    else if (age < msWeek) groups["This week"].push(conv);
    else groups["Older"].push(conv);
  }

  return (
    <div className="panel-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">✦</div>
          <span className="sidebar-logo-text">NexusAI</span>
        </div>
        <button className="new-chat-btn" onClick={onNewChat}>
          ＋ New Chat
        </button>
      </div>

      <nav className="sidebar-history" aria-label="Chat history">
        {conversations.length === 0 ? (
          <p style={{ padding: "12px 8px", fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center" }}>
            No conversations yet.
          </p>
        ) : (
          Object.entries(groups).map(([label, items]) =>
            items.length === 0 ? null : (
              <div key={label}>
                <div className="history-section-label">{label}</div>
                {items.map((conv) => (
                  <div
                    key={conv.id}
                    className={`history-item${conv.id === activeId ? " active" : ""}`}
                    onClick={() => onSelectConversation(conv.id)}
                  >
                    <span className="history-item-icon">💬</span>

                    {editingId === conv.id ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveRename(conv.id)}
                        onKeyDown={(e) => handleKeyDown(e, conv.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          flex: 1,
                          background: "var(--bg-base)",
                          border: "1px solid var(--accent-primary)",
                          borderRadius: "4px",
                          color: "var(--text-primary)",
                          fontSize: "0.74rem",
                          padding: "2px 4px",
                          outline: "none",
                          width: "100%",
                        }}
                      />
                    ) : (
                      <span className="history-item-title" title={conv.title}>
                        {conv.title}
                      </span>
                    )}

                    <div className="history-item-actions">
                      <button
                        className="history-action-btn"
                        onClick={(e) => startRename(conv, e)}
                        title="Rename"
                      >
                        ✎
                      </button>
                      <button
                        className="history-action-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )
        )}
      </nav>

      <div className="sidebar-footer">Saved locally</div>
    </div>
  );
}

export default Sidebar;
