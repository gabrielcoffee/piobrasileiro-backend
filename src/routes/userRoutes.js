import express from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { getCommonPerfil } from '../controllers/userControllers';

const router = express.Router();

router.get('/perfil', authMiddleware, getCommonPerfil);
router.put('/perfil', authMiddleware, updateCommonPerfil)

router.put('/perfil/senha', authMiddleware, updateUserPassword);

router.get('/weekmeals', authMiddleware, getWeekMeals);
router.post('/refeicao',  authMiddleware, createRefeicao);
router.put('/refeicao/:id', authMiddleware, updateRefeicao);

export default router;