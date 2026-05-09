import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Load environment variables before importing any routes/controllers
dotenv.config();
import chatRoutes from './routes/chatRoutes.js';
const app = express();
const port = process.env.PORT || 3001;
// Middlewares
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
// Mount our deconstructed chat routes
app.use('/api/chat', chatRoutes);
app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map