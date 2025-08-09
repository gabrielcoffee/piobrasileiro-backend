import express from 'express';
import { LoginUser } from '../controllers/authControllers.js';

const router = express.Router();

router.post('/login', LoginUser);

export default router;