import pool from '../db.js';

export async function getCommonPerfil(req, res) {

    // Get the user from the database
    const result = await pool.query(`
        SELECT p.avatar_url, p.nome_completo, ua.email
        FROM user_auth ua
        JOIN perfil p on ua.id = p.user_id
        WHERE ua.id = $1
        `, [req.userId]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Perfil not found' })
    }

    res.status(200).json({
        message: 'Perfil fetched successfully',
        data: result.rows[0]
    })
}