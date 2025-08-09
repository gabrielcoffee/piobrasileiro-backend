import pool from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

        res.status(200).json({
            message: 'User logged in successfully',
            token: token
        });

    } catch (error) {
        console.log(error);
        res.sendStatus(503);
    }
}