import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api || https://ai-chatbot-server-mdf13t104-hiteshrao15s-projects.vercel.app/api";

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
