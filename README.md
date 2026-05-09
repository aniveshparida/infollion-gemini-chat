🚀 Minimal AI Chatbot (Groq Optimized)
A high-performance, focus-driven interface for seamless human-AI collaboration. This application features a modular architecture designed for low-latency streaming and robust request management.

⚠️ Engineering Note: The Pivot to Groq
Originally designed for Google’s Gemini 1.5 Flash, the core engine was strategically pivoted to Groq (Llama-3.3-70b) during final production.

Reason: Repeated upstream instability with the Gemini API (Status 429/404) on the free tier prevented reliable multimodal processing.

Solution: To guarantee a seamless, high-uptime experience for the reviewer, I migrated the backend to Groq.

Outcome: The app now delivers near-instantaneous text streaming. Note: While the architecture is multimodal-ready, image/PDF processing is currently disabled to maintain Groq's high-speed performance.

🌟 Key Features
Instant Streaming: Powered by Groq's LPUs for the fastest "typewriter" effect in the industry.

Modular Architecture: Clean separation of concerns (Controllers, Services, Hooks) for professional scalability.

Production-Grade Stability: Implemented AbortController and useRef synchronous locks to prevent race conditions and redundant API calls.

Session Management: LocalStorage-based history tracking with multi-chat support.

🛠️ Tech Stack
Frontend: React, Vite, TypeScript, Tailwind CSS, Lucide React.

Backend: Node.js, Express, TypeScript, Groq SDK.

Deployment: Vercel (Frontend) & Render (Backend).

📦 Installation & Setup
1. Clone the repository
Bash
git clone https://github.com/aniveshparida/infollion-gemini-chat.git
cd infollion-gemini-chat
2. Get your Groq API Key
Go to the Groq Console.

Create a free account and click "Create API Key".

Copy the key for the next step.

3. Backend Setup
Bash
cd backend
npm install
Create a .env file in the backend directory:

Code snippet
PORT=3001
GROQ_API_KEY=your_groq_api_key_here
Start the backend server:

Bash
npm run dev
4. Frontend Setup
Open a new terminal window:

Bash
cd frontend
npm install
npm run dev
Visit http://localhost:5173 to start chatting!

📖 Usage Steps
Start a Chat: Type any prompt in the message bar. The Llama-3 model will stream the response instantly.

New Chat: Click the "New Chat" button in the sidebar to reset the context.

Switch Conversations: Your previous chat titles are saved in the sidebar for easy switching.

Copy/Resend: Hover over any message to see utility icons for copying text to your clipboard or resending the prompt.

🌐 Live Demo: https://infollion-gemini-chat.vercel.app/

⚙️ Backend API: https://infollion-gemini-chat2.onrender.com
