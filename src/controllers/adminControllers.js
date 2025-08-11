import pool from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { calculatePagination, getCurrentWeekDates } from '../utils.js';

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

    try {

        const query = `
            SELECT p.*, ua.email, ua.tipo_usuario, ua.active
            FROM user_auth ua
            JOIN perfil p ON p.user_id = ua.id
            ORDER BY ua.criado_em DESC
        `;

        const result = await pool.query(
            query,
        );

        if (result.rows.length === 0){
            return res.status(404).json({
                message: "No users found"
            })
        }

        res.status(200).json({
            message: "Successfully fetched users",
            data: result.rows
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
            `
            SELECT p.*, ua.active, ua.email, ua.tipo_usuario
            FROM user_auth ua
            JOIN perfil p ON p.user_id = ua.id
            WHERE ua.id = $1
            AND active = TRUE
            `,
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




// GPT WROTE THIS CODE BELOW:



// MEALS (refeicao)
export async function getMeals(req, res) {

    const { monday, sunday } = getCurrentWeekDates();

    try {

        const query = `
        SELECT * FROM refeicao 
        WHERE data >= $1 
        AND data <= $2
        ORDER BY data ASC
        `;

        const result = await pool.query(query, [monday, sunday]);

        if (result.rows.length === 0){
            return res.status(404).json({
                message: "No meals found"
            })
        }

        res.status(200).json({
            message: "Successfully fetched meals",
            data: result.rows,
            fromDate: monday,
            toDate: sunday
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch meals' });
    }
}

export async function getMeal(req, res) {
    const { mealId } = req.params;
    try {
        const result = await pool.query(`SELECT * FROM refeicao WHERE id = $1`, [mealId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Meal not found' });
        }
        res.status(200).json({ message: 'Meal fetched successfully', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch meal' });
    }
}

export async function createMeal(req, res) {
    const {
        tipo_pessoa,
        usuario_id,
        hospede_id,
        convidado_id,
        data,
        almoco_colegio,
        almoco_levar,
        janta_colegio,
        observacoes,
    } = req.body;

    if (!tipo_pessoa || !data) {
        return res.status(400).json({ message: 'tipo_pessoa and data are required' });
    }

    const hasUsuario = Boolean(usuario_id);
    const hasHospede = Boolean(hospede_id);
    const hasConvidado = Boolean(convidado_id);
    const associationsCount = [hasUsuario, hasHospede, hasConvidado].filter(Boolean).length;
    if (associationsCount !== 1) {
        return res.status(400).json({ message: 'Provide exactly one of usuario_id, hospede_id, convidado_id' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO refeicao (
                tipo_pessoa, usuario_id, hospede_id, convidado_id,
                data, almoco_colegio, almoco_levar, janta_colegio, observacoes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                tipo_pessoa,
                usuario_id || null,
                hospede_id || null,
                convidado_id || null,
                data,
                Boolean(almoco_colegio),
                Boolean(almoco_levar),
                Boolean(janta_colegio),
                observacoes || null,
            ]
        );

        res.status(201).json({ message: 'Meal created successfully', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create meal' });
    }
}

export async function updateMeal(req, res) {
    const { mealId } = req.params;
    const { almoco_colegio, almoco_levar, janta_colegio, observacoes } = req.body;

    try {
        const result = await pool.query(
            `UPDATE refeicao
             SET almoco_colegio = COALESCE($1, almoco_colegio),
                 almoco_levar = COALESCE($2, almoco_levar),
                 janta_colegio = COALESCE($3, janta_colegio),
                 observacoes = COALESCE($4, observacoes)
             WHERE id = $5
             RETURNING *`,
            [
                typeof almoco_colegio === 'boolean' ? almoco_colegio : null,
                typeof almoco_levar === 'boolean' ? almoco_levar : null,
                typeof janta_colegio === 'boolean' ? janta_colegio : null,
                observacoes ?? null,
                mealId,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Meal not found' });
        }

        res.status(200).json({ message: 'Meal updated successfully', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update meal' });
    }
}

export async function deleteMeal(req, res) {
    const { mealId } = req.params;
    try {
        const result = await pool.query(`DELETE FROM refeicao WHERE id = $1 RETURNING *`, [mealId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Meal not found' });
        }
        res.status(200).json({ message: 'Meal deleted successfully', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete meal' });
    }
}

// ACCOMMODATIONS (hospedagem)
export async function getAccommodations(req, res) {

    const { startDate, endDate } = req.query;

    const { monday, sunday } = getCurrentWeekDates();


    try {

        const query = `
        SELECT * FROM hospedagem
        WHERE data_chegada >= $1
        AND data_saida <= $2
        ORDER BY data_chegada ASC
        `

        const result = await pool.query(
            query,
            [startDate || monday, endDate || sunday]);

        if (result.rows.length === 0){
            return res.status(404).json({
                message: "No accommodations found"
            })
        }
        res.status(200).json({ message: 'Accommodations fetched successfully', data: result.rows, fromDate: monday, toDate: sunday });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch accommodations' });
    }
}

export async function getAccommodation(req, res) {
    const { accommodationId } = req.params;
    
    try {
        const result = await pool.query(`SELECT * FROM hospedagem WHERE id = $1`, [accommodationId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Accommodation not found' });
        }
        res.status(200).json({ message: 'Accommodation fetched successfully', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch accommodation' });
    }
}

export async function createAccommodation(req, res) {
    const { anfitriao_id, hospede_id, data_chegada, data_saida, quarto_id, status_hospedagem } = req.body;

    if (!anfitriao_id || !hospede_id || !data_chegada || !data_saida || !quarto_id) {
        return res.status(400).json({ message: 'anfitriao_id, hospede_id, data_chegada, data_saida and quarto_id are required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO hospedagem (anfitriao_id, hospede_id, data_chegada, data_saida, quarto_id, status_hospedagem)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'prevista'))
             RETURNING *`,
            [anfitriao_id, hospede_id, data_chegada, data_saida, quarto_id, status_hospedagem || null]
        );

        res.status(201).json({ message: 'Accommodation created successfully', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create accommodation' });
    }
}

export async function updateAccommodation(req, res) {
    const { accommodationId } = req.params;
    const { data_chegada, data_saida, quarto_id, status_hospedagem } = req.body;

    try {
        const result = await pool.query(
            `UPDATE hospedagem
             SET data_chegada = COALESCE($1, data_chegada),
                 data_saida = COALESCE($2, data_saida),
                 quarto_id = COALESCE($3, quarto_id),
                 status_hospedagem = COALESCE($4, status_hospedagem)
             WHERE id = $5
             RETURNING *`,
            [data_chegada || null, data_saida || null, quarto_id || null, status_hospedagem || null, accommodationId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Accommodation not found' });
        }

        res.status(200).json({ message: 'Accommodation updated successfully', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update accommodation' });
    }
}

export async function deleteAccommodation(req, res) {
    const { accommodationId } = req.params;
    try {
        const result = await pool.query(`DELETE FROM hospedagem WHERE id = $1 RETURNING *`, [accommodationId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Accommodation not found' });
        }
        res.status(200).json({ message: 'Accommodation deleted successfully', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete accommodation' });
    }
}

// ROOMS (quarto)
export async function getRooms(req, res) {

    const { startDate, endDate } = req.query;

    const { monday, sunday } = getCurrentWeekDates();

    try {

        // Get all rooms for the week returning a variable if they are available or not on each day

        const query = `
        SELECT * FROM quarto_ocupado
        JOIN quarto on quarto.id = quarto_ocupado.quarto_id
        WHERE data >= $1
        AND data <= $2
        ORDER BY quarto.numero ASC
        `
        const result = await pool.query(
            query,
            [startDate || monday, endDate || sunday]
        );

        if (result.rows.length === 0){
            return res.status(404).json({
                message: "No rooms found"
            })
        }
        res.status(200).json({
            message: 'Rooms fetched successfully',
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch rooms' });
    }
}

// GUESTS (hospede)
export async function getGuests(req, res) {
    try {
        const result = await pool.query(`SELECT * FROM hospede ORDER BY criado_em DESC`);
        res.status(200).json({ message: 'Guests fetched successfully', data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch guests' });
    }
}

export async function createGuest(req, res) {
    const { nome, genero, tipo_documento, num_documento, funcao, origem } = req.body;

    if (!nome || !genero || !tipo_documento || !num_documento) {
        return res.status(400).json({ message: 'nome, genero, tipo_documento and num_documento are required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO hospede (nome, genero, tipo_documento, num_documento, funcao, origem)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [nome, genero, tipo_documento, num_documento, funcao || null, origem || null]
        );

        res.status(201).json({ message: 'Guest created successfully', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create guest' });
    }
}

export async function updateGuest(req, res) {
    const { guestId } = req.params;
    const { nome, genero, tipo_documento, num_documento, funcao, origem } = req.body;

    try {
        const result = await pool.query(
            `UPDATE hospede
             SET nome = COALESCE($1, nome),
                 genero = COALESCE($2, genero),
                 tipo_documento = COALESCE($3, tipo_documento),
                 num_documento = COALESCE($4, num_documento),
                 funcao = COALESCE($5, funcao),
                 origem = COALESCE($6, origem)
             WHERE id = $7
             RETURNING *`,
            [nome || null, genero || null, tipo_documento || null, num_documento || null, funcao || null, origem || null, guestId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        res.status(200).json({ message: 'Guest updated successfully', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update guest' });
    }
}

export async function deleteGuest(req, res) {
    const { guestId } = req.params;
    try {
        const result = await pool.query(`DELETE FROM hospede WHERE id = $1 RETURNING *`, [guestId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Guest not found' });
        }
        res.status(200).json({ message: 'Guest deleted successfully', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete guest' });
    }
}

// REQUESTS (solicitacao)
export async function getRequests(req, res) {
    try {
        const result = await pool.query(`SELECT * FROM solicitacao ORDER BY criado_em DESC`);
        res.status(200).json({ message: 'Requests fetched successfully', data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch requests' });
    }
}

export async function visualizeRequest(req, res) {
    const { requestId } = req.params;
    try {
        const result = await pool.query(`UPDATE solicitacao SET visualizada = TRUE WHERE id = $1 RETURNING *`, [requestId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }
        res.status(200).json({ message: 'Request visualized successfully', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to visualize request' });
    }
}