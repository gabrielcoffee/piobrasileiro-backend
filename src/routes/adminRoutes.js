import express from 'express';
import authMiddleware from '../middleware/authMiddleware';
import adminMiddleware from '../middleware/adminMiddleware';
import { CreatePerfil, CreateUser, RegisterUser } from '../controllers/adminControllers';

const router = express.Router();

router.post('/user',   authMiddleware, adminMiddleware, CreateUser);
router.post('/perfil', authMiddleware, adminMiddleware, CreatePerfil);

export default router;