import pool from '../db.js';
import bcrypt from 'bcryptjs';
import { getCurrentWeekDates, isPasswordValid } from '../utils.js';

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
        avatar_image_data
    } = req.body;

    // Validation
    if (!email || !password || !nome_completo) {
        return res.status(400).json({
            message: 'Email, password and nome_completo are required'
        });
    }

    if (!isPasswordValid(password, nome_completo, data_nasc)) {
        return res.status(400).json({
            message: "Password can't be validated, because it doesn't folllow the rules"
        })
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
                `INSERT INTO perfil (user_id, nome_completo, data_nasc, genero, funcao, num_documento, tipo_documento, avatar_image_data) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [userId, nome_completo, data_nasc, genero, funcao, num_documento, tipo_documento, avatar_image_data]
            );

            await client.query('COMMIT');

            // Return complete user data
            return res.status(201).json({
                message: 'User and perfil created successfully',
                data: {
                    user: userResult.rows[0],
                    perfil: perfilResult.rows[0]
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: "error creating the user and perfil"
            })
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
        
        return res.status(500).json({
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
            query
        );

        return res.status(200).json({
            message: result.rows.length > 0 ? "Successfully fetched users" : "No users found",
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
            SELECT p.*, ua.email, ua.tipo_usuario
            FROM user_auth ua
            JOIN perfil p ON p.user_id = ua.id
            WHERE ua.id = $1
            `,
            [userId]
        );

        return res.status(200).json({
            message: result.rows.length > 0 ? "Successfully fetched user" : "User not found",
            data: result.rows[0] || null
        });
    } catch (error) {
        console.log(error);
        return res.json({
            message: "Failed to fetch user"
        });
    }
}

export async function updateUserAndPerfil(req, res) {
    const { userId } = req.params;
    const { email, tipo_usuario, nome_completo, funcao, data_nasc, genero, num_documento, tipo_documento, observacoes } = req.body;

    // Create a client to connect to database
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Update user_auth table (only fields that belong to it)
        const userAuthResult = await client.query(
            `UPDATE user_auth SET email = $1, tipo_usuario = $2
             WHERE id = $3
             RETURNING *`,
            [email, tipo_usuario, userId]
        );

        if (userAuthResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                message: "User not found"
            });
        }

        // 2. Update perfil table (fields that belong to it)
        const perfilResult = await client.query(
            `UPDATE perfil SET nome_completo = $1, funcao = $2, data_nasc = $3, genero = $4, num_documento = $5, tipo_documento = $6, observacoes = $7
             WHERE user_id = $8
             RETURNING *`,
            [nome_completo, funcao, data_nasc, genero, num_documento, tipo_documento, observacoes, userId]
        );

        await client.query('COMMIT');

        return res.status(200).json({
            message: "Successfully updated user",
            data: {
                user: userAuthResult.rows[0],
                perfil: perfilResult.rows[0]
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.log(error);
        return res.status(500).json({
            message: "Failed to update user and perfil"
        });
    } finally {
        client.release();
    }
}

export async function updateUserAvatar(req, res) {
    const { userId } = req.params;
    const avatar_image_data = req.file.buffer;

    try {
        const result = await pool.query(`UPDATE perfil SET avatar_image_data = $1 WHERE user_id = $2 returning *`, [avatar_image_data, userId]);

        if (result.rows.length === 0) {
            return res.status(400).json({
                message: "User not found"
            })
        }

        return res.status(200).json({
            message: "Avatar updated successfully",
            data: {
                avatar: avatar_image_data
            }
        })
    } catch (error) {
        console.log(error);
        return res.status(403).json({
            message: "There was an error updating the user avatar"
        })
    }
}


export async function toggleActiveUser(req, res) {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ 
            message: 'User ID is required' 
        });
    }

    // ANY allows to pass an array of data to the query
    // ::uuid[] is a type cast to convert the $1 parameter to an array of UUIDs
    const query = `
        UPDATE user_auth 
        SET active = NOT active 
        WHERE id = $1
    `;

    try {
        const result = await pool.query(query, [userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }

        return res.json({ 
            message: "User active status toggled successfully", 
        })
    } catch (error) {
        console.log(error);
        return res.status(403).json({
            message: "There was an error toggling the user active status"
        })
    }
}

