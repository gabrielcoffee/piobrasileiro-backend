import pool from '../db.js';
import { isPasswordValid, getCurrentWeekDates, sqlValuesString } from '../utils.js';
import bcrypt from 'bcryptjs';

export async function getCommonPerfil(req, res) {

    const userId = req.userId;

    try {
        const result = await pool.query(`
            SELECT p.avatar_url, p.nome_completo, ua.email
            FROM user_auth ua
            JOIN perfil p on ua.id = p.user_id
            WHERE ua.id = $1
            `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Perfil not found' 
            })
        }

        return res.status(200).json({
            message: 'Perfil fetched successfully',
            data: {
                profile: result.rows[0]
            }
        })
    } catch (error) {
        console.log(error);
        return res.status(403).json({
            message: 'There was an error fetching the perfil'
        })
    }
}

export async function updatePerfilName(req, res) {

    const userId = req.userId;
    const { nome_completo } = req.body;

    try {
        const query = `
            UPDATE perfil
            SET nome_completo = $1
            WHERE user_id = $2
            RETURNING nome_completo
        `

        const result = await pool.query(query, [nome_completo, userId]);

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

/*
router.put('/perfil/senha', authMiddleware, updateUserPassword);

router.get('/weekmeals', authMiddleware, getWeekMeals);
router.post('/refeicao',  authMiddleware, createRefeicao);
router.put('/refeicao/:id', authMiddleware, updateRefeicao);
*/



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
                message: 'Wrong old password'
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
        `

        const resultChange = await pool.query(
            queryChangePassword,
            [newPasswordHashed, userId]
        )

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

export async function getUserMeals(req, res) {

    const userId = req.userId;
    const { monday, sunday } = getCurrentWeekDates();

    try {
        const query = `
            SELECT * FROM refeicao 
            WHERE data >= $1 
            AND data <= $2
            WHERE usuario_id = $3
        `;

        const result = await pool.query(
            query,
            [monday, sunday, userId]
        );

        if (result.rows.length === 0){
            return res.status(404).json({
                message: "No meals found"
            })
        }

        return res.status(200).json({
            message: "Successfully fetched meals",
            data: {
                meals: result.rows
            }
        })
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

    try {
        const query = `
            INSERT INTO refeicao (tipo_pessoa, usuario_id, data, almoco_colegio, almoco_levar, janta_colegio, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `

        const result = await pool.query(
            query, 
            [tipo_pessoa, userId, data, almoco_colegio, almoco_levar, janta_colegio, observacoes]
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

    // Add the userId to each meal
    const mealsToInsert = meals.map((meal) => {
        return {
            tipo_pessoa: meal.tipo_pessoa,
            usuario_id: userId,
            data: meal.data,
            almoco_colegio: meal.almoco_colegio || false,
            almoco_levar: meal.almoco_levar || false,
            janta_colegio: meal.janta_colegio || false,
            observacoes: meal.observacoes || null
        }
    })

    try {
        // Create the Bulk insert String
        const valuesString = sqlValuesString(mealsToInsert, 7);

        // Create the flat (1D) array with all the data from every meal
        const flatValues = mealsToInsert.flatMap(meal => [
            meal.tipo_pessoa,
            userId,
            meal.data,
            meal.almoco_colegio,
            meal.almoco_levar,
            meal.janta_colegio,
            meal.observacoes
        ]);

        
        // Insert the meals into the database
        const query = `
            INSERT INTO refeicao (tipo_pessoa, usuario_id, data, almoco_colegio, almoco_levar, janta_colegio, observacoes)
            VALUES ${valuesString}
            ON CONFLICT (usuario_id, data)
            DO UPDATE SET
                almoco_colegio = EXCLUDED.almoco_colegio,
                almoco_levar = EXCLUDED.almoco_levar,
                janta_colegio = EXCLUDED.janta_colegio,
                observacoes = EXCLUDED.observacoes
            RETURNING *
        `

        const result = await pool.query(query, flatValues);

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