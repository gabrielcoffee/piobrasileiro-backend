const express = require('express');
const db = require('./src/queries');
const cors = require('cors');
const app = express();  
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routes
app.get('/', (req, res) => {
    res.status(200).json({message: "api working"});
});

app.get('/alunos', db.getAlunos);
app.get('/alunos/:id', db.getAlunoById);
app.post('/alunos', db.createAluno);

app.use((req, res, next) => {
    const error = new Error('Something went wrong');
    next(error);
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).send('Internal Server Error');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to see the API`);
}); 