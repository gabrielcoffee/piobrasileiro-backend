import express from 'express';
import { emailForgotPassword, LoginUser } from '../controllers/authControllers.js';

const router = express.Router();

router.post('/login', LoginUser);
router.post('/forgot-password', emailForgotPassword);

export default router;