import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "https://ai-chatbot-server-2jfxgzk20-hiteshrao15s-projects.vercel.app/api"
);

/**
 * Sends a message + conversation history to the backend and
 * returns the assistant's reply text.
 */
export async function sendMessage(message, history) {
  const response = await axios.post(`${API_BASE_URL}/chat`, {
    message,
    history,
  });
  return response.data.reply;
}
