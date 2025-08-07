import express from 'express';
import { LoginUser, RegisterUser } from '../controllers/authController.js';

const router = express.Router();

router.get('/', (req, res) => {
    console.log('authRoutes');
    res.send('authRoutes');
});

router.post('/register', RegisterUser);

export default router;