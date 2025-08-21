import pool from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserLoginData } from '../utils.js';

export async function LoginUser(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: 'Email and password are required'
        })
    }

    try {
        // Check if user on the database
        const result = await pool.query(`SELECT * FROM user_auth WHERE email = $1 AND active = true`, [email])
        if (result.rows.length === 0) {
            return res.status(401).json({
                message: 'No user found with this email or user is inactive'
            })
        }

        // Check password
        const savedHashedPassword = result.rows[0].password;
        const isPasswordValid = await bcrypt.compare(password, savedHashedPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Invalid password'
            })
        }

        // Sign the user token to return to the client
        const userId = result.rows[0].id;
        const userRole = result.rows[0].tipo_usuario;

        const token = jwt.sign(
            { id: userId, role: userRole },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Base user data
        const userDataQuery = `
            SELECT p.avatar_image_data AS avatar,
                ua.email AS email,
                p.nome_completo AS fullname,
                ua.tipo_usuario AS role
            FROM user_auth ua
            JOIN perfil p
            ON p.user_id = ua.id
            WHERE ua.id = $1
        `;

        const userDataResult = await pool.query(userDataQuery, [userId]);

        if (userDataResult.rows.length === 0) {
            return res.status(404).json({
                message: "User lacks profile data"
            })
        }

        // Respond the client
        res.status(200).json({
            message: 'User logged in successfully',
            token: token,
            data: result.rows[0]
        });

    } catch (error) {
        console.log(error);
        res.sendStatus(503);
    }
}

export async function emailForgotPassword(req, res) {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            message: 'Email is required'
        })
    }

    try {
        const result = await pool.query(`SELECT * FROM user_auth WHERE email = $1`, [email]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'No user found with this email'
            })
        }

        return res.status(200).json({
            message: "Email sent successfully",
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Failed to send email'
        });
    }
}