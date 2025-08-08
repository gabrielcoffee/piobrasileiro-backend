import express from 'express';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

router.get('/perfil', authMiddleware, getCommonPerfil);
router.put('/perfil', authMiddleware, updateCommonPerfil)

router.get('/weekmeals', authMiddleware, getWeekMeals);
router.post('/refeicao',  authMiddleware, createRefeicao);
router.put('/refeicao/:id', authMiddleware, updateRefeicao);

export default router;