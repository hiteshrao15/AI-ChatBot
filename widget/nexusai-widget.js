/**
 * NexusAI Embeddable Chat Widget
 * -------------------------------------------------------
 * Drop this into any website with a single <script> tag.
 *
 * Configuration (set BEFORE the script tag):
 *   window.NexusAIConfig = {
 *     apiUrl:       'http://localhost:5000/api',
 *     botName:      'NexusAI',
 *     greeting:     'Hi! How can I help you today?',
 *     primaryColor: '#6c63ff',
 *     position:     'bottom-right',   // or 'bottom-left'
 *     theme:        'dark',           // or 'light'
 *     placeholder:  'Message NexusAI…',
 *   };
 *
 * Or via data-* attributes on the script tag:
 *   <script src="nexusai-widget.js"
 *           data-api-url="http://localhost:5000/api"
 *           data-bot-name="NexusAI"
 *           data-primary-color="#6c63ff"
 *           data-theme="dark">
 *   </script>
 */
(function () {
  'use strict';

  // ─── Prevent double-init ─────────────────────────────────────────────
  if (window.__nexusai_loaded) return;
  window.__nexusai_loaded = true;

  // ─── Resolve config ───────────────────────────────────────────────────
  const scriptEl = document.currentScript ||
    document.querySelector('script[src*="nexusai-widget"]');

  function attr(name, fallback) {
    return (scriptEl && scriptEl.getAttribute('data-' + name)) || fallback;
  }

  const W = window.NexusAIConfig || {};

  const CFG = {
    apiUrl:       W.apiUrl       || attr('api-url',       'http://localhost:5000/api'),
    botName:      W.botName      || attr('bot-name',      'NexusAI'),
    greeting:     W.greeting     || attr('greeting',      'Hi! I\'m your AI assistant. How can I help you today? 🚀'),
    primaryColor: W.primaryColor || attr('primary-color', '#6c63ff'),
    position:     W.position     || attr('position',      'bottom-right'),
    theme:        W.theme        || attr('theme',         'dark'),
    placeholder:  W.placeholder  || attr('placeholder',   'Message NexusAI…'),
  };

  // Derive secondary color (lighter shade of primary)
  const STORAGE_KEY = 'nexusai_widget_history';

  // ─── LocalStorage helpers ─────────────────────────────────────────────
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
  function saveHistory(convs) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convs.slice(0, 30))); }
    catch { /* storage full */ }
  }

  // ─── Unique ID / timestamp helpers ────────────────────────────────────
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function now() { return new Date().toISOString(); }
  function fmtTime(iso) {
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }
  function autoTitle(text) {
    const t = text.trim();
    return t.length > 38 ? t.slice(0, 35) + '…' : t;
  }

  // ─── CSS (injected into Shadow DOM) ──────────────────────────────────
  const isDark = CFG.theme !== 'light';
  const p = CFG.primaryColor;

  const THEME = isDark ? {
    bg:         '#080b14',
    surface:    '#0e1220',
    elevated:   '#141926',
    card:       '#1a2035',
    hover:      '#1f2840',
    border:     'rgba(255,255,255,0.07)',
    text:       '#f0f4ff',
    textSub:    '#8b95b0',
    textMuted:  '#4a5568',
    shadow:     'rgba(0,0,0,0.6)',
    inputBg:    '#141926',
  } : {
    bg:         '#f8fafc',
    surface:    '#ffffff',
    elevated:   '#f1f5f9',
    card:       '#e8eef8',
    hover:      '#dde6f5',
    border:     'rgba(0,0,0,0.08)',
    text:       '#0f172a',
    textSub:    '#475569',
    textMuted:  '#94a3b8',
    shadow:     'rgba(0,0,0,0.2)',
    inputBg:    '#f1f5f9',
  };

  const CSS = `
    :host { all: initial; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Launch Button ── */
    #nai-launch {
      position: fixed;
      ${CFG.position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'}
      bottom: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${p} 0%, ${p}cc 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px ${p}55, 0 2px 8px ${THEME.shadow};
      z-index: 2147483640;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
                  box-shadow 0.2s ease;
      outline: none;
    }
    #nai-launch:hover {
      transform: scale(1.1);
      box-shadow: 0 12px 32px ${p}77, 0 4px 12px ${THEME.shadow};
    }
    #nai-launch:active { transform: scale(0.95); }
    #nai-launch svg { width: 28px; height: 28px; fill: #fff; transition: transform 0.3s ease; }
    #nai-launch.open svg.chat-icon { display: none; }
    #nai-launch.open svg.close-icon { display: block !important; }
    svg.close-icon { display: none; }

    /* Unread badge */
    #nai-badge {
      position: absolute;
      top: -2px; right: -2px;
      background: #ef4444;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      width: 18px; height: 18px;
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      border: 2px solid ${THEME.bg};
    }
    #nai-badge.visible { display: flex; }

    /* ── Panel ── */
    #nai-panel {
      position: fixed;
      ${CFG.position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'}
      bottom: 96px;
      width: 380px;
      height: 600px;
      max-height: calc(100vh - 120px);
      background: ${THEME.bg};
      border-radius: 20px;
      display: flex;
      overflow: hidden;
      box-shadow: 0 24px 64px ${THEME.shadow}, 0 0 0 1px ${THEME.border};
      z-index: 2147483639;
      transform: scale(0.92) translateY(16px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1),
                  opacity 0.25s ease;
      transform-origin: ${CFG.position === 'bottom-left' ? 'bottom left' : 'bottom right'};
    }
    #nai-panel.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    /* ── Sidebar ── */
    #nai-sidebar {
      width: 200px;
      min-width: 200px;
      background: ${THEME.surface};
      border-right: 1px solid ${THEME.border};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: width 0.25s ease, min-width 0.25s ease;
    }
    #nai-sidebar.hidden { width: 0; min-width: 0; }

    .nai-sidebar-head {
      padding: 14px 12px 10px;
      border-bottom: 1px solid ${THEME.border};
      flex-shrink: 0;
    }
    .nai-logo {
      display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
    }
    .nai-logo-icon {
      width: 28px; height: 28px; border-radius: 7px;
      background: linear-gradient(135deg, ${p}, ${p}aa);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; flex-shrink: 0;
      box-shadow: 0 4px 10px ${p}44;
    }
    .nai-logo-name {
      font-size: 0.9rem; font-weight: 700; color: ${p};
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .nai-new-btn {
      width: 100%;
      padding: 8px 10px;
      background: linear-gradient(135deg, ${p}, ${p}cc);
      color: #fff;
      border: none; border-radius: 8px;
      font-size: 0.78rem; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      gap: 5px; font-family: inherit;
      transition: opacity 0.2s;
    }
    .nai-new-btn:hover { opacity: 0.88; }

    .nai-history {
      flex: 1; overflow-y: auto; padding: 8px 6px;
    }
    .nai-history::-webkit-scrollbar { width: 3px; }
    .nai-history::-webkit-scrollbar-thumb { background: ${THEME.border}; border-radius: 2px; }

    .nai-hist-label {
      padding: 4px 6px 2px;
      font-size: 0.62rem; font-weight: 600; color: ${THEME.textMuted};
      text-transform: uppercase; letter-spacing: 0.08em;
    }
    .nai-hist-item {
      display: flex; align-items: center; gap: 7px;
      padding: 7px 8px; border-radius: 7px;
      cursor: pointer; margin-bottom: 1px;
      transition: background 0.15s;
      position: relative;
    }
    .nai-hist-item:hover { background: ${THEME.hover}; }
    .nai-hist-item.active { background: ${p}22; }
    .nai-hist-item.active::before {
      content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
      width: 3px; border-radius: 2px;
      background: linear-gradient(135deg, ${p}, ${p}cc);
    }
    .nai-hist-title {
      flex: 1; font-size: 0.75rem; color: ${THEME.textSub};
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .nai-hist-item.active .nai-hist-title { color: ${THEME.text}; }
    .nai-hist-del {
      display: none; background: none; border: none;
      color: ${THEME.textMuted}; cursor: pointer; font-size: 11px;
      padding: 2px 4px; border-radius: 4px; line-height: 1;
      transition: color 0.15s;
    }
    .nai-hist-item:hover .nai-hist-del { display: block; }
    .nai-hist-del:hover { color: #f87171; }

    .nai-sidebar-foot {
      padding: 8px 10px;
      border-top: 1px solid ${THEME.border};
      font-size: 0.65rem; color: ${THEME.textMuted};
      text-align: center; line-height: 1.5; flex-shrink: 0;
    }

    /* ── Main chat area ── */
    #nai-main {
      flex: 1; display: flex; flex-direction: column; overflow: hidden;
      background: ${THEME.bg};
    }

    /* Header */
    .nai-header {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px;
      background: ${THEME.surface};
      border-bottom: 1px solid ${THEME.border};
      flex-shrink: 0;
    }
    .nai-header-toggle {
      background: none; border: none; color: ${THEME.textSub};
      cursor: pointer; font-size: 16px; padding: 4px 6px;
      border-radius: 6px; transition: color 0.15s, background 0.15s;
      line-height: 1;
    }
    .nai-header-toggle:hover { background: ${THEME.hover}; color: ${THEME.text}; }
    .nai-header-avatar {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, ${p}, ${p}aa);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
      box-shadow: 0 4px 10px ${p}44;
    }
    .nai-header-info { flex: 1; min-width: 0; }
    .nai-header-name {
      font-size: 0.875rem; font-weight: 600; color: ${THEME.text};
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .nai-header-status {
      display: flex; align-items: center; gap: 5px;
      font-size: 0.68rem; color: ${THEME.textMuted};
    }
    .nai-status-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #4ade80;
      animation: nai-pulse 2s infinite;
    }
    @keyframes nai-pulse {
      0%,100% { opacity: 1; } 50% { opacity: 0.5; }
    }
    .nai-header-clear {
      background: none; border: none; color: ${THEME.textMuted};
      cursor: pointer; font-size: 13px; padding: 5px 7px;
      border-radius: 6px; transition: color 0.15s, background 0.15s;
    }
    .nai-header-clear:hover { color: #f87171; background: rgba(248,113,113,0.1); }

    /* Messages */
    #nai-messages {
      flex: 1; overflow-y: auto; padding: 14px 12px;
      display: flex; flex-direction: column; gap: 2px;
    }
    #nai-messages::-webkit-scrollbar { width: 3px; }
    #nai-messages::-webkit-scrollbar-thumb { background: ${THEME.border}; border-radius: 2px; }

    .nai-msg-row {
      display: flex; gap: 9px; padding: 3px 0;
      animation: nai-slide 0.28s ease;
    }
    @keyframes nai-slide {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .nai-msg-row.user { flex-direction: row-reverse; }

    .nai-avatar {
      width: 28px; height: 28px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; flex-shrink: 0; margin-top: 2px;
    }
    .nai-msg-row.bot .nai-avatar {
      background: linear-gradient(135deg, ${p}, ${p}aa);
      box-shadow: 0 3px 8px ${p}44;
    }
    .nai-msg-row.user .nai-avatar {
      background: ${THEME.card};
      border: 1px solid ${THEME.border};
    }

    .nai-msg-wrap { max-width: 78%; display: flex; flex-direction: column; gap: 3px; }
    .nai-msg-row.user .nai-msg-wrap { align-items: flex-end; }

    .nai-bubble {
      padding: 9px 13px; border-radius: 14px;
      font-size: 0.855rem; line-height: 1.55;
      white-space: pre-wrap; word-break: break-word;
    }
    .nai-msg-row.user .nai-bubble {
      background: linear-gradient(135deg, ${p}, ${p}cc);
      color: #fff;
      border-bottom-right-radius: 3px;
      box-shadow: 0 4px 12px ${p}44;
    }
    .nai-msg-row.bot .nai-bubble {
      background: ${THEME.card};
      color: ${THEME.text};
      border: 1px solid ${THEME.border};
      border-bottom-left-radius: 3px;
    }
    /* code blocks inside bot bubble */
    .nai-bubble code {
      background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
      padding: 1px 5px; border-radius: 4px;
      font-family: 'Fira Code', 'Cascadia Code', monospace;
      font-size: 0.82em;
    }
    .nai-bubble pre {
      background: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'};
      padding: 10px; border-radius: 8px; overflow-x: auto;
      margin: 6px 0; font-size: 0.8em;
    }
    .nai-bubble pre code { background: none; padding: 0; }
    .nai-bubble strong { font-weight: 600; }

    .nai-msg-time {
      font-size: 0.63rem; color: ${THEME.textMuted}; padding: 0 3px;
    }

    /* Typing indicator */
    .nai-typing-row {
      display: flex; gap: 9px; align-items: center; padding: 3px 0;
      animation: nai-slide 0.28s ease;
    }
    .nai-typing-bubble {
      background: ${THEME.card}; border: 1px solid ${THEME.border};
      border-radius: 14px; border-bottom-left-radius: 3px;
      padding: 11px 14px; display: flex; gap: 5px; align-items: center;
    }
    .nai-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: ${p}; animation: nai-bounce 1.2s ease-in-out infinite;
    }
    .nai-dot:nth-child(2) { animation-delay: 0.15s; }
    .nai-dot:nth-child(3) { animation-delay: 0.30s; }
    @keyframes nai-bounce {
      0%,60%,100% { transform: translateY(0); opacity: 0.35; }
      30% { transform: translateY(-5px); opacity: 1; }
    }

    /* Input area */
    .nai-input-area {
      padding: 10px 12px 12px;
      background: ${THEME.surface};
      border-top: 1px solid ${THEME.border};
      flex-shrink: 0;
    }
    .nai-input-wrap {
      display: flex; align-items: flex-end; gap: 7px;
      background: ${THEME.inputBg};
      border: 1px solid ${THEME.border};
      border-radius: 14px;
      padding: 7px 7px 7px 12px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .nai-input-wrap:focus-within {
      border-color: ${p}88;
      box-shadow: 0 0 0 3px ${p}18;
    }
    #nai-textarea {
      flex: 1; background: none; border: none;
      color: ${THEME.text}; font-size: 0.855rem; font-family: inherit;
      line-height: 1.5; resize: none; outline: none;
      min-height: 22px; max-height: 120px;
      padding: 2px 0;
    }
    #nai-textarea::placeholder { color: ${THEME.textMuted}; }
    .nai-btn {
      width: 32px; height: 32px; border-radius: 8px;
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; transition: all 0.2s;
      flex-shrink: 0;
    }
    .nai-mic-btn {
      background: ${THEME.elevated}; color: ${THEME.textSub};
    }
    .nai-mic-btn:hover { background: ${THEME.hover}; color: ${THEME.text}; }
    .nai-mic-btn.listening {
      background: rgba(220,38,38,0.2); color: #f87171;
      animation: nai-pulse-mic 1.2s ease-in-out infinite;
    }
    @keyframes nai-pulse-mic {
      0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
      50%      { box-shadow: 0 0 0 6px rgba(220,38,38,0); }
    }
    .nai-send-btn {
      background: linear-gradient(135deg, ${p}, ${p}cc);
      color: #fff;
      box-shadow: 0 4px 10px ${p}44;
    }
    .nai-send-btn:hover:not(:disabled) {
      transform: scale(1.08);
      box-shadow: 0 6px 16px ${p}55;
    }
    .nai-send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

    .nai-input-footer {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 7px; padding: 0 2px;
    }
    .nai-voice-toggle {
      display: flex; align-items: center; gap: 5px;
      font-size: 0.7rem; color: ${THEME.textMuted}; cursor: pointer;
    }
    .nai-voice-toggle input {
      accent-color: ${p}; cursor: pointer;
    }
    .nai-powered {
      font-size: 0.65rem; color: ${THEME.textMuted};
    }
    .nai-powered a { color: ${p}; text-decoration: none; }

    /* Welcome screen */
    #nai-welcome {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 24px 16px; text-align: center;
    }
    .nai-welcome-icon {
      width: 56px; height: 56px; border-radius: 16px;
      background: linear-gradient(135deg, ${p}, ${p}aa);
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; margin-bottom: 14px;
      box-shadow: 0 10px 28px ${p}44;
      animation: nai-float 4s ease-in-out infinite;
    }
    @keyframes nai-float {
      0%,100% { transform: translateY(0); }
      50%      { transform: translateY(-6px); }
    }
    .nai-welcome-title {
      font-size: 1.1rem; font-weight: 700; color: ${THEME.text};
      margin-bottom: 6px;
    }
    .nai-welcome-sub {
      font-size: 0.78rem; color: ${THEME.textSub}; line-height: 1.55;
      max-width: 240px; margin-bottom: 20px;
    }
    .nai-suggestions { display: flex; flex-direction: column; gap: 7px; width: 100%; }
    .nai-suggestion {
      padding: 9px 12px; background: ${THEME.card};
      border: 1px solid ${THEME.border}; border-radius: 10px;
      cursor: pointer; text-align: left;
      font-size: 0.78rem; color: ${THEME.textSub};
      transition: all 0.18s; font-family: inherit;
    }
    .nai-suggestion:hover {
      background: ${THEME.hover}; border-color: ${p}55;
      color: ${THEME.text}; transform: translateX(3px);
    }
    .nai-suggestion-icon { margin-right: 6px; }

    /* Responsive */
    @media (max-width: 440px) {
      #nai-panel { width: calc(100vw - 24px); right: 12px; left: 12px; border-radius: 16px; }
      #nai-sidebar { display: none; }
    }
  `;

  // ─── Render helpers ────────────────────────────────────────────────────

  /** Minimal markdown-ish formatter for bot replies */
  function formatMarkdown(text) {
    return text
      // Code blocks ```...```
      .replace(/```([\w]*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<pre><code>${escHtml(code.trim())}</code></pre>`)
      // Inline code `...`
      .replace(/`([^`]+)`/g, (_, c) => `<code>${escHtml(c)}</code>`)
      // Bold **...**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic *...*
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Line breaks
      .replace(/\n/g, '<br>');
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ─── API call ──────────────────────────────────────────────────────────
  async function callApi(message, history) {
    const res = await fetch(`${CFG.apiUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.reply;
  }

  // ─── State ─────────────────────────────────────────────────────────────
  let conversations = loadHistory();
  let activeId = null;
  let isOpen = false;
  let isLoading = false;
  let voiceEnabled = false;
  let isListening = false;
  let sidebarVisible = true;
  let unreadCount = 0;
  let recognition = null;

  function getActive() { return conversations.find(c => c.id === activeId) || null; }

  function createConversation() {
    const id = uid();
    const conv = {
      id,
      title: 'New chat',
      messages: [{ role: 'bot', text: CFG.greeting, ts: now() }],
      createdAt: now(),
      updatedAt: now(),
    };
    conversations.unshift(conv);
    activeId = id;
    saveHistory(conversations);
    return id;
  }

  function appendMsg(role, text) {
    const conv = getActive();
    if (!conv) return;
    const msg = { role, text, ts: now() };
    conv.messages.push(msg);
    if (role === 'bot' && conv.title === 'New chat') {
      // title is set from first user message — skip
    }
    conv.updatedAt = now();
    saveHistory(conversations);
    return msg;
  }

  function setTitle(id, text) {
    const conv = conversations.find(c => c.id === id);
    if (conv) { conv.title = autoTitle(text); saveHistory(conversations); }
  }

  function deleteConv(id) {
    conversations = conversations.filter(c => c.id !== id);
    if (activeId === id) activeId = null;
    saveHistory(conversations);
  }

  function clearActive() {
    const conv = getActive();
    if (!conv) return;
    conv.messages = [{ role: 'bot', text: CFG.greeting, ts: now() }];
    conv.title = 'New chat';
    conv.updatedAt = now();
    saveHistory(conversations);
    renderMessages();
    renderSidebar();
  }

  function buildApiHistory(msgs) {
    const firstUser = msgs.findIndex(m => m.role === 'user');
    if (firstUser === -1) return [];
    return msgs.slice(firstUser).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));
  }

  // ─── DOM references (filled after mount) ─────────────────────────────
  let shadow, panelEl, launchEl, messagesEl, textareaEl, sendBtn, micBtn,
    badgeEl, sidebarEl, welcomeEl, mainEl, voiceCheck;

  // ─── Render: sidebar list ──────────────────────────────────────────────
  function renderSidebar() {
    const list = shadow.getElementById('nai-hist-list');
    if (!list) return;
    if (conversations.length === 0) {
      list.innerHTML = `<p style="padding:12px 8px;font-size:0.72rem;color:${THEME.textMuted};text-align:center">No chats yet.<br>Start a new conversation!</p>`;
      return;
    }
    const msDay = 86400000, msWeek = msDay * 7;
    const groups = { 'Today': [], 'This week': [], 'Older': [] };
    const n = Date.now();
    for (const c of conversations) {
      const age = n - new Date(c.updatedAt).getTime();
      if (age < msDay) groups['Today'].push(c);
      else if (age < msWeek) groups['This week'].push(c);
      else groups['Older'].push(c);
    }
    let html = '';
    for (const [label, items] of Object.entries(groups)) {
      if (!items.length) continue;
      html += `<div class="nai-hist-label">${label}</div>`;
      for (const c of items) {
        html += `
          <div class="nai-hist-item${c.id === activeId ? ' active' : ''}" data-id="${c.id}">
            <span style="font-size:12px;opacity:0.5">💬</span>
            <span class="nai-hist-title" title="${escHtml(c.title)}">${escHtml(c.title)}</span>
            <button class="nai-hist-del" data-del="${c.id}" title="Delete">✕</button>
          </div>`;
      }
    }
    list.innerHTML = html;

    // Bind clicks
    list.querySelectorAll('.nai-hist-item').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.nai-hist-del')) return;
        selectConv(el.dataset.id);
      });
    });
    list.querySelectorAll('.nai-hist-del').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        deleteConv(el.dataset.del);
        renderSidebar();
        if (!activeId) showWelcome();
        else renderMessages();
      });
    });
  }

  function selectConv(id) {
    activeId = id;
    renderSidebar();
    renderMessages();
    hideWelcome();
  }

  // ─── Render: messages ─────────────────────────────────────────────────
  function renderMessages() {
    const conv = getActive();
    if (!conv) { showWelcome(); return; }
    hideWelcome();
    messagesEl.innerHTML = '';
    for (const msg of conv.messages) {
      messagesEl.appendChild(buildMsgEl(msg));
    }
    scrollBottom();
  }

  function buildMsgEl(msg) {
    const row = document.createElement('div');
    row.className = `nai-msg-row ${msg.role === 'user' ? 'user' : 'bot'}`;
    const avatarChar = msg.role === 'user' ? '👤' : '✦';
    const bubbleContent = msg.role === 'bot'
      ? formatMarkdown(msg.text)
      : escHtml(msg.text);
    row.innerHTML = `
      <div class="nai-avatar">${avatarChar}</div>
      <div class="nai-msg-wrap">
        <div class="nai-bubble">${bubbleContent}</div>
        ${msg.ts ? `<span class="nai-msg-time">${fmtTime(msg.ts)}</span>` : ''}
      </div>`;
    return row;
  }

  function addMsgToDOM(msg) {
    const el = buildMsgEl(msg);
    messagesEl.appendChild(el);
    scrollBottom();
  }

  function showTyping() {
    const row = document.createElement('div');
    row.className = 'nai-typing-row';
    row.id = 'nai-typing';
    row.innerHTML = `
      <div class="nai-avatar" style="background:linear-gradient(135deg,${p},${p}aa);box-shadow:0 3px 8px ${p}44;width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">✦</div>
      <div class="nai-typing-bubble">
        <div class="nai-dot"></div><div class="nai-dot"></div><div class="nai-dot"></div>
      </div>`;
    messagesEl.appendChild(row);
    scrollBottom();
  }

  function hideTyping() {
    shadow.getElementById('nai-typing')?.remove();
  }

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ─── Welcome screen ───────────────────────────────────────────────────
  function showWelcome() {
    welcomeEl.style.display = 'flex';
    messagesEl.style.display = 'none';
    // Update sidebar header conv title
    const titleEl = shadow.getElementById('nai-chat-title');
    if (titleEl) titleEl.textContent = CFG.botName;
  }

  function hideWelcome() {
    welcomeEl.style.display = 'none';
    messagesEl.style.display = 'flex';
    const conv = getActive();
    const titleEl = shadow.getElementById('nai-chat-title');
    if (titleEl && conv) titleEl.textContent = conv.title;
  }

  // ─── Send message flow ────────────────────────────────────────────────
  async function sendMsg(textOverride) {
    const text = (textOverride ?? textareaEl.value).trim();
    if (!text || isLoading) return;

    // Ensure we have an active conversation
    if (!activeId) {
      createConversation();
      hideWelcome();
    }

    // If it's the first user message, use it as the title
    const conv = getActive();
    if (conv.title === 'New chat') setTitle(activeId, text);

    const historyBefore = buildApiHistory(conv.messages);
    const userMsg = appendMsg('user', text);
    addMsgToDOM(userMsg);
    textareaEl.value = '';
    resizeTextarea();

    isLoading = true;
    sendBtn.disabled = true;
    showTyping();

    // Update sidebar title
    renderSidebar();
    const titleEl = shadow.getElementById('nai-chat-title');
    if (titleEl) titleEl.textContent = getActive()?.title || CFG.botName;

    try {
      const reply = await callApi(text, historyBefore);
      hideTyping();
      const botMsg = appendMsg('bot', reply);
      addMsgToDOM(botMsg);
      if (voiceEnabled) speakText(reply);
    } catch {
      hideTyping();
      const errMsg = appendMsg('bot', '⚠️ Could not reach the server. Please check your backend.');
      addMsgToDOM(errMsg);
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      // Show unread badge if panel closed
      if (!isOpen) {
        unreadCount++;
        badgeEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badgeEl.classList.add('visible');
      }
    }
  }

  // ─── Voice ────────────────────────────────────────────────────────────
  function initVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { micBtn.style.display = 'none'; return; }
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onstart = () => { isListening = true; micBtn.classList.add('listening'); micBtn.title = 'Listening…'; };
    recognition.onend   = () => { isListening = false; micBtn.classList.remove('listening'); micBtn.title = 'Voice input'; };
    recognition.onerror = () => { isListening = false; micBtn.classList.remove('listening'); };
    recognition.onresult = e => {
      const t = e.results[0][0].transcript;
      textareaEl.value = t;
      resizeTextarea();
      sendMsg(t);
    };
  }

  function toggleMic() {
    if (!recognition) return;
    if (isListening) { recognition.stop(); }
    else { recognition.start(); }
  }

  function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 1;
    window.speechSynthesis.speak(u);
  }

  // ─── Textarea auto-resize ─────────────────────────────────────────────
  function resizeTextarea() {
    textareaEl.style.height = 'auto';
    textareaEl.style.height = Math.min(textareaEl.scrollHeight, 120) + 'px';
  }

  // ─── Toggle panel open/close ──────────────────────────────────────────
  function togglePanel() {
    isOpen = !isOpen;
    panelEl.classList.toggle('open', isOpen);
    launchEl.classList.toggle('open', isOpen);
    if (isOpen) {
      unreadCount = 0;
      badgeEl.classList.remove('visible');
      textareaEl.focus();
      scrollBottom();
    }
  }

  // ─── Toggle sidebar ───────────────────────────────────────────────────
  function toggleSidebar() {
    sidebarVisible = !sidebarVisible;
    sidebarEl.classList.toggle('hidden', !sidebarVisible);
  }

  // ─── Build DOM & inject into page ────────────────────────────────────
  function mount() {
    const host = document.createElement('div');
    host.id = 'nexusai-widget-host';
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483640;';
    document.body.appendChild(host);

    shadow = host.attachShadow({ mode: 'open' });

    // Inject styles
    const style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);

    // ── Launch button ──
    launchEl = document.createElement('button');
    launchEl.id = 'nai-launch';
    launchEl.title = `Chat with ${CFG.botName}`;
    launchEl.setAttribute('aria-label', `Open ${CFG.botName} chat`);
    launchEl.innerHTML = `
      <svg class="chat-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
      <svg class="close-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>`;
    badgeEl = document.createElement('div');
    badgeEl.id = 'nai-badge';
    launchEl.appendChild(badgeEl);
    shadow.appendChild(launchEl);
    launchEl.addEventListener('click', togglePanel);

    // ── Panel ──
    panelEl = document.createElement('div');
    panelEl.id = 'nai-panel';
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-label', `${CFG.botName} chat window`);
    shadow.appendChild(panelEl);

    // ── Sidebar ──
    sidebarEl = document.createElement('div');
    sidebarEl.id = 'nai-sidebar';
    sidebarEl.innerHTML = `
      <div class="nai-sidebar-head">
        <div class="nai-logo">
          <div class="nai-logo-icon">✦</div>
          <span class="nai-logo-name">${escHtml(CFG.botName)}</span>
        </div>
        <button class="nai-new-btn" id="nai-new-btn">＋ New chat</button>
      </div>
      <nav class="nai-history" aria-label="Conversation history">
        <div id="nai-hist-list"></div>
      </nav>
      <div class="nai-sidebar-foot">Conversations saved locally</div>`;
    panelEl.appendChild(sidebarEl);

    // ── Main ──
    mainEl = document.createElement('div');
    mainEl.id = 'nai-main';
    panelEl.appendChild(mainEl);

    // Header
    mainEl.innerHTML = `
      <header class="nai-header">
        <button class="nai-header-toggle" id="nai-sidebar-toggle" title="Toggle history" aria-label="Toggle conversation history">☰</button>
        <div class="nai-header-avatar">✦</div>
        <div class="nai-header-info">
          <div class="nai-header-name" id="nai-chat-title">${escHtml(CFG.botName)}</div>
          <div class="nai-header-status"><span class="nai-status-dot"></span>Online</div>
        </div>
        <button class="nai-header-clear" id="nai-clear-btn" title="Clear conversation">🗑</button>
      </header>`;

    // Welcome screen
    welcomeEl = document.createElement('div');
    welcomeEl.id = 'nai-welcome';
    welcomeEl.innerHTML = `
      <div class="nai-welcome-icon">✦</div>
      <div class="nai-welcome-title">Hi there! 👋</div>
      <div class="nai-welcome-sub">I'm ${escHtml(CFG.botName)}, your AI assistant. Ask me anything or pick a suggestion below.</div>
      <div class="nai-suggestions">
        <button class="nai-suggestion" data-prompt="Explain quantum computing in simple terms">
          <span class="nai-suggestion-icon">🧠</span>Explain a complex concept
        </button>
        <button class="nai-suggestion" data-prompt="Write me a professional email template for following up after a job interview">
          <span class="nai-suggestion-icon">✍️</span>Write something for me
        </button>
        <button class="nai-suggestion" data-prompt="Give me 5 creative startup ideas in the AI space">
          <span class="nai-suggestion-icon">💡</span>Brainstorm ideas
        </button>
      </div>`;
    mainEl.appendChild(welcomeEl);

    // Messages
    messagesEl = document.createElement('div');
    messagesEl.id = 'nai-messages';
    messagesEl.style.display = 'none';
    mainEl.appendChild(messagesEl);

    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'nai-input-area';
    inputArea.innerHTML = `
      <div class="nai-input-wrap">
        <textarea id="nai-textarea" rows="1" placeholder="${escHtml(CFG.placeholder)}" aria-label="Type your message"></textarea>
        <div style="display:flex;gap:5px;flex-shrink:0;align-items:center">
          <button class="nai-btn nai-mic-btn" id="nai-mic-btn" title="Voice input" aria-label="Voice input">🎤</button>
          <button class="nai-btn nai-send-btn" id="nai-send-btn" title="Send" aria-label="Send message" disabled>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="nai-input-footer">
        <label class="nai-voice-toggle">
          <input type="checkbox" id="nai-voice-check"> Read replies aloud
        </label>
        <span class="nai-powered">Powered by <a href="#" style="color:${p}">Gemini</a></span>
      </div>`;
    mainEl.appendChild(inputArea);

    // Cache refs
    textareaEl = shadow.getElementById('nai-textarea');
    sendBtn     = shadow.getElementById('nai-send-btn');
    micBtn      = shadow.getElementById('nai-mic-btn');
    voiceCheck  = shadow.getElementById('nai-voice-check');

    // ── Event listeners ──

    // New chat
    shadow.getElementById('nai-new-btn').addEventListener('click', () => {
      createConversation();
      renderSidebar();
      renderMessages();
    });

    // Sidebar toggle
    shadow.getElementById('nai-sidebar-toggle').addEventListener('click', toggleSidebar);

    // Clear
    shadow.getElementById('nai-clear-btn').addEventListener('click', clearActive);

    // Suggestions
    welcomeEl.querySelectorAll('.nai-suggestion').forEach(btn => {
      btn.addEventListener('click', () => sendMsg(btn.dataset.prompt));
    });

    // Textarea
    textareaEl.addEventListener('input', () => {
      resizeTextarea();
      sendBtn.disabled = !textareaEl.value.trim() || isLoading;
    });
    textareaEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    });

    // Send
    sendBtn.addEventListener('click', () => sendMsg());

    // Mic
    micBtn.addEventListener('click', toggleMic);

    // Voice toggle
    voiceCheck.addEventListener('change', e => { voiceEnabled = e.target.checked; });

    // Init voice
    initVoice();

    // If there are existing conversations, show the most recent one
    if (conversations.length > 0) {
      activeId = conversations[0].id;
      renderSidebar();
      renderMessages();
    } else {
      showWelcome();
    }
  }

  // ─── Boot ─────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // ─── Public API ───────────────────────────────────────────────────────
  window.NexusAI = {
    open:  () => { if (!isOpen) togglePanel(); },
    close: () => { if (isOpen)  togglePanel(); },
    send:  (msg) => sendMsg(msg),
  };

})();
