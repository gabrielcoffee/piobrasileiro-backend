import pool from '../db.js';

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

        res.status(200).json({
            message: 'Perfil fetched successfully',
            data: result.rows[0]
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

        res.status(200).json({
            message: "Nome do perfil atualizado",
            body: result.rows[0]
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




    } catch (error) {
        console.log(error);
        return res.status(404).json({
            message: "Failed to change password"
        })
    }
}


/*
router.put('/perfil/senha', authMiddleware, updateUserPassword);

router.get('/weekmeals', authMiddleware, getWeekMeals);
router.post('/refeicao',  authMiddleware, createRefeicao);
router.put('/refeicao/:id', authMiddleware, updateRefeicao);
*/

export async function getWeekMeals(req, res) {

    const userId = req.userId;

    try {
        const result = await pool.query(`
            SELECT *
            FROM refeicao
            WHERE usuario_id = $1
            `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Perfil not found' 
            })
        }

        res.status(200).json({
            message: 'Perfil fetched successfully',
            data: result.rows[0]
        })
    } catch (error) {
        console.log(error);
        return res.status(403).json({
            message: 'There was an error fetching the perfil'
        })
    }
}