/**
 * WelcomeScreen — shown when no conversation is active.
 * Displays suggestion cards the user can click to start chatting.
 */
function WelcomeScreen({ onStartChat }) {
  const suggestions = [
    {
      icon: "🧠",
      title: "Explain a concept",
      desc: "Break down quantum computing in simple terms",
      prompt: "Explain quantum computing in simple terms",
    },
    {
      icon: "✍️",
      title: "Write something",
      desc: "Draft a professional email for a job application",
      prompt: "Draft a professional email for a software job application",
    },
    {
      icon: "💡",
      title: "Brainstorm ideas",
      desc: "Give me 10 unique startup ideas in the AI space",
      prompt: "Give me 10 unique startup ideas in the AI space",
    },
    {
      icon: "🔍",
      title: "Analyze & review",
      desc: "Review my code and suggest improvements",
      prompt: "I'll paste some code — review it and suggest improvements.",
    },
  ];

  return (
    <div className="welcome-screen">
      <div className="welcome-icon-wrap">✦</div>
      <h1 className="welcome-title">How can I help you today?</h1>
      <p className="welcome-subtitle">
        Start a new conversation or pick one from your history. I can help
        with writing, coding, research, analysis, and much more.
      </p>

      <div className="welcome-suggestions">
        {suggestions.map((s) => (
          <div
            key={s.title}
            id={`suggestion-${s.title.toLowerCase().replace(/\s+/g, "-")}`}
            className="suggestion-card"
            role="button"
            tabIndex={0}
            onClick={() => onStartChat(s.prompt)}
            onKeyDown={(e) => e.key === "Enter" && onStartChat(s.prompt)}
          >
            <div className="suggestion-card-icon">{s.icon}</div>
            <div className="suggestion-card-title">{s.title}</div>
            <div className="suggestion-card-desc">{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WelcomeScreen;
