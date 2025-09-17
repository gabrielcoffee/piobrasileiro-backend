import pool from '../db.js';
import bcrypt from 'bcryptjs';
import { getCurrentWeekDates, getListOfDatesFromCheckInToCheckOut, isPasswordValid } from '../utils.js';

export async function createUserAndPerfil(req, res) {
    const {
        // user_auth data
        email,
        tipo_usuario,

        // perfil data
        nome_completo,
        data_nasc,
        genero,
        funcao,
        num_documento,
        tipo_documento,
        observacoes
    } = req.body;

    // Validation
    if (!email || !nome_completo) {
        return res.status(400).json({
            message: 'Email, password and nome_completo are required'
        });
    }

    /*
    if (!isPasswordValid(password, nome_completo, data_nasc)) {
        return res.status(400).json({
            message: "Password can't be validated, because it doesn't folllow the rules"
        })
    }
    */

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

            const password = 'Senha@123'

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
                `INSERT INTO perfil (user_id, nome_completo, data_nasc, genero, funcao, num_documento, tipo_documento, observacoes) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [userId, nome_completo, data_nasc, genero, funcao, num_documento, tipo_documento, observacoes]
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

    if (userId === req.userId) {
        return res.status(200).json({ 
            message: 'You cannot toggle your own active status'
        });
    }

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

    const userIdsFinal = userIds.filter(id => id !== req.userId);

    if (!userIdsFinal || userIdsFinal.length === 0) {
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
        const result = await pool.query(query, [userIdsFinal]);  
    
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

    const userIdsFinal = userIds.filter(id => id !== req.userId);

    if (!userIdsFinal || userIdsFinal.length === 0) {
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
        const result = await pool.query(query, [userIdsFinal]);

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

    const { startDate, endDate } = req.body;

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
        WHERE r.data >= $1 AND r.data <= $2
        ORDER BY r.data DESC;
        `;

        const result = await pool.query(query, [startDate, endDate]);

        return res.status(200).json({
            message: result.rows.length > 0 ? "Successfully fetched meals" : "No meals found",
            data: {
                meals: result.rows,
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

    const { startDate, endDate } = req.body;

    try {

        const query = `
            SELECT 
                h.*,
                ho.nome,
                p.nome_completo as anfitriao,
                h.data_chegada,
                h.data_saida,
                q.numero as quarto,
                CASE
                    WHEN CURRENT_DATE BETWEEN h.data_chegada AND h.data_saida THEN 'Ativa'
                    WHEN CURRENT_DATE < h.data_chegada THEN 'Prevista'
                    WHEN CURRENT_DATE > h.data_saida THEN 'Encerrada'
                END as status,
                ho.observacoes
            FROM hospedagem h
            JOIN hospede ho ON h.hospede_id = ho.id
            JOIN perfil p ON h.anfitriao_id = p.user_id
            JOIN quarto q ON h.quarto_id = q.id
            WHERE (h.data_chegada >= $1 AND h.data_chegada <= $2) OR (h.data_saida >= $1 AND h.data_saida <= $2)
            ORDER BY h.data_chegada ASC
            `;

        const result = await pool.query(
            query,
            [startDate, endDate]);

        if (result.rows.length === 0){
            return res.status(200).json({
                message: "No accommodations found",
                data: []
            })
        }
        return res.status(200).json({ 
            message: 'Accommodations fetched successfully', 
            data: result.rows
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
    const { anfitriao_id, hospede_id, data_chegada, data_saida, quarto_id, almoco, janta, observacoes } = req.body;

    if (!anfitriao_id || !hospede_id || !data_chegada || !data_saida || !quarto_id) {
        return res.status(400).json({ 
            message: 'anfitriao_id, hospede_id, data_chegada, data_saida and quarto_id are required' 
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO hospedagem (anfitriao_id, hospede_id, data_chegada, data_saida, quarto_id, almoco, janta)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6, false), COALESCE($7, false))
             RETURNING *`,
            [anfitriao_id, hospede_id, data_chegada, data_saida, quarto_id, almoco, janta]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Failed to create accommodation' 
            });
        }

        const observacoesResult = await client.query(
            `UPDATE hospede 
            SET observacoes = $1
            WHERE id = $2`,
            [observacoes, hospede_id]
        )

        if (observacoesResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Failed to update guest' 
            });
        }

        const dates = getListOfDatesFromCheckInToCheckOut(data_chegada, data_saida);

        const mealResult = await client.query(
            `INSERT INTO refeicao (tipo_pessoa, hospede_id, data, almoco_colegio, janta_colegio)
             SELECT 
                 'hospede' as tipo_pessoa,
                 $1 as hospede_id,
                 date_value as data,
                 $3 as almoco_colegio,
                 $4 as janta_colegio
             FROM unnest($2::date[]) as date_value
             RETURNING *`,
            [hospede_id, dates, almoco, janta]
        );

        if (mealResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Failed to create meals' 
            });
        }

        await client.query('COMMIT');

        return res.status(201).json({ 
            message: 'Accommodation created successfully', 
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to create accommodation' 
        });
    } finally {
        await client.release();
    }
}

export async function updateAccommodation(req, res) {
    const { accommodationId } = req.params;
    const { data_chegada, data_saida, quarto_id, almoco, janta, observacoes } = req.body;

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE hospedagem
             SET data_chegada = $1,
                 data_saida = $2,
                 quarto_id = $3,
                 almoco = $4,
                 janta = $5
             WHERE id = $6
             RETURNING *`,
            [data_chegada, data_saida, quarto_id, almoco, janta, accommodationId]
        );

        const hospedeId = result.rows[0].hospede_id;

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Accommodation not found'});
        }

        const guestResult = await client.query(
            `UPDATE hospede
             SET observacoes = $1
             WHERE id = $2
             RETURNING *`,
            [observacoes, hospedeId]
        );

        if (guestResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Guest not found'});
        }

        // First, delete existing meals for this hospede
        await client.query(
            `DELETE FROM refeicao WHERE hospede_id = $1`,
            [hospedeId]
        );

        if (almoco || janta) {
            const dates = getListOfDatesFromCheckInToCheckOut(data_chegada, data_saida);
            // Then, create new meals for the new dates (if dates are provided)
            if (dates && dates.length > 0) {
                const mealResult = await client.query(
                    `INSERT INTO refeicao (tipo_pessoa, hospede_id, data, almoco_colegio, janta_colegio)
                    SELECT 'hospede', $1, unnest($2::date[]), $3, $4
                    RETURNING *`,
                    [hospedeId, dates, Boolean(almoco), Boolean(janta)]
                );

                if (mealResult.rowCount === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ message: 'Failed to create meals' 
                    });
                }
            }
        }

        await client.query('COMMIT');

        return res.status(200).json({ 
            message: 'Accommodation updated successfully', 
            data: result.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to update accommodation' 
        });
    } finally {
        await client.release();
    }
}

export async function deleteAccommodation(req, res) {
    const { accommodationId } = req.params;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // First, get the hospede_id from the accommodation
        const accommodationResult = await client.query(
            `DELETE FROM hospedagem WHERE id = $1
             RETURNING *`,
            [accommodationId]
        );

        if (accommodationResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                message: 'Accommodation not found' 
            });
        }

        const hospedeId = accommodationResult.rows[0].hospede_id;
        const data_chegada = accommodationResult.rows[0].data_chegada;
        const data_saida = accommodationResult.rows[0].data_saida;

        // Delete all refeicao records for this hospede
        const refeicaoResult = await client.query(
            `
            DELETE FROM refeicao 
            WHERE hospede_id = $1
            AND data >= $2 AND data <= $3
            `,
            [hospedeId, data_chegada, data_saida]
        );

        await client.query('COMMIT');

        return res.status(200).json({ 
            message: 'Accommodation and related meals deleted successfully', 
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to delete accommodation' 
        });
    } finally {
        client.release();
    }
}

// ROOMS (quarto)
export async function getRooms(req, res) {

    try {
        const result = await pool.query(`SELECT * FROM quarto WHERE active = TRUE`);

        return res.status(200).json({
            message: result.rows.length > 0 ? 'Rooms fetched successfully' : 'No rooms found',
            data: result.rows
            
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to fetch rooms' 
        });
    }
}

export async function getAllRooms(req, res) {

    try {
        const result = await pool.query(`SELECT * FROM quarto`);

        return res.status(200).json({
            message: result.rows.length > 0 ? 'Rooms fetched successfully' : 'No rooms found',
            data: result.rows
            
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
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to fetch guests' 
        });
    }
}

export async function createQuickGuest(req, res) {
    const { nome } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO hospede (nome)
             VALUES ($1)
             RETURNING *`,
            [nome]
        );

        return res.status(201).json({
            message: 'Guest created successfully', 
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to create guest' 
        });
    }
}

export async function createGuest(req, res) {
    const { nome, genero, tipo_documento, num_documento, funcao, origem, observacoes } = req.body;

    if (!nome || !genero || !tipo_documento || !num_documento) {
        return res.status(400).json({ 
            message: 'nome, genero, tipo_documento and num_documento are required' 
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO hospede (nome, genero, tipo_documento, num_documento, funcao, origem, observacoes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [nome, genero, tipo_documento, num_documento, funcao || '', origem || '', observacoes || '']
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
    const { nome, genero, tipo_documento, num_documento, funcao, origem, observacoes } = req.body;

    try {
        const result = await pool.query(
            `UPDATE hospede
             SET nome = COALESCE($1, nome),
                 genero = COALESCE($2, genero),
                 tipo_documento = COALESCE($3, tipo_documento),
                 num_documento = COALESCE($4, num_documento),
                 funcao = COALESCE($5, funcao),
                 origem = COALESCE($6, origem),
                 observacoes = COALESCE($7, observacoes)
             WHERE id = $8
             RETURNING *`,
            [nome || null, genero || null, tipo_documento || null, num_documento || null, funcao || '', origem || '', observacoes || '', guestId]
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
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to delete guest' 
        });
    }
}

export async function getRequestNotifications(req, res) {


    try {
        const result = await pool.query(`SELECT COUNT(*) FROM solicitacao WHERE visualizada = FALSE`);

        const count = result.rows[0].count;

        return res.status(200).json({ 
            message: result.rows.length > 0 ? 'Request notifications fetched successfully' : 'No request notifications found',
            data: count
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to fetch request notifications' 
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

export async function toggleActiveRoom(req, res) {

    const { roomId } = req.params;

    try {
        const result = await pool.query(
            `
            UPDATE quarto
            SET active = NOT active
            WHERE id = $1
            RETURNING *`,
            [roomId]
        );

        return res.status(200).json({
            message: 'Room updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to update room' 
        });
    }
}

export async function updateRoom(req, res) {
    const { roomId } = req.params;
    const { numero, capacidade, active } = req.body;

    try {
        const result = await pool.query(
            `
            UPDATE quarto
            SET numero = $1, capacidade = $2, active = $3
            WHERE id = $4
            RETURNING *`,
            [numero, capacidade, active, roomId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Room not found'
            });
        }

        return res.status(200).json({
            message: 'Room updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to update room' 
        });
    }
}

export async function createRoom(req, res) {
    const { numero, capacidade, active } = req.body;

    try {
        const result = await pool.query(
            `
            INSERT INTO quarto (numero, capacidade, active)
            VALUES ($1, $2, $3)
            RETURNING *`,
            [numero, capacidade, active]
        );

        return res.status(201).json({
            message: 'Room created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to create room' 
        });
    }
}

export async function getRoomOccupation(req, res) {

    try {
        const result = await pool.query(`
            SELECT 
                q.id as quarto_id,
                q.capacidade,
                q.numero,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'data_chegada', h.data_chegada,
                            'data_saida', h.data_saida
                        )
                    ) FILTER (WHERE h.id IS NOT NULL),
                    '[]'::json
                ) as ocupacoes
            FROM quarto q
            LEFT JOIN hospedagem h ON q.id = h.quarto_id 
                AND h.data_saida > CURRENT_DATE
            GROUP BY q.id, q.numero
            ORDER BY q.numero ASC
        `);

        return res.status(200).json({
            message: 'Room occupation data found',
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to fetch room occupation data' 
        });
    }
}


export async function getDashboard(req, res) {
    try {
        const { monday, sunday } = getCurrentWeekDates();

        // Query 1: Get all days of the week
        const daysResult = await pool.query(`
            SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS day
        `, [monday, sunday]);

        // Query 2: Get meal counts by day
        const mealsResult = await pool.query(`
            SELECT 
                data,
                COUNT(CASE WHEN almoco_colegio = true THEN 1 END) as almoco_colegio,
                COUNT(CASE WHEN almoco_levar = true THEN 1 END) as almoco_levar,
                COUNT(CASE WHEN janta_colegio = true THEN 1 END) as janta_colegio,
                COUNT(CASE WHEN convidado_id IS NOT NULL THEN 1 END) as convidados
            FROM refeicao 
            WHERE data >= $1 AND data <= $2
            GROUP BY data
        `, [monday, sunday]);

        // Query 3: Get unique hospede count for this week
        const hospedesResult = await pool.query(`
            SELECT COUNT(DISTINCT hospede_id) as hospedes
            FROM hospedagem 
            WHERE (data_chegada <= $2 AND data_saida > $1)
        `, [monday, sunday]);

        // Query 4: Get available rooms count
        const availableRoomsResult = await pool.query(`
            WITH occupied_rooms AS (
                SELECT DISTINCT quarto_id
                FROM hospedagem 
                WHERE (data_chegada <= $2 AND data_saida > $1)
            ),
            total_rooms AS (
                SELECT COUNT(*) as total FROM quarto
            )
            SELECT (tr.total - COALESCE(COUNT(or_table.quarto_id), 0)) as available_rooms
            FROM total_rooms tr
            LEFT JOIN occupied_rooms or_table ON true
            GROUP BY tr.total
        `, [monday, sunday]);

        // Query 5: Get daily hospede counts
        const dailyHospedesResult = await pool.query(`
            WITH week_days AS (
                SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS day
            )
            SELECT 
                wd.day,
                COUNT(DISTINCT h.hospede_id) as hospedes_count
            FROM week_days wd
            LEFT JOIN hospedagem h ON wd.day BETWEEN h.data_chegada AND h.data_saida
            GROUP BY wd.day
            ORDER BY wd.day
        `, [monday, sunday]);

        // Query 6: Get total residents
        const residentsResult = await pool.query('SELECT COUNT(*) as total FROM perfil');

        // Update the dailyStats mapping:
        const dailyStats = daysResult.rows.map(dayRow => {
            const day = dayRow.day.toISOString().split('T')[0];
            
            // Find meal stats for this day
            const mealData = mealsResult.rows.find(m => m.data.toISOString().split('T')[0] === day) || {
                almoco_colegio: 0,
                almoco_levar: 0,
                janta_colegio: 0,
                convidados: 0
            };

            // Find hospede count for this day
            const hospedeData = dailyHospedesResult.rows.find(h => 
                h.day.toISOString().split('T')[0] === day
            ) || { hospedes_count: 0 };

            const totalMeals = parseInt(mealData.almoco_colegio) + parseInt(mealData.almoco_levar) + parseInt(mealData.janta_colegio);

            return {
                day: day,
                dayName: new Date(day).toLocaleDateString('en-US', { weekday: 'long' }),
                almocoColegioCount: parseInt(mealData.almoco_colegio),
                almocoLevarCount: parseInt(mealData.almoco_levar),
                jantaColegioCount: parseInt(mealData.janta_colegio),
                totalMeals: totalMeals,
                convidadosCount: parseInt(mealData.convidados),
                hospedesCount: parseInt(hospedeData.hospedes_count)
            };
        });

        // Update weekTotals
        const weekTotals = {
            almocoColegioCount: dailyStats.reduce((sum, day) => sum + day.almocoColegioCount, 0),
            almocoLevarCount: dailyStats.reduce((sum, day) => sum + day.almocoLevarCount, 0),
            jantaColegioCount: dailyStats.reduce((sum, day) => sum + day.jantaColegioCount, 0),
            totalMeals: dailyStats.reduce((sum, day) => sum + day.totalMeals, 0),
            convidadosCount: dailyStats.reduce((sum, day) => sum + day.convidadosCount, 0),
            hospedesCountWeek: dailyStats.reduce((sum, day) => sum + day.hospedesCount, 0)
        };

        // Update the return data
        return res.status(200).json({
            message: 'Dashboard data retrieved successfully',
            data: {
                dailyStats: dailyStats,
                weekTotals: weekTotals,
                totalMoradores: parseInt(residentsResult.rows[0].total),
                hospedesCount: parseInt(hospedesResult.rows[0].hospedes),
                availableRooms: parseInt(availableRoomsResult.rows[0].available_rooms)
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Failed to retrieve dashboard data'
        });
    }
}

export async function getDashboardReport(req, res) {

    const { monday, sunday } = getCurrentWeekDates();

    try {

        // Query 1: Get meal counts by day
        const mealsResult = await pool.query(`
            SELECT 
                data,
                COUNT(CASE WHEN almoco_colegio = true THEN 1 END) as almoco_colegio_count,
                COUNT(CASE WHEN almoco_levar = true THEN 1 END) as almoco_levar_count,
                COUNT(CASE WHEN (almoco_colegio = true OR almoco_levar = true) THEN 1 END) as total_almoco,
                COUNT(CASE WHEN janta_colegio = true THEN 1 END) as total_janta
            FROM refeicao 
            WHERE data >= $1 AND data <= $2
            GROUP BY data
        `, [monday, sunday]);

        // Query 2: Get all notes from perfil, convidado, and hospede
        const notesResult = await pool.query(`
            WITH meal_people AS (
                SELECT DISTINCT usuario_id, convidado_id, hospede_id
                FROM refeicao 
                WHERE data >= $1 AND data <= $2
            )
            SELECT p.nome_completo as name, p.observacoes as note 
            FROM meal_people mp
            JOIN perfil p ON mp.usuario_id = p.user_id
            WHERE mp.usuario_id IS NOT NULL 
              AND p.observacoes IS NOT NULL 
              AND p.observacoes != ''
            
            UNION ALL
            
            SELECT c.nome as name, c.observacoes as note 
            FROM meal_people mp
            JOIN convidado c ON mp.convidado_id = c.id
            WHERE mp.convidado_id IS NOT NULL 
              AND c.observacoes IS NOT NULL 
              AND c.observacoes != ''
            
            UNION ALL
            
            SELECT h.nome as name, h.observacoes as note 
            FROM meal_people mp
            JOIN hospede h ON mp.hospede_id = h.id
            WHERE mp.hospede_id IS NOT NULL 
              AND h.observacoes IS NOT NULL 
              AND h.observacoes != ''
        `, [monday, sunday]);

        // Format period string (DD/MM format)
        const formatDate = (date) => {
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            return `${day}/${month}`;
        };

        // Portuguese day names starting with Segunda-feira
        const dayNames = [
            'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
            'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'
        ];

        // Generate days using JavaScript
        const daysInfo = [];
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(monday);
            currentDay.setDate(monday.getDate() + i);
            const dayStr = currentDay.toISOString().split('T')[0];
            
            // Find meal data for this day
            const mealData = mealsResult.rows.find(m => 
                m.data.toISOString().split('T')[0] === dayStr
            ) || {
                almoco_colegio_count: 0,
                almoco_levar_count: 0,
                total_almoco: 0,
                total_janta: 0
            };

            const totalRefeicoes = parseInt(mealData.total_almoco) + parseInt(mealData.total_janta);

            daysInfo.push({
                date: formatDate(currentDay),
                day: dayNames[i],
                mealsInfo: {
                    totalAlmoco: parseInt(mealData.total_almoco),
                    totalAlmocoLevar: parseInt(mealData.almoco_levar_count),
                    totalAlmocoColegio: parseInt(mealData.almoco_colegio_count),
                    totalJanta: parseInt(mealData.total_janta),
                    totalRefeicoes: totalRefeicoes
                }
            });
        }

        // Calculate week totals
        const totalAlmoco = daysInfo.reduce((sum, day) => sum + day.mealsInfo.totalAlmoco, 0);
        const totalJantares = daysInfo.reduce((sum, day) => sum + day.mealsInfo.totalJanta, 0);

        // Format week info
        const weekInfo = {
            period: `${formatDate(monday)} a ${formatDate(sunday)}`,
            totalAlmoco: totalAlmoco,
            totalJantares: totalJantares,
            daysInfo: daysInfo
        };

        // Format notes info
        const notesInfo = notesResult.rows.map(row => ({
            name: row.name,
            note: row.note
        }));

        return res.status(200).json({
            message: 'Dashboard report retrieved successfully',
            data: {
                weekInfo: weekInfo,
                notesInfo: notesInfo
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Failed to retrieve dashboard report'
        });
    }
}

export async function getReport(req, res) {

    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);
    
    try {

        // Query 1: Get meal counts by day
        const mealsResult = await pool.query(`
            SELECT 
                data,
                COUNT(CASE WHEN almoco_colegio = true THEN 1 END) as almoco_colegio_count,
                COUNT(CASE WHEN almoco_levar = true THEN 1 END) as almoco_levar_count,
                COUNT(CASE WHEN (almoco_colegio = true OR almoco_levar = true) THEN 1 END) as total_almoco,
                COUNT(CASE WHEN janta_colegio = true THEN 1 END) as total_janta
            FROM refeicao 
            WHERE data >= $1 AND data <= $2
            GROUP BY data
        `, [startDate, endDate]);

        // Query 2: Get all notes from perfil, convidado, and hospede
        const notesResult = await pool.query(`
            WITH meal_people AS (
                SELECT DISTINCT usuario_id, convidado_id, hospede_id
                FROM refeicao 
                WHERE data >= $1 AND data <= $2
            )
            SELECT p.nome_completo as name, p.observacoes as note 
            FROM meal_people mp
            JOIN perfil p ON mp.usuario_id = p.user_id
            WHERE mp.usuario_id IS NOT NULL 
              AND p.observacoes IS NOT NULL 
              AND p.observacoes != ''
            
            UNION ALL
            
            SELECT c.nome as name, c.observacoes as note 
            FROM meal_people mp
            JOIN convidado c ON mp.convidado_id = c.id
            WHERE mp.convidado_id IS NOT NULL 
              AND c.observacoes IS NOT NULL 
              AND c.observacoes != ''
            
            UNION ALL
            
            SELECT h.nome as name, h.observacoes as note 
            FROM meal_people mp
            JOIN hospede h ON mp.hospede_id = h.id
            WHERE mp.hospede_id IS NOT NULL 
              AND h.observacoes IS NOT NULL 
              AND h.observacoes != ''
        `, [startDate, endDate]);

        // Format period string (DD/MM format)
        const formatDate = (date) => {
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            return `${day}/${month}`;
        };

        // Portuguese day names starting with Segunda-feira
        const dayNames = [
            'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
            'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'
        ];

        // Generate days using JavaScript
        const daysInfo = [];
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);
            const dayStr = currentDay.toISOString().split('T')[0];
            
            // Find meal data for this day
            const mealData = mealsResult.rows.find(m => 
                m.data.toISOString().split('T')[0] === dayStr
            ) || {
                almoco_colegio_count: 0,
                almoco_levar_count: 0,
                total_almoco: 0,
                total_janta: 0
            };

            const totalRefeicoes = parseInt(mealData.total_almoco) + parseInt(mealData.total_janta);

            daysInfo.push({
                date: formatDate(currentDay),
                day: dayNames[i],
                mealsInfo: {
                    totalAlmoco: parseInt(mealData.total_almoco),
                    totalAlmocoLevar: parseInt(mealData.almoco_levar_count),
                    totalAlmocoColegio: parseInt(mealData.almoco_colegio_count),
                    totalJanta: parseInt(mealData.total_janta),
                    totalRefeicoes: totalRefeicoes
                }
            });
        }

        // Calculate week totals
        const totalAlmoco = daysInfo.reduce((sum, day) => sum + day.mealsInfo.totalAlmoco, 0);
        const totalJantares = daysInfo.reduce((sum, day) => sum + day.mealsInfo.totalJanta, 0);

        // Format week info
        const weekInfo = {
            period: `${formatDate(startDate)} a ${formatDate(endDate)}`,
            totalAlmoco: totalAlmoco,
            totalJantares: totalJantares,
            daysInfo: daysInfo
        };

        // Format notes info
        const notesInfo = notesResult.rows.map(row => ({
            name: row.name,
            note: row.note
        }));

        return res.status(200).json({
            message: 'Report retrieved successfully',
            data: {
                weekInfo: weekInfo,
                notesInfo: notesInfo
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Failed to retrieve report'
        });
    }
}