export async function deactivateUsers(req, res) {
    const { userIds } = req.body;

    if (!userIds || userIds.length === 0) {
        return res.status(400).json({ 
            message: 'User IDs are required' 
        });
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
            return res.status(404).json({ 
                message: 'No users were deactivated' 
            });
        }
    
        return res.json({ 
            message: 'Users deactivated successfully', 
            data: {
                users: result.rows
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(403).json({
            message: "There was an error deactivating the users"
        })
    }
}

export async function deleteUsers(req, res) {
    const { userIds } = req.body;

    if (!userIds || userIds.length === 0) {
        return res.status(400).json({ 
            message: 'User IDs are required' 
        });
    }

    const query = `
        DELETE FROM user_auth
        WHERE id = ANY($1::uuid[])
        RETURNING *
    `;

    try {
        const result = await pool.query(query, [userIds]);

        if (result.rowCount === 0) {
            return res.status(404).json({ 
                message: 'No users were deleted' 
            });
        }

        return res.status(200).json({
            message: 'Users deleted successfully',
            data: {
                users: result.rows
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(403).json({
            message: "There was an error deleting the users"
        })
    }
}


// GPT WROTE THIS CODE BELOW:


// MEALS (refeicao)
export async function getMeals(req, res) {

    try {
        const query = `
        SELECT 
            r.id,
            r.data,
            r.tipo_pessoa,
            r.almoco_colegio,
            r.almoco_levar,
            r.janta_colegio,
            p.avatar_image_data,
            r.usuario_id,
            r.hospede_id,

            CASE
                WHEN r.tipo_pessoa = 'hospede' THEN h.origem
                WHEN r.tipo_pessoa = 'convidado' THEN c.origem
            END AS origem,

            CASE
                WHEN r.tipo_pessoa = 'usuario' THEN p.observacoes
                WHEN r.tipo_pessoa = 'hospede' THEN h.observacoes
                WHEN r.tipo_pessoa = 'convidado' THEN c.observacoes
            END AS observacoes,
            
            CASE 
                WHEN r.tipo_pessoa = 'usuario' THEN p.nome_completo
                WHEN r.tipo_pessoa = 'hospede' THEN h.nome
                WHEN r.tipo_pessoa = 'convidado' THEN c.nome
            END AS nome,
            
            CASE 
                WHEN r.tipo_pessoa = 'usuario' THEN p.funcao
                WHEN r.tipo_pessoa = 'hospede' THEN h.funcao
                WHEN r.tipo_pessoa = 'convidado' THEN c.funcao
            END AS funcao,

            -- Add anfitriao information for convidados
            CASE 
                WHEN r.tipo_pessoa = 'convidado' THEN c.anfitriao_id
                ELSE NULL
            END AS anfitriao_id,

            CASE 
                WHEN r.tipo_pessoa = 'convidado' THEN p_anfitriao.nome_completo
                ELSE NULL
            END AS anfitriao_nome
            
        FROM refeicao r
        LEFT JOIN perfil p ON r.usuario_id = p.user_id AND r.tipo_pessoa = 'usuario'
        LEFT JOIN hospede h ON r.hospede_id = h.id AND r.tipo_pessoa = 'hospede'
        LEFT JOIN convidado c ON r.convidado_id = c.id AND r.tipo_pessoa = 'convidado'
        -- Join to get anfitriao information for convidados
        LEFT JOIN perfil p_anfitriao ON c.anfitriao_id = p_anfitriao.user_id AND r.tipo_pessoa = 'convidado'
        ORDER BY r.data DESC;
        `;

        const result = await pool.query(query);

        // Conseguir numero total de refeicoes, almoco_colegio, almoco_levar, janta_colegio, observacoes

        const quantityData = {
            totalMeals: result.rows.length,
            totalAlmocoColegio: result.rows.filter(meal => meal.almoco_colegio).length,
            totalAlmocoLevar: result.rows.filter(meal => meal.almoco_levar).length,
            totalJantaColegio: result.rows.filter(meal => meal.janta_colegio).length,
        };

        return res.status(200).json({
            message: result.rows.length > 0 ? "Successfully fetched meals" : "No meals found",
            data: {
                meals: result.rows,
                quantityData: quantityData
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to fetch meals' 
        });
    }
}

export async function getMeal(req, res) {
    const { mealId } = req.params;
    try {
        const result = await pool.query(`SELECT * FROM refeicao WHERE id = $1`, [mealId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Meal not found' 
            });
        }
        return res.status(200).json({
            message: 'Meal fetched successfully', 
            data: {
                meal: result.rows[0]
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to fetch meal' 
        });
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
        return res.status(400).json({ 
            message: 'tipo_pessoa and data are required' 
        });
    }

    const hasUsuario = Boolean(usuario_id);
    const hasHospede = Boolean(hospede_id);
    const hasConvidado = Boolean(convidado_id);
    if (hasUsuario && hasConvidado && hasHospede) {
        return res.status(400).json({ 
            message: 'Provide exactly one of usuario_id, hospede_id, convidado_id' 
        });
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

        return res.status(201).json({ 
            message: 'Meal created successfully', 
            data: {
                meal: result.rows[0]
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to create meal' 
        });
    }
}

export async function createUserMeal(req, res) {
    const { userId } = req.params;
    const { data, almoco_colegio, almoco_levar, janta_colegio } = req.body;

    try {
        const alreadyExists = await pool.query(
            `SELECT * FROM refeicao WHERE usuario_id = $1 AND data = $2`,
            [userId, data]
        );
        if (alreadyExists.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Usuário já possui refeição para esta data' 
            });
        }

        const result = await pool.query(
            `INSERT INTO refeicao (tipo_pessoa, usuario_id, data, almoco_colegio, almoco_levar, janta_colegio)
             VALUES ('usuario', $1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, data, almoco_colegio, almoco_levar, janta_colegio]
        );

        return res.status(201).json({ 
            message: 'Meal created successfully', 
            data: {
                meal: result.rows[0]
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to create meal' 
        });
    }
}

export async function updateMeal(req, res) {
    const { mealId } = req.params;
    const { almoco_colegio, almoco_levar, janta_colegio } = req.body;

    try {
        const result = await pool.query(
            `UPDATE refeicao
             SET almoco_colegio = COALESCE($1, almoco_colegio),
                 almoco_levar = COALESCE($2, almoco_levar),
                 janta_colegio = COALESCE($3, janta_colegio)
             WHERE id = $4`,
            [
                almoco_colegio,
                almoco_levar,
                janta_colegio,
                mealId,
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ 
                message: 'Meal not found' 
            });
        }

        return res.status(200).json({ 
            message: 'Meal updated successfully', 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to update meal' 
        });
    }
}

export async function deleteMeal(req, res) {
    const { mealId } = req.params;
    try {
        const result = await pool.query(`DELETE FROM refeicao WHERE id = $1 RETURNING *`, [mealId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ 
                message: 'Meal not found' 
            });
        }
        return res.status(200).json({ 
            message: 'Meal deleted successfully', 
            data: {
                meal: result.rows[0]
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to delete meal' 
        });
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
        return res.status(200).json({ 
            message: 'Accommodations fetched successfully', 
            data: {
                accommodations: result.rows,
                dateRange: {
                    fromDate: monday, 
                    toDate: sunday 
                }
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to fetch accommodations' 
        });
    }
}

export async function getAccommodation(req, res) {
    const { accommodationId } = req.params;
    
    try {
        const result = await pool.query(`SELECT * FROM hospedagem WHERE id = $1`, [accommodationId]);
        return res.status(200).json({ 
            message: result.rows.length > 0 ? 'Accommodation fetched successfully' : 'Accommodation not found',
            data: result.rows[0] || null
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to fetch accommodation' 
        });
    }
}

export async function createAccommodation(req, res) {
    const { anfitriao_id, hospede_id, data_chegada, data_saida, quarto_id, status_hospedagem } = req.body;

    if (!anfitriao_id || !hospede_id || !data_chegada || !data_saida || !quarto_id) {
        return res.status(400).json({ 
            message: 'anfitriao_id, hospede_id, data_chegada, data_saida and quarto_id are required' 
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO hospedagem (anfitriao_id, hospede_id, data_chegada, data_saida, quarto_id, status_hospedagem)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'prevista'))
             RETURNING *`,
            [anfitriao_id, hospede_id, data_chegada, data_saida, quarto_id, status_hospedagem || null]
        );

        return res.status(201).json({ 
            message: 'Accommodation created successfully', 
            data: {
                accommodation: result.rows[0]
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to create accommodation' 
        });
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
            return res.status(404).json({ message: 'Accommodation not found' 
        });
        }

        return res.status(200).json({ 
            message: 'Accommodation updated successfully', 
            data: {
                accommodation: result.rows[0]
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to update accommodation' 
        });
    }
}

export async function deleteAccommodation(req, res) {
    const { accommodationId } = req.params;
    try {
        const result = await pool.query(`DELETE FROM hospedagem WHERE id = $1 RETURNING *`, [accommodationId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Accommodation not found' 
        });
        }
        return res.status(200).json({ 
            message: 'Accommodation deleted successfully', 
            data: {
                accommodation: result.rows[0]
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to delete accommodation' 
        });
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

        return res.status(200).json({
            message: result.rows.length > 0 ? 'Rooms fetched successfully' : 'No rooms found',
            data: {
                rooms: result.rows
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to fetch rooms' 
        });
    }
}

// GUESTS (hospede)
export async function getGuests(req, res) {
    try {
        const result = await pool.query(`SELECT * FROM hospede ORDER BY criado_em DESC`);
        return res.status(200).json({ 
            message: result.rows.length > 0 ? 'Guests fetched successfully' : 'No guests found',
            data: {
                guests: result.rows
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to fetch guests' 
        });
    }
}

export async function createGuest(req, res) {
    const { nome, genero, tipo_documento, num_documento, funcao, origem } = req.body;

    if (!nome || !genero || !tipo_documento || !num_documento) {
        return res.status(400).json({ 
            message: 'nome, genero, tipo_documento and num_documento are required' 
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO hospede (nome, genero, tipo_documento, num_documento, funcao, origem)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [nome, genero, tipo_documento, num_documento, funcao || null, origem || null]
        );

        return res.status(201).json({ 
            message: 'Guest created successfully', 
            data: {
                guest: result.rows[0]
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to create guest' 
        });
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
            return res.status(404).json({ message: 'Guest not found' 
        });
        }

        return res.status(200).json({ 
            message: 'Guest updated successfully', 
            data: {
                guest: result.rows[0]
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to update guest' 
        });
    }
}

export async function deleteGuest(req, res) {
    const { guestId } = req.params;
    try {
        const result = await pool.query(`DELETE FROM hospede WHERE id = $1 RETURNING *`, [guestId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Guest not found' 
        });
        }
        return res.status(200).json({ 
            message: 'Guest deleted successfully', 
            data: {
                guest: result.rows[0]
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to delete guest' 
        });
    }
}

// REQUESTS (solicitacao)
export async function getRequests(req, res) {
    try {
        const result = await pool.query(`SELECT * FROM solicitacao ORDER BY criado_em DESC`);
        return res.status(200).json({ 
            message: result.rows.length > 0 ? 'Requests fetched successfully' : 'No requests found',
            data: {
                requests: result.rows
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to fetch requests' 
        });
    }
}

export async function visualizeRequest(req, res) {
    const { requestId } = req.params;
    try {
        const result = await pool.query(`UPDATE solicitacao SET visualizada = TRUE WHERE id = $1 RETURNING *`, [requestId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Request not found' 
        });
        }
        return res.status(200).json({ 
            message: 'Request visualized successfully', 
            data: {
                request: result.rows[0]
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to visualize request' 
        });
    }
}

export async function getProfile(req, res) {

    const userId = req.userId;

    try {
        const result = await pool.query(
            `
            SELECT p.*, ua.email, ua.tipo_usuario
            FROM user_auth ua
            JOIN perfil p ON p.user_id = ua.id
            WHERE ua.id = $1
            `,
            [userId]
        );

        return res.status(200).json({
            message: result.rows.length > 0 ? "Successfully fetched profile" : "Profile not found",
            data: result.rows[0] || null
        });
    } catch (error) {
        console.log(error);
        return res.json({
            message: "Failed to fetch profile"
        });
    }
}

export async function updateProfile(req, res) {
    const userId = req.userId;
    const { email, tipo_usuario, nome_completo, funcao, data_nasc, genero, num_documento, tipo_documento, observacoes } = req.body;

    // Create a client to connect to database
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Update user_auth table (only fields that belong to it)
        const userAuthResult = await client.query(
            `UPDATE user_auth SET email = $1, tipo_usuario = $2
             WHERE id = $3
             RETURNING *`,
            [email, tipo_usuario, userId]
        );

        if (userAuthResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                message: "Profile not found"
            });
        }

        // 2. Update perfil table (fields that belong to it)
        const perfilResult = await client.query(
            `UPDATE perfil SET nome_completo = $1, funcao = $2, data_nasc = $3, genero = $4, num_documento = $5, tipo_documento = $6, observacoes = $7
             WHERE user_id = $8
             RETURNING *`,
            [nome_completo, funcao, data_nasc, genero, num_documento, tipo_documento, observacoes, userId]
        );

        await client.query('COMMIT');

        return res.status(200).json({
            message: "Successfully updated profile",
            data: {
                user: userAuthResult.rows[0],
                perfil: perfilResult.rows[0]
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.log(error);
        return res.status(500).json({
            message: "Failed to update profile"
        });
    } finally {
        client.release();
    }
}

export async function createGuestMeal(req, res) {
    const { anfitriao_id, observacoes, data, nome, funcao, origem, almoco_colegio, almoco_levar, janta_colegio} = req.body;

    try {
        const anfitriao = anfitriao_id ? anfitriao_id : req.userId;

        // First, create the convidado
        const convidadoQuery = `
            INSERT INTO convidado (anfitriao_id, nome, funcao, origem, observacoes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;

        const convidadoResult = await pool.query(
            convidadoQuery,
            [anfitriao, nome, funcao, origem, observacoes]
        );


        if (convidadoResult.rows.length === 0) {
            return res.status(404).json({
                message: "Failed to create convidado"
            });
        }

        const convidadoId = convidadoResult.rows[0].id;

        // Then, create the meal for the convidado
        const mealQuery = `
            INSERT INTO refeicao (tipo_pessoa, convidado_id, data, almoco_colegio, almoco_levar, janta_colegio)
            VALUES ('convidado', $1, $2, $3, $4, $5)
            RETURNING *
        `;

        const mealResult = await pool.query(
            mealQuery,
            [convidadoId, data, almoco_colegio, almoco_levar, janta_colegio]
        );

        if (mealResult.rows.length === 0) {
            return res.status(404).json({
                message: "Failed to create guest meal"
            });
        }

        return res.status(200).json({
            message: "Guest meal created successfully",
            data: {
                guestMeal: mealResult.rows[0]
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Failed to create guest meal'
        });
    }
}

export async function deleteGuestMeal(req, res) {
    
    const { mealId } = req.params;

    try {
        // First, get the convidado_id from the meal
        const getConvidadoQuery = `
            SELECT convidado_id FROM refeicao
            WHERE id = $1
        `;

        const convidadoResult = await pool.query(
            getConvidadoQuery,
            [mealId]
        );

        if (convidadoResult.rows.length === 0) {
            return res.status(404).json({
                message: "Meal not found"
            });
        }

        const convidadoId = convidadoResult.rows[0].convidado_id;

        // Delete the meal
        const deleteMealQuery = `
            DELETE FROM refeicao
            WHERE id = $1
            RETURNING *
        `;

        const mealResult = await pool.query(
            deleteMealQuery,
            [mealId]
        );

        if (mealResult.rows.length === 0) {
            return res.status(404).json({
                message: "Failed to delete meal"
            });
        }

        // Delete the convidado
        const deleteConvidadoQuery = `
            DELETE FROM convidado
            WHERE id = $1
            RETURNING *
        `;

        const convidadoDeleteResult = await pool.query(
            deleteConvidadoQuery,
            [convidadoId]
        );

        if (convidadoDeleteResult.rows.length === 0) {
            return res.status(404).json({
                message: "Failed to delete convidado"
            });
        }

        return res.status(200).json({
            message: "Guest meal and convidado deleted successfully",
            data: {
                deletedMeal: mealResult.rows[0],
                deletedConvidado: convidadoDeleteResult.rows[0]
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Failed to delete guest meal and convidado'
        });
    }
}

export async function editGuestMeal(req, res) {
    const { mealId } = req.params;
    const { data, anfitriao_id, almoco_colegio, almoco_levar, janta_colegio, observacoes } = req.body;
    
    const client = await pool.connect();

    try {

        await client.query('BEGIN')

        const mealResult = await client.query(
            `UPDATE refeicao
             SET data = $1, almoco_colegio = $2, almoco_levar = $3, janta_colegio = $4
             WHERE id = $5
             RETURNING convidado_id`,
            [data, almoco_colegio, almoco_levar, janta_colegio, mealId]
        );

        if (mealResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: 'Meal not found' 
            });
        }

        const guestResult = await client.query(
            `UPDATE convidado
            SET observacoes = $1, anfitriao_id = $2
            WHERE id = $3`,
            [observacoes, anfitriao_id, mealResult.rows[0].convidado_id]
        )

        if (guestResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: 'Guest not found' 
            });
        }

        await client.query('COMMIT');

        return res.status(200).json({
            message: 'Guest meal and convidado edited successfully',
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.log('Não foi possîvel editar a refeicao do convidado, error:', error);
        return res.status(500).json({
            message: 'Failed to edit guest meal and convidado'
        })
    }
}

export async function getBlockedDates(req, res) {
    try {
        const result = await pool.query(`SELECT data FROM datas_refeicao_bloqueadas`);

        return res.status(200).json({
            message: result.rows.length > 0 ? 'Datas de refeição bloqueadas encontradas' : 'Não foi possível encontrar datas de refeição bloqueadas',
            data: result.rows
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Não foi possível encontrar datas de refeição bloqueadas' 
        });
    }
}

export async function addBlockedDates(req, res) {
    const { datas } = req.body; 

    console.log('datas:', datas);
    
    if (!datas || !Array.isArray(datas) || datas.length === 0) {
        return res.status(400).json({
            message: 'Array of dates is required'
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO datas_refeicao_bloqueadas (data)
             SELECT unnest($1::date[]) AS data
             ON CONFLICT (data) DO NOTHING
             RETURNING *`,
            [datas]
        );

        if (result.rows.length === 0) {
            return res.status(200).json({
                message: 'All dates are already blocked'
            });
        }

        return res.status(201).json({
            message: 'Blocked dates added successfully',
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to add blocked dates' 
        });
    }
}

export async function deleteBlockedDates(req, res) {
    const { datas } = req.body;

    try {

        const result = await pool.query(`
            DELETE FROM datas_refeicao_bloqueadas
            WHERE data = ANY($1::date[])
            RETURNING *`, [datas]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'No blocked dates were deleted' 
            });
        }

        return res.status(200).json({
            message: 'Blocked dates deleted successfully',
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to delete blocked dates' 
        });
    }
}