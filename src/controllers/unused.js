
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