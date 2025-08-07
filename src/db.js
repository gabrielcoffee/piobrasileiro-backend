import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.on('connect', () => {
    console.log('Connected to the postgreSQL database');
    console.log('conectando usuario:', process.env.DB_USER);
});

pool.on('error', (err, client) => {
    console.error('Error in the conection with the postgreSQL database', err);
    process.exit(-1);
});

export default pool;