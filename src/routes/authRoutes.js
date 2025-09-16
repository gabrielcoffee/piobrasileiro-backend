import express from 'express';
import { forgotPassword, LoginUser, resetPassword } from '../controllers/authControllers.js';

const router = express.Router();

router.post('/login', LoginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;