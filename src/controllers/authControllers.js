import pool from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateResetToken } from '../utils.js';
import { SendResetPasswordEmail } from '../mailing/mailFunctions.js';

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
            data: userDataResult.rows[0]
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


// Used to send the reset password email and create the token on the database
export async function forgotPassword(req, res) {
    const { email } = req.body;

    const userResult = await pool.query(`
        SELECT ua.id, ua.email, p.nome_completo FROM user_auth ua
        JOIN perfil p ON ua.id = p.user_id
        WHERE LOWER(ua.email) = LOWER($1)`,
        [email]);
    const user = userResult.rows[0] || null;

    if (!user) {    
        return res.status(200).send("If that account exists, an email was sent.");
    }

    const token = generateResetToken();

    const tokenResult = await pool.query(
        `INSERT INTO password_reset (user_id, token_hash) VALUES ($1, $2)`,
        [user.id, token]
    )

    if (tokenResult.rowCount === 0) {
        return res.status(200).send("Failed to create token");
    }
  
    const resetLink = `https://piobrasileiroapp.com/reset-password?token=${token}&nome_completo=${user.nome_completo}&email=${user.email}`;

    console.log('resetLink:', resetLink);

    await SendResetPasswordEmail(user.email, user.nome_completo, resetLink);
  
    res.send("Password reset email sent.");
}


export async function resetPassword(req, res) {
    const { token, newPassword } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (!token || !newPassword) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: 'Token and new password are required'
            })
        }

        const userResult = await pool.query(`
            SELECT user_id FROM password_reset
            WHERE token_hash = $1
            AND expires_at > NOW()
        `, [token]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(200).send("Invalid token");
        }

        console.log('newPassword:', newPassword);
        
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        console.log('hashedNewPassword:', hashedNewPassword);

        const changeResult = await pool.query(`
            UPDATE user_auth
            SET password = $1
            WHERE id = $2
        `, [hashedNewPassword, userResult.rows[0].user_id]);

        if (changeResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(200).send("Failed to change password");
        }


        const deleteToken = await pool.query(`
            DELETE FROM password_reset
            WHERE token_hash = $1
        `, [token]);

        if (deleteToken.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(200).send("Invalid token");
        }
        await client.query('COMMIT');

        return res.status(200).send("Password reset successfully");

    } catch {
        await client.query('ROLLBACK');
        return res.status(500).json({
            message: "Failed to reset password"
        });
    } finally {
        client.release();
    }
}