import express from 'express';
import authMiddleware from '../middleware/authMiddleware';
import adminMiddleware from '../middleware/adminMiddleware';
import { createUserAndPerfil, activateUsers, deactivateUsers, deleteUsers, getUsersAndPerfil, getUserAndPerfil, updateUserAndPerfil } from '../controllers/adminControllers';

const router = express.Router();

// CRUD for user_auth and perfil
router.get('/users', authMiddleware, adminMiddleware, getUsersAndPerfil);
router.get('/users/:userId', authMiddleware, adminMiddleware, getUserAndPerfil);
router.post('/users', authMiddleware, adminMiddleware, createUserAndPerfil);
router.put('/users/:userId', authMiddleware, adminMiddleware, updateUserAndPerfil);
// Multiple users actions
router.post('/activate_users', authMiddleware, adminMiddleware, activateUsers);
router.post('/deactivate_users', authMiddleware, adminMiddleware, deactivateUsers);
router.post('/users', authMiddleware, adminMiddleware, deleteUsers);

// CRUD for refeicao
router.get('/meals', authMiddleware, adminMiddleware, getMeals);
router.get('/meals/:mealId', authMiddleware, adminMiddleware, getMeal);
router.post('/meals', authMiddleware, adminMiddleware, createMeal);
router.put('/meals/:mealId', authMiddleware, adminMiddleware, updateMeal);
router.delete('/meals/:mealId', authMiddleware, adminMiddleware, deleteMeal);

// CRUD for hospedagem
router.get('/accommodations', authMiddleware, adminMiddleware, getAccommodations);
router.get('/accommodations/:accommodationId', authMiddleware, adminMiddleware, getAccommodation);
router.post('/accommodations', authMiddleware, adminMiddleware, createAccommodation);
router.put('/accommodations/:accommodationId', authMiddleware, adminMiddleware, updateAccommodation);
router.delete('/accommodations/:accommodationId', authMiddleware, adminMiddleware, deleteAccommodation);

// CRUD for quarto
router.get('/rooms', authMiddleware, adminMiddleware, getRooms);

// CRUD for hospede
router.get('/guests', authMiddleware, adminMiddleware, getGuests);
router.post('/guests', authMiddleware, adminMiddleware, createGuest);
router.put('/guests/:guestId', authMiddleware, adminMiddleware, updateGuest);
router.delete('/guests/:guestId', authMiddleware, adminMiddleware, deleteGuest);

// CRUD for solicitacao
router.get('/requests', authMiddleware, adminMiddleware, getRequests);
router.put('/requests/:requestId', authMiddleware, adminMiddleware, visualizeRequest);

export default router;