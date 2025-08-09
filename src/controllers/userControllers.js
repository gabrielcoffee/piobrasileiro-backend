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
            return res.status(404).json({ message: 'Perfil not found' })
        }

        res.status(200).json({
            message: 'Perfil fetched successfully',
            data: result.rows[0]
        })
    } catch (error) {
        console.log(error);
        res.status(403).json({
            message: 'There was an error fetching the perfil'
        })
    }
}