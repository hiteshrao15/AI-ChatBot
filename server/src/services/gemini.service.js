import { GoogleGenAI } from "@google/genai";

// Created lazily (on first use) rather than at import time, so we don't
// read process.env.GEMINI_API_KEY before dotenv.config() has run.
let ai;
function getClient() {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

/**
 * Sends the user's message to Gemini, along with prior conversation
 * history, and returns the model's reply as plain text.
 *
 * history format expected from the client:
 * [
 *   { role: "user", parts: [{ text: "hi" }] },
 *   { role: "model", parts: [{ text: "hello!" }] },
 *   ...
 * ]
 */
export async function getChatResponse(history = [], userMessage) {
  const chat = getClient().chats.create({
    model: "gemini-2.5-flash",
    history,
  });

  const response = await chat.sendMessage({ message: userMessage });
  return response.text;
}
