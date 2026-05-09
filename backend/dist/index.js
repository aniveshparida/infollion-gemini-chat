import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Load env vars before any route imports so controllers see the API key immediately
dotenv.config();
import chatRoutes from './routes/chatRoutes.js';
const app = express();
const port = process.env.PORT || 3001;
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
// All chat endpoints live under /api/chat — the router handles sub-paths like /reset
app.use('/api/chat', chatRoutes);
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map