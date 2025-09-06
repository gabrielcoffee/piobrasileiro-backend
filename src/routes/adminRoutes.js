import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';
import { 
  createUserAndPerfil,
  toggleActiveUser,
  deactivateUsers,
  deleteUsers,
  getUsersAndPerfil,
  getUserAndPerfil,
  updateUserAndPerfil,
  getMeals,
  getMeal,
  createMeal,
  updateMeal,
  deleteMeal,
  getAccommodations,
  getAccommodation,
  createAccommodation,
  updateAccommodation,
  deleteAccommodation,
  getRooms,
  getGuests,
  createGuest,
  updateGuest,
  deleteGuest,
  getRequests,
  visualizeRequest,
  updateUserAvatar,
  getProfile,
  updateProfile,
  createGuestMeal,
  deleteGuestMeal,
  editGuestMeal
} from '../controllers/adminControllers.js';
import multerMiddleware from '../middleware/multerMiddleware.js';

const router = express.Router();

// Current logged admin user profile
router.get('/profile', authMiddleware, adminMiddleware, getProfile);
router.put('/profile', authMiddleware, adminMiddleware, updateProfile);

// CRUD for user_auth and perfil
router.get('/users', authMiddleware, adminMiddleware, getUsersAndPerfil);
router.get('/users/:userId', authMiddleware, adminMiddleware, getUserAndPerfil);
router.post('/users', authMiddleware, adminMiddleware, createUserAndPerfil);
router.put('/users/:userId', authMiddleware, adminMiddleware, updateUserAndPerfil);
router.put('/users/:userId/avatar', authMiddleware, adminMiddleware, multerMiddleware, updateUserAvatar);

// Multiple users actions
router.post('/users/toggle-active', authMiddleware, adminMiddleware, toggleActiveUser);
router.post('/users/deactivate', authMiddleware, adminMiddleware, deactivateUsers);
router.delete('/users/delete', authMiddleware, adminMiddleware, deleteUsers);

// CRUD for refeicao
router.get('/meals', authMiddleware, adminMiddleware, getMeals);
router.get('/meals/:mealId', authMiddleware, adminMiddleware, getMeal);
router.post('/meals', authMiddleware, adminMiddleware, createMeal);
router.put('/meals/:mealId', authMiddleware, adminMiddleware, updateMeal);
router.delete('/meals/:mealId', authMiddleware, adminMiddleware, deleteMeal);
router.delete('/guestmeals/:mealId', authMiddleware, adminMiddleware, deleteGuestMeal);
router.post('/guestmeals', authMiddleware, adminMiddleware, createGuestMeal);
router.put('/guestmeals/:mealId', authMiddleware, adminMiddleware, editGuestMeal);

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