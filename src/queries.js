require('dotenv').config();
const database = require('./libraries/database');

const getAlunos = (req, res) => {
    database.query('SELECT * FROM aluno', (error, results) => {
        if (error) {
            return res.status(500).json({
                message: "Erro ao buscar alunos",
            })
        }
        res.status(200).json(results.rows)
    })
}

const getAlunoById = (req, res) => {
    const { id } = req.params;

    pool.query('select * from aluno where id = $1', [id], (error, results) => {
        if (error) {
            return res.status(500).json({
                message: "Erro ao buscar aluno por id",
            })
        }
        
        res.status(200).json(results.rows)
    })
}

const createAluno = (req, res) => {
    const { nome } = req.body;
    database.query
}   

module.exports = {
    getAlunos,
    getAlunoById,
    createAluno,
}