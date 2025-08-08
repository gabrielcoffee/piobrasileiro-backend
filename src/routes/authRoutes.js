import express from 'express';
import { LoginUser, RegisterUser } from '../controllers/authControllers.js';

const router = express.Router();

router.post('/login', LoginUser);

export default router;