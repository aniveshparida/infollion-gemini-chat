import { Router } from 'express';
import multer from 'multer';
import { handleChatGeneration, handleChatReset } from '../controllers/chatController.js';
const router = Router();
const upload = multer();
// POST /  → main chat generation (accepts optional document + image via multipart)
// POST /reset → clears chat state on the frontend side
router.post('/', upload.fields([{ name: 'document', maxCount: 1 }, { name: 'image', maxCount: 1 }]), handleChatGeneration);
router.post('/reset', handleChatReset);
export default router;
//# sourceMappingURL=chatRoutes.js.map