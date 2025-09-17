import pool from "../db.js";

export async function createRequest(req, res) {
    const { nome, num_telefone, email, data_chegada, data_saida, num_pessoas } = req.body;

    if (!nome || !num_telefone || !email || !data_chegada || !data_saida || !num_pessoas) {
        return res.status(400).json({
            message: 'All fields are required'
        });
    }
    console.log('not empty');

    //check if data_chegada is before data_saida
    if (data_chegada > data_saida) {
        return res.status(400).json({
            message: 'Data de chegada deve ser antes da data de saída'
        });
    }
    console.log('data_chegada is before data_saida');

    // check if num_pessoas is greater than 0
    if (num_pessoas <= 0) {
        return res.status(400).json({
            message: 'Número de pessoas deve ser maior que 0'
        });
    }
    console.log('num_pessoas is greater than 0');

    // check if email is valid
    if (!email.includes('@')) {
        return res.status(400).json({
            message: 'Email inválido'
        });
    }
    console.log('email is valid');

    // check if none of the fields are over 200 characters
    if (nome.length > 200 || num_telefone.length > 20 || email.length > 200) {
        return res.status(400).json({
            message: 'Fields must be less than 200 characters'
        });
    }
    console.log('none of the fields are over 200 characters');

    try {
        const result = await pool.query(
            `INSERT INTO solicitacao (nome, num_telefone, email, data_chegada, data_saida, num_pessoas)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [nome, num_telefone, email, data_chegada, data_saida, num_pessoas]
        );

        return res.status(200).json({
            message: 'Request created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Failed to create request'
        });
    }
}