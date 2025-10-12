import pool from '../db.js';
import { SendConfirmationEmail } from '../mailing/mailFunctions.js';
import { isPasswordValid, getCurrentWeekInfoRegular, sqlValuesString } from '../utils.js';
import bcrypt from 'bcryptjs';

export async function getCommonPerfil(req, res) {

    const userId = req.userId;

    try {
        const result = await pool.query(`
            SELECT ua.tipo_usuario AS role, p.avatar_image_data AS avatar, p.nome_completo AS fullname, ua.email AS email
            FROM user_auth ua
            JOIN perfil p on ua.id = p.user_id
            WHERE ua.id = $1
            `, [userId]);

        return res.status(200).json({
            message: result.rows.length > 0 ? 'Perfil fetched successfully' : 'Perfil not found',
            data: result.rows[0] || null
        });
    } catch (error) {
        console.log(error);
        return res.status(403).json({
            message: 'There was an error fetching the perfil'
        });
    }
}

export async function updatePerfilName(req, res) {

    const userId = req.userId;
    const { nome_completo } = req.body;

    // Trim string fields
    const trimmedNomeCompleto = nome_completo?.trim();

    try {
        const query = `
            UPDATE perfil
            SET nome_completo = $1
            WHERE user_id = $2
            RETURNING nome_completo
        `

        const result = await pool.query(query, [trimmedNomeCompleto, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                meesage: "No user found to update the nome_completo field"
            })
        }

        return res.status(200).json({
            message: "Nome do perfil atualizado",
            data: {
                profile: result.rows[0]
            }
        })

    } catch (error) {
        console.log(error);
        return res.status(404).json({
            message: "Failed to update username"
        })
    }

}

export async function updateUserPassword(req, res) {

    const userId = req.userId;
    const { oldPassword, newPassword } = req.body;

    try {

        const query = `
            SELECT p.nome_completo, p.data_nasc, ua.password
            FROM user_auth ua
            JOIN perfil p
            ON p.user_id = ua.id
            WHERE ua.id = $1
        `

        const result = await pool.query(
            query,
            [userId]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User not found to change password"
            })
        }

        // Get the data in variables
        const savedHashedPassword = result.rows[0].password;
        const nome = result.rows[0].nome_completo;
        const data_nasc = result.rows[0].data_nasc;
        
        const validPassword = await bcrypt.compare(oldPassword, savedHashedPassword);
        if (!validPassword) {
            return res.status(401).json({
                message: 'Wrong old password',
                error: 'Wrong old password'
            })
        }

        // Password is valid now check the newPassword 
        if (!isPasswordValid(newPassword, nome, data_nasc)) {
            return res.status(401).json({
                message: 'Invalid new password'
            })
        }

        // Hash the new password, query the database to change it
        const newPasswordHashed = await bcrypt.hash(newPassword, 10);

        const queryChangePassword = `
            UPDATE user_auth
            SET password = $1
            WHERE id = $2
            returning *
        `;

        const resultChange = await pool.query(
            queryChangePassword,
            [newPasswordHashed, userId]
        )

        if (resultChange.rowCount === 0) {
            return res.status(400).json({
                message: "Failed to change password"
            })
        }

        return res.status(200).json({
            message: "Successfully changed user password",
            data: {
                message: "Password updated successfully"
            }
        })

    } catch (error) {
        console.log(error);
        return res.status(404).json({
            message: "Failed to change password"
        })
    }
}

// Gets all the meals from ONLY the user from the week
export async function getUserMeals(req, res) {

    const userId = req.userId;

    const { monday, sunday } = getCurrentWeekInfoRegular();

    try {
        const convidadoResult = await pool.query(
            'SELECT id, nome FROM convidado WHERE anfitriao_id = $1',
            [userId]
        );

        const convidadoIds = convidadoResult.rows.map(convidado => convidado.id);

        const query = `
            SELECT r.*, c.nome AS convidado_nome
            FROM refeicao r
            LEFT JOIN convidado c
            ON r.convidado_id = c.id
            WHERE data >= $1 
            AND data <= $2
            AND (
                (tipo_pessoa = 'usuario' AND usuario_id = $3)
                OR
                (tipo_pessoa = 'convidado' AND convidado_id = ANY($4))
            )
        `;

        const result = await pool.query(
            query,
            [monday, sunday, userId, convidadoIds]
        );

        const blockedDatesResult = await pool.query(
            'SELECT data FROM datas_refeicao_bloqueadas'
        );

        const userMeals = result.rows.filter(meal => meal.tipo_pessoa === 'usuario');
        const guestMeals = result.rows.filter(meal => meal.tipo_pessoa === 'convidado');
        const blockedDates = blockedDatesResult.rows.map(date => date.data.toISOString().split('T')[0]);

        return res.status(200).json({
            message: result.rows.length > 0 ? "Successfully fetched meals" : "No meals found",
            data: {
                userMeals: userMeals,
                guestMeals: guestMeals,
                blockedDates: blockedDates
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'Failed to fetch meals' 
        });
    }
}

export async function createMeal(req, res) {
    const userId = req.userId;
    const { tipo_pessoa, data, almoco_colegio, almoco_levar, janta_colegio, observacoes } = req.body;

    // Trim string fields
    const trimmedTipoPessoa = tipo_pessoa?.trim();
    const trimmedObservacoes = observacoes?.trim();

    try {
        const query = `
            INSERT INTO refeicao (tipo_pessoa, usuario_id, data, almoco_colegio, almoco_levar, janta_colegio, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `

        const result = await pool.query(
            query, 
            [trimmedTipoPessoa, userId, data, almoco_colegio, almoco_levar, janta_colegio, trimmedObservacoes]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Failed to create meal"
            })
        }

        return res.status(200).json({
            message: "Meal created successfully",
            data: {
                meal: result.rows[0]
            }
        })
    } catch(error) {
        console.log(error);
        return res.status(404).json({
            message: "Failed to create meal"
        })
    }
}

export async function upsertMeals(req, res) {
    const userId = req.userId;
    const meals = req.body.meals;

    if (!meals) {
        return res.status(400).json({
            message: "No meals provided"
        })
    }

    // Add the userId to each meal
    const mealsToInsert = meals.map((meal) => {
        return {
            tipo_pessoa: 'usuario',
            usuario_id: userId,
            data: meal.data,
            almoco_colegio: meal.almoco_colegio || false,
            almoco_levar: meal.almoco_levar || false,
            janta_colegio: meal.janta_colegio || false,
        }
    })

    try {
        // Create the Bulk insert String
        const valuesString = sqlValuesString(mealsToInsert, 6);

        // Create the flat (1D) array with all the data from every meal
        const flatValues = mealsToInsert.flatMap(meal => [
            meal.tipo_pessoa,
            meal.usuario_id,
            meal.data,
            meal.almoco_colegio,
            meal.almoco_levar,
            meal.janta_colegio,
        ]); 

        
        // Insert the meals into the database
        const query = `
            INSERT INTO refeicao (tipo_pessoa, usuario_id, data, almoco_colegio, almoco_levar, janta_colegio)
            VALUES ${valuesString}
            ON CONFLICT (usuario_id, data)
            DO UPDATE SET
                almoco_colegio = EXCLUDED.almoco_colegio,
                almoco_levar = EXCLUDED.almoco_levar,
                janta_colegio = EXCLUDED.janta_colegio
            RETURNING *
        `

        const result = await pool.query(query, flatValues);

        try {
            await SendConfirmationEmail(userId);
        } catch (error) {
            console.error("Could not send confirmation email", error);
        }

        return res.status(200).json({
            message: "Meals created successfully",
            data: {
                meals: result.rows
            }
        })
    } catch(error) {
        console.log(error);
        return res.status(404).json({
            message: "Failed to create meals"
        })
    }
}

export async function getGuestMeals(req, res) {
    const userId = req.userId;
    const { monday, sunday } = getCurrentWeekInfoRegular();

    try {
        const convidadoResult = await pool.query(
            'SELECT id FROM convidado WHERE anfitriao_id = $1',
            [userId]
        );

        const convidadoIds = convidadoResult.rows.map(convidado => convidado.id);

        const query = `
            SELECT r.*, c.nome AS convidado_nome
            FROM refeicao r
            LEFT JOIN convidado c
            ON r.convidado_id = c.id
            WHERE data >= $1 
            AND data <= $2
            AND tipo_pessoa = 'convidado'
            AND convidado_id = ANY($3)
        `;

        const result = await pool.query(
            query,
            [monday, sunday, convidadoIds]
        );

        if (result.rows.length === 0) {
            return res.status(200).json({
                message: "No guest meals found",
                data: {
                    guestMeals: []
                }
            });
        }

        return res.status(200).json({
            message: "Successfully fetched guest meals",
            data: {
                guestMeals: result.rows
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Failed to fetch guest meals'
        });
    }
}

export async function createGuestMeal(req, res) {
    const userId = req.userId;
    const { data, nome, funcao, origem } = req.body;

    // Trim string fields
    const trimmedNome = nome?.trim();
    const trimmedFuncao = funcao?.trim();
    const trimmedOrigem = origem?.trim();

    try {
        // First, create the convidado
        const convidadoQuery = `
            INSERT INTO convidado (anfitriao_id, nome, funcao, origem)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `;

        const convidadoResult = await pool.query(
            convidadoQuery,
            [userId, trimmedNome, trimmedFuncao, trimmedOrigem]
        );


        if (convidadoResult.rows.length === 0) {
            return res.status(404).json({
                message: "Failed to create convidado"
            });
        }

        const convidadoId = convidadoResult.rows[0].id;

        // Then, create the meal for the convidado
        const mealQuery = `
            INSERT INTO refeicao (tipo_pessoa, convidado_id, data, almoco_colegio)
            VALUES ('convidado', $1, $2, true)
            RETURNING *
        `;

        const mealResult = await pool.query(
            mealQuery,
            [convidadoId, data]
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
    
    const { id } = req.params;

    try {
        // First, get the convidado_id from the meal
        const getConvidadoQuery = `
            SELECT convidado_id FROM refeicao
            WHERE id = $1
        `;

        const convidadoResult = await pool.query(
            getConvidadoQuery,
            [id]
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
            [id]
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

export async function emailForgotPassword(req, res) {
    const { email } = req.body;

    // Trim string fields
    const trimmedEmail = email?.trim();

    try {
        const result = await pool.query(`SELECT * FROM user_auth WHERE email = $1`, [trimmedEmail]);

        if (result.rows.length === 0) {
            return res.status(400).json({
                message: "Failed to find user with this email"
            });
        }

        return res.status(200).json({
            message: "Email sent successfully",
            data: {
                email: email
            }
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Failed to send email'
        });
    }
}

export async function updatePerfilAvatar(req, res) {
    const userId = req.userId;
    const avatar_image_data = req.file.buffer;

    console.log(avatar_image_data);

    try {
        const result = await pool.query(
            `UPDATE perfil SET avatar_image_data = $1 WHERE user_id = $2 returning *`,
            [avatar_image_data, userId]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                message: "Failed to update the profile avatar"
            });
        }

        return res.status(200).json({
            message: "Avatar updated successfully",
            data: {
                avatar: avatar_image_data
            }
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Failed to update avatar'
        });
    }
}