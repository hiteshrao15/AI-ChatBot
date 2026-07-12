function HeroSection() {
  const handleOpenChat = () => {
    // Dispatch a global custom event to trigger the widget opening
    window.dispatchEvent(new CustomEvent("open-nexus-chat"));
  };

  return (
    <section className="hero">
      <h1>Welcome to CampusAI</h1>
      <p className="hero-subtitle">
        An intelligent conversational assistant powered by Google Gemini and Node.js. 
        Supports text messaging, voice transcription, text-to-speech, and local chat history.
      </p>

      <div className="hero-chat-box" onClick={handleOpenChat}>
        <div className="hero-chat-icon">💬</div>
        <h2>Talk to the Assistant</h2>
        <p>Click here to open the chat widget below</p>
      </div>
    </section>
  );
}

export default HeroSection;
