import dotenv from "dotenv";

// Loading .env here, as the very first thing this module does, and
// importing this module first (before any other local files) in app.js
// guarantees env vars are set before anything else in the app runs.
dotenv.config();
