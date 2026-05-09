# Minimal Gemini Chatbot
 A minimal, focus-driven interface for seamless human-AI collaboration.

A full-stack, minimal web-based chatbot powered by Google's Gemini API (`gemini-1.5-flash`). This application supports natural text conversation, document extraction (PDF/TXT), image understanding (PNG/JPG), and session-based context management.

## 🚀 Features
- **Multimodal Chat:** Send text, documents, and images in a single thread.
- **Context Management:** The bot remembers the current conversation history.
- **Session Reset:** Easily start a fresh chat with zero previous context.
- **In-Memory Storage:** Fast, lightweight backend requiring no database setup.
- **Modern UI:** Responsive, dark-mode interface built with Tailwind CSS.

## 🛠️ Tech Stack
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Axios, Lucide React.
- **Backend:** Node.js, Express, TypeScript, Multer (memory storage), `@google/generative-ai`.

## 📦 Installation & Setup

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/aniveshparida/infollion-gemini-chat.git
cd infollion-gemini-chat
\`\`\`

### 2. Backend Setup
\`\`\`bash
cd backend
npm install
\`\`\`
Create a `.env` file in the `backend` directory and add your Google Gemini API key:
\`\`\`env
PORT=3001
GEMINI_API_KEY=your_api_key_here
\`\`\`
Start the development server:
\`\`\`bash
npm run dev
\`\`\`

### 3. Frontend Setup
Open a new terminal window:
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

> **Note:** Before running the frontend, open `frontend/src/api/chatApi.ts` and ensure the `API_URL` constant matches your environment. Use `http://localhost:3001/api` for local development or your Render URL for the deployed version.
> Note: This app uses the Gemini Free Tier. If you encounter a 429 error, please wait 60 seconds for the rate limit to reset.

Visit `http://localhost:5173` in your browser to use the application.

🌐 Live Demo: https://infollion-gemini-chat.vercel.app/
⚙️ Backend API: https://infollion-gemini-chat2.onrender.com/api
