import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { createRequest } from './controllers/requestController.js';
import './mailing/cron.js';
import { SendReminderEmail } from './mailing/mailFunctions.js';

const app = express();  
const PORT = process.env.PORT || 3003;

// Initial Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(cors()); // REMOVER ANTES DE PRODUÇÃO


// Routes
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);

app.post(
    '/request',
    createRequest
);

app.listen(PORT, () => {
    console.log(`Server is running on PORT: ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the API`);
}); 