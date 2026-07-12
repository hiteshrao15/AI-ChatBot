# AI Chatbot Demo (React + Node.js + Gemini API)

A simple, workable demo of an AI chatbot:
- Hero section with a big chat box
- Click it to open a chat window
- Type or speak your message (voice input via browser Web Speech API)
- Replies come from Google's Gemini API through a Node/Express backend
- Replies can optionally be read aloud (browser text-to-speech)

This is a teaching/demo project — not production hardened.

## Folder structure

```
ai-chatbot-demo/
├── client/     React app (Vite)
└── server/     Node/Express backend
```

## 1. Get a Gemini API key

Go to https://aistudio.google.com/apikey and create a free API key.

## 2. Set up the server

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and paste your key:

```
GEMINI_API_KEY=your_real_key_here
PORT=5000
```

Start the server:

```bash
npm run dev
```

You should see: `Server running on http://localhost:5000`

## 3. Set up the client

Open a new terminal:

```bash
cd client
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## 4. Try it out

1. You'll see a hero section with a big "Talk to the AI Assistant" box.
2. Click it — a chat window opens in the bottom-right corner.
3. Type a message and press Enter / click Send, OR click the 🎤 mic button and speak.
4. The assistant's reply appears in the chat, and (if "Read replies aloud" is checked) is spoken back to you.

## Notes for demoing to students

- Voice input (🎤) uses the browser's built-in SpeechRecognition. It works best in **Chrome or Edge**. Firefox/Safari support is limited.
- The Gemini API key lives only on the server (`server/.env`) — it is never exposed to the browser. This is intentional and worth pointing out as a security best practice.
- Conversation history is kept in React state and sent with every request, so Gemini has context of the conversation (see `buildHistory` in `ChatWindow.jsx` and `startChat` in `gemini.service.js`).
- Model used: `gemini-2.5-flash` (fast + cheap, good for demos). You can change this in `server/src/services/gemini.service.js`.

## Common issues

- **"GEMINI_API_KEY is not set" warning**: you forgot to create `server/.env` from `.env.example`.
- **Chat says "couldn't reach the server"**: make sure the server is running on port 5000 before using the client.
- **Mic button does nothing**: your browser doesn't support SpeechRecognition, or you denied microphone permission — check the address bar for a blocked mic icon.
