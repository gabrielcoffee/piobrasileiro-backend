import pool from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function RegisterUser(req, res) {
    console.log('RegisterUser');
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
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
            success: false,
            message: "Email already used"
        })
    }

    const client = await pool.connect();

    // Database query to insert user
    try {

        await client.query('BEGIN');

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await client.query(
            `INSERT INTO user_auth (email, password) VALUES ($1, $2) returning id`,
            [email, hashedPassword]
        );

        // Generate token for authentication
        const userId = result.rows[0].id;

        const token = jwt.sign(
            { id: userId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
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

export async function LoginUser(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        })
    }

    try {
        // Check if user on the database
        const result = await pool.query(`select * from user_auth where email = $1`, [email])
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'No user found with this email'
            })
        }

        // Check password
        const savedHashedPassword = result.rows[0].password;
        const isPasswordValid = await bcrypt.compare(password, savedHashedPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password'
            })
        }

        // Sign the user token to return to the client
        const userId = result.rows[0].id;
        const token = jwt.sign(
            { id: userId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(200).json({
            success: true,
            message: 'User logged in successfully',
            token: token
        });

    } catch (error) {
        console.log(error);
        res.sendStatus(503);
    }
}