import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { createRequest } from './controllers/requestController.js';
import { createPreReserva } from './controllers/formsController.js';
import formsSecretMiddleware from './middleware/formsSecretMiddleware.js';
import './mailing/cron.js';
import { SendWelcomeEmailToAllUsersNow } from './mailing/mailFunctions.js';

const app = express();  
const PORT = process.env.PORT || 3003;

// Initial Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: ['https://piobrasileiroapp.com', 'http://localhost:3000'],
    credentials: true
}));

// Routes
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);

app.post(
    '/request',
    cors({ origin: 'https://piobrasileiro.com'}),
    createRequest
);

// Public ingestion from Google Forms (Apps Script onFormSubmit).
// Server-side request, no browser Origin; secret header is the real gate.
app.post(
    '/forms/hospedagem',
    cors(),
    formsSecretMiddleware,
    createPreReserva
);

app.listen(PORT, () => {
    console.log(`Server is running on PORT: ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the API`);
}); 