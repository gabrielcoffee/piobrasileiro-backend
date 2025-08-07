import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';

const app = express();  
const PORT = process.env.PORT || 3003;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routes
app.get('/', (req, res) => {
    console.log('Hello World');
    res.send('Hello World');
});

app.use('/auth', authRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on PORT: ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the API`);
}); 