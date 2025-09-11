import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { createGuestMeal, deleteGuestMeal, getCommonPerfil, getGuestMeals, getUserMeals, updatePerfilAvatar, updatePerfilName, updateUserPassword, upsertMeals } from '../controllers/userControllers.js';
import multerMiddleware from '../middleware/multerMiddleware.js';

const router = express.Router();

// Getting user/profile data
router.get('/perfil', authMiddleware, getCommonPerfil);

// Updating user/profile data
router.put('/perfil/nome', authMiddleware, updatePerfilName)
router.put('/perfil/senha', authMiddleware, updateUserPassword);
router.put('/perfil/avatar', authMiddleware, multerMiddleware, updatePerfilAvatar);

// Getting meal data
router.get('/weekmeals', authMiddleware, getUserMeals);
router.post('/weekmeals',  authMiddleware, upsertMeals);

// Geeting guest meals data
router.get('/guestmeals', authMiddleware, getGuestMeals);
router.post('/guestmeals', authMiddleware, createGuestMeal);
router.delete('/guestmeals/:id', authMiddleware, deleteGuestMeal);

export default router;