import pool from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function CreateUser(req, res) {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: 'Email and password are required'
        })
    }

    // Check if user already exists in the database
    const existingUser = pool.query(
        'SELECT * FROM user_auth WHERE email = $1',
        [email]
    );

    if (existingUser.rows.length > 0) {
        return res.status(409).json({
            message: "Email already used"
        })
    }

    const client = await pool.connect();

    // Database query to insert user
    try {
        await client.query('BEGIN');

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user on the user_auth table
        const result = await client.query(
            `INSERT INTO user_auth (email, password) VALUES ($1, $2) returning id`,
            [email, hashedPassword]
        );

        // Sign the user token to return to the client
        // Because the id itself is never send to the client
        // Only the token is send so it can be verified later
        // With the verification 
        const userId = result.rows[0].id;
        const userRole = result.rows[0].tipo_usuario;

        // Sign a token with id and role for the user
        const token = jwt.sign(
            { id: userId, role: userRole },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'User registered successfully',
            token: token
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.log(error);
        res.sendStatus(503);
    } finally {
        client.release();
    }
}

export async function CreatePerfil(req, res) {

    const { nome_completo, data_nasc, genero, tipo_usuario, funcao, num_documento, tipo_documento, avatar_url } = req.body;
    const userId = req.userId;

    if (!nome_completo || !tipo_usuario || !tipo_documento) {
        return res.status(400).json({
            message: 'Nome completo, tipo de usuário e tipo de documento são obrigatórios'
        })
    }

    const result = await pool.query(
        `insert into perfil (user_id, nome_completo, data_nasc, genero, tipo_usuario, funcao,
        num_documento, tipo_documento, avatar_url) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *`,
        [userId, nome_completo, data_nasc, genero, tipo_usuario, funcao, num_documento, tipo_documento, avatar_url]
    )

    if (result.rows.length === 0) {
        return res.status(503).json({
            message: 'Failed to create perfil'
        })
    }

    res.status(201).json({
        message: 'Perfil created successfully',
        data: result.rows[0]
    })
}

export async function UpdatePerfil(req, res) {
    const { nome_completo, data_nasc, genero, tipo_usuario, funcao, num_documento, tipo_documento, avatar_url } = req.body;
    const userId = req.userId;

    if (!nome_completo || !tipo_usuario || !tipo_documento) {
        return res.status(400).json({
            message: 'Nome completo, tipo de usuário e tipo de documento são obrigatórios'
        })
    }

    const result = await pool.query(
        `update perfil set nome_completo = $1, data_nasc = $2, genero = $3, tipo_usuario = $4, funcao = $5,
         num_documento = $6, tipo_documento = $7, avatar_url = $8 where user_id = $9 returning *`,
        [nome_completo, data_nasc, genero, tipo_usuario, funcao, num_documento, tipo_documento, avatar_url, userId]
    )

    if (result.rows.length === 0) {
        return res.status(503).json({
            message: 'Failed to update perfil'
        })
    }

    res.status(200).json({
        message: 'Perfil updated successfully'
    })
}

export async function DeleteUser(req, res) {
    const userId = req.userId;

    const result = await pool.query('delete from user_auth where id = $1 returning *', [userId]);

    // checks if there is a returned row (deleted)
    if (result.rows.length === 0) {
        res.status(404).json({
            message: 'User not found'
        })
    }

    res.status(200).json({
        message: 'User deleted successfully',
        data: result.rows[0]
    })
}