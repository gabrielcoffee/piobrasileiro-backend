import express from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { getCommonPerfil, getUserMeals, updatePerfilName, updateUserPassword, upsertMeals } from '../controllers/userControllers';

const router = express.Router();

// Getting user/profile data
router.get('/perfil', authMiddleware, getCommonPerfil);

// Updating user/profile data
router.put('/perfil_nome', authMiddleware, updatePerfilName)
router.put('/perfil/senha', authMiddleware, updateUserPassword);

// Getting meal data
router.get('/weekmeals', authMiddleware, getUserMeals);
router.post('/refeicao',  authMiddleware, upsertMeals);

export default router;