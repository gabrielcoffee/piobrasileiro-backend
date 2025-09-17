import pool from "../db.js";

export async function createRequest(req, res) {
    const { nome, telefone, nacionalidade, email, data_de_inicio, data_de_fim, quantidade_adultos, quantidade_criancas, voce_e_padre } = req.body;

    console.log('nome:', nome);
    console.log('telefone:', telefone);
    console.log('nacionalidade:', nacionalidade);
    console.log('email:', email);
    console.log('data_de_inicio:', data_de_inicio);
    console.log('data_de_fim:', data_de_fim);
    console.log('quantidade_adultos:', quantidade_adultos);
    console.log('quantidade_criancas:', quantidade_criancas);
    console.log('voce_e_padre:', voce_e_padre);
    console.log('--------------------------------');
    console.log('');

    const num_telefone = telefone;
    const data_chegada = data_de_inicio;
    const data_saida = data_de_fim;
    const num_pessoas = quantidade_adultos + quantidade_criancas;

    
    if (!nome || !num_telefone || !email || !data_chegada || !data_saida || !num_pessoas) {
        return res.status(400).json({
            message: 'All fields are required'
        });
    }

    //check if data_chegada is before data_saida
    if (data_chegada > data_saida) {
        return res.status(400).json({
            message: 'Data de chegada deve ser antes da data de saída'
        });
    }

    // check if num_pessoas is greater than 0
    if (num_pessoas <= 0) {
        return res.status(400).json({
            message: 'Número de pessoas deve ser maior que 0'
        });
    }

    // check if email is valid
    if (!email.includes('@')) {
        return res.status(400).json({
            message: 'Email inválido'
        });
    }

    // check if none of the fields are over 200 characters
    if (nome.length > 200 || num_telefone.length > 20 || email.length > 200) {
        return res.status(400).json({
            message: 'Fields must be less than 200 characters'
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO solicitacao (nome, num_telefone, email, data_chegada, data_saida, num_pessoas, nacionalidade, quantidade_adultos, quantidade_criancas, voce_e_padre)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [nome, num_telefone, email, data_chegada, data_saida, num_pessoas, nacionalidade, quantidade_adultos, quantidade_criancas, voce_e_padre]
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