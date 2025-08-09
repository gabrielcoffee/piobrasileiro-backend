import pool from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { calculatePagination } from '../utils.js';

export async function createUser(req, res) {

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

        // Sign the token and return it to the client
        // The id itself is never send to the client
        // With the verification of the token, the id and role 
        // are retrieved from the token
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

export async function createPerfil(req, res) {
    const { nome_completo, data_nasc, genero, funcao, num_documento, tipo_documento, avatar_url } = req.body;

    if (!nome_completo || !data_nasc || !genero || !funcao || !num_documento || !tipo_documento) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const result = await pool.query(   
            `INSERT INTO perfil (user_id, nome_completo, data_nasc, genero, funcao, num_documento, tipo_documento, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [req.params.userId, nome_completo, data_nasc, genero, funcao, num_documento, tipo_documento, avatar_url]
        );
    
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Failed to create perfil' });
        }

        res.status(201).json({
            message: 'Perfil created successfully',
            data: result.rows[0]
        })
    } catch (error) {
        console.log(error);
        res.sendStatus(503);
    }
}

export async function createUserAndPerfil(req, res) {
    const {
        // user_auth data
        email,
        password,
        tipo_usuario,

        // perfil data
        nome_completo,
        data_nasc,
        genero,
        funcao,
        num_documento,
        tipo_documento,
        avatar_url
    } = req.body;

    // Validation
    if (!email || !password || !nome_completo) {
        return res.status(400).json({
            message: 'Email, password and nome_completo are required'
        });
    }

    try {
        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT * FROM user_auth WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email already used"
            });
        }

        // Create a client to connect to database
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Create user_auth record
            const hashedPassword = await bcrypt.hash(password, 10);

            const userResult = await client.query(
                `INSERT INTO user_auth (email, password, tipo_usuario) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [email, hashedPassword, tipo_usuario || 'comum']
            );

            const userId = userResult.rows[0].id;

            // 2. Create perfil record
            const perfilResult = await client.query(
                `INSERT INTO perfil (user_id, nome_completo, data_nasc, genero, funcao, num_documento, tipo_documento, avatar_url) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [userId, nome_completo, data_nasc, genero, funcao, num_documento, tipo_documento, avatar_url]
            );

            await client.query('COMMIT');

            // Return complete user data
            res.status(201).json({
                message: 'User and perfil created successfully',
                data: {
                    user: userResult.rows[0],
                    perfil: perfilResult.rows[0]
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error(error);
        
        // Handle specific database errors
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({
                message: 'Email already exists'
            });
        }
        
        res.status(500).json({
            message: 'Failed to create user and perfil'
        });
    }
}

export async function getUsersAndPerfil(req, res) {

    const limit = 8;
    const page = req.query.page;

    const countResult = await pool.query('SELECT COUNT(*) FROM user_auth WHERE active = TRUE');
    const totalUsers = parseInt(countResult.rows[0].count);

    const pagination = calculatePagination(
        totalItems = totalUsers,
        currentPage = page,
        itemsPerPage = limit
    );

    try {

        const query = `
            SELECT p.nome_completo, ua.tipo_usuario, p.funcao, p.data_nasc, ua.email
            FROM user_auth ua
            JOIN perfil p ON perfil.user_id = user_auth.id
            LIMIT $1 OFFSET $2
        `;

        const result = await pool.query(
            query, 
            [pagination.page, pagination.offset]
        );

        if (result.rows.length === 0){
            return res.status(404).json({
                message: "No users found"
            })
        }

        res.status(200).json({
            message: "Successfully fetched users",
            data: result.rows,
        })

    } catch (error) {
        console.log(error);
        return res.json({
            message: "Failed to fetch users"
        })
    }
}

export async function getUserAndPerfil(req, res) {
    const { userId } = req.params;

    try {
        const result = await pool.query(
            `SELECT ua.email, ua.tipo_usuario, p.nome_completo, p.funcao, p.data_nasc, p.genero, p.num_documento, p.tipo_documento, p.avatar_url
            FROM user_auth ua
            JOIN perfil p ON p.user_id = ua.id
            WHERE ua.id = $1
            AND active = TRUE`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            })
        }

        res.status(200).json({
            message: "Successfully fetched user",
            data: result.rows[0]
        })
    } catch (error) {
        console.log(error);
        return res.json({
            message: "Failed to fetch user"
        })
    }
}

export async function updateUserAndPerfil(req, res) {
    const { userId } = req.params;
    const { email, tipo_usuario, nome_completo, funcao, data_nasc, genero, num_documento, tipo_documento, avatar_url } = req.body;

    try {
        const result = await pool.query(
            `UPDATE user_auth SET email = $1, tipo_usuario = $2, nome_completo = $3, funcao = $4, data_nasc = $5, genero = $6, num_documento = $7, tipo_documento = $8, avatar_url = $9
            WHERE id = $10
            RETURNING *`,
            [email, tipo_usuario, nome_completo, funcao, data_nasc, genero, num_documento, tipo_documento, avatar_url, userId]
        );
    
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            })
        }

        res.status(200).json({
            message: "Successfully updated user",
            data: result.rows[0]
        })

    } catch (error) {
        console.log(error);
        res.status(403).json({
            message: "There was an error updating the user profile"
        })
    }
}

export async function activateUsers(req, res) {
    const { userIds } = req.body;

    if (!userIds || userIds.length === 0) {
        return res.status(400).json({ message: 'User IDs are required' });
    }

    // ANY allows to pass an array of data to the query
    // ::uuid[] is a type cast to convert the $1 parameter to an array of UUIDs
    const query = `
        UPDATE user_auth 
        SET active = TRUE 
        WHERE id = ANY($1::uuid[])
        RETURNING *
    `;

    try {
        const result = await pool.query(query, [userIds]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'No users were activated' });
        }

        res.json({ message: "Users activated successfully", data: result.rows })
    } catch (error) {
        console.log(error);
        res.status(403).json({
            message: "There was an error activating the users"
        })
    }
}

export async function deactivateUsers(req, res) {
    const { userIds } = req.body;

    if (!userIds || userIds.length === 0) {
        return res.status(400).json({ message: 'User IDs are required' });
    }
    
    const query = `
        UPDATE user_auth 
         SET active = FALSE 
         WHERE id = ANY($1::uuid[])
         RETURNING *
    `;

    try {
        const result = await pool.query(query, [userIds]);  
    
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'No users were deactivated' });
        }
    
        res.json({ message: 'Users deactivated successfully', data: result.rows });
    } catch (error) {
        console.log(error);
        res.status(403).json({
            message: "There was an error deactivating the users"
        })
    }
}

export async function deleteUsers(req, res) {
    const { userIds } = req.body;

    if (!userIds || userIds.length === 0) {
        return res.status(400).json({ message: 'User IDs are required' });
    }

    const query = `
        DELETE FROM user_auth
        WHERE id = ANY($1::uuid[])
        RETURNING *
    `;

    try {
        const result = await pool.query(query, [userIds]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'No users were deleted' });
        }

        res.status(200).json({
            message: 'Users deleted successfully',
            data: result.rows
        });
    } catch (error) {
        console.log(error);
        res.status(403).json({
            message: "There was an error deleting the users"
        })
    }
}