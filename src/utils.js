import pool from "./db.js";
import crypto from "crypto";

export function getCurrentWeekDates() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    const daysToMonday = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    console.log(monday, sunday);
    
    return { monday, sunday };
}

// Gets the current week dates but from sunday to next sunday
export function getCurrentWeekInfoRegular() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToSunday = dayOfWeek === 0 ? 0 : dayOfWeek; // Days to go back to Sunday
    
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - daysToSunday);

    const weekDates = [];
    for (let i = 0; i < 8; i++) {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + i);
        weekDates.push(date);
    }

    const nextSunday = new Date(sunday);
    nextSunday.setDate(sunday.getDate() + 7);

    console.log('new format ',weekDates[1], weekDates[7]);

    return {
        weekNumber,
        weekDates,
        monday: weekDates[1],
        sunday: weekDates[7]
    }
}



export function isPasswordValid(password, username, birthdate) {
    if (password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        !password.includes(username) &&
        !password.includes(birthdate)
    ) 
    {
        return true;
    } 
    else
    {
        return false;
    }
}

export function sqlValuesString(array, num_columns) {

    // Maps the array and number of columns in the array(table)
    // join them to create an string like this "(x,y), (z,w), ..."
    // This string can be used when inserting many entities at once

    const valuesString = array.map((obj, index) => {
        let rowString = '(';
        const start = index * num_columns;

        for (var i = 1; i < num_columns+1; i++) {
            rowString += `$${start + i},`
        }

        // Remove last comma and close row
        rowString = rowString.slice(0, -1) + ')';

        return rowString;
    }).join(', ');

    return valuesString;

    // A flatmap needs to be used later for the query second parameter
    // A flatmap creates a flat (1D) array with the data from all objects
}

// In utils.js or a new services folder
export async function getUserLoginData(userId) {
    // Get profile
    const profileQuery = `
        SELECT p.avatar_image_data, p.nome_completo, ua.email
        FROM user_auth ua
        JOIN perfil p on ua.id = p.user_id
        WHERE ua.id = $1
    `;
    const profileResult = await pool.query(profileQuery, [userId]);
    
    // Get meals for current week
    const { monday, sunday } = getCurrentWeekDates();
    const mealsQuery = `
        SELECT * FROM refeicao 
        WHERE usuario_id = $1 
        AND data >= $2 
        AND data <= $3
    `;
    const mealsResult = await pool.query(mealsQuery, [userId, monday, sunday]);
    
    return {
        profile: profileResult.rows[0],
        meals: mealsResult.rows
    };
}

export const getListOfDatesFromCheckInToCheckOut = (data_chegada, data_saida) => {
    const dates = [];
    const currentDate = new Date(data_chegada);
    while (currentDate <= new Date(data_saida)) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

export function generateResetToken() {
    return crypto.randomBytes(32).toString("hex"); // secure random token
  }

// Canonical "1 hospedagem + observacoes do hospede + N refeicao (por dia)".
// Roda numa transação JÁ ABERTA do chamador (client). NÃO faz BEGIN/COMMIT/
// ROLLBACK/release — quem chama controla a transação. Lança Error em falha.
// Usado por createAccommodation (1x), validatePreReserva e createAccommodationGroup (Nx).
// Café da manhã não existe no sistema: só almoco/janta viram refeicao.
//
// uso: const hosp = await createHospedagemForHospede(client, {
//   anfitriao_id, hospede_id, data_chegada, data_saida, quarto_id,
//   almoco, janta, observacoes });
export async function createHospedagemForHospede(client, {
    anfitriao_id, hospede_id, data_chegada, data_saida, quarto_id,
    almoco, janta, observacoes,
}) {
    const hospResult = await client.query(
        `INSERT INTO hospedagem (anfitriao_id, hospede_id, data_chegada, data_saida, quarto_id, almoco, janta)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6, false), COALESCE($7, false))
         RETURNING *`,
        [anfitriao_id, hospede_id, data_chegada, data_saida, quarto_id, almoco, janta]
    );
    if (hospResult.rows.length === 0) {
        throw new Error('Failed to create hospedagem');
    }

    const obsResult = await client.query(
        `UPDATE hospede SET observacoes = $1 WHERE id = $2`,
        [observacoes?.trim() ?? null, hospede_id]
    );
    if (obsResult.rowCount === 0) {
        throw new Error('Failed to update hospede observacoes');
    }

    const dates = getListOfDatesFromCheckInToCheckOut(data_chegada, data_saida);
    const mealResult = await client.query(
        `INSERT INTO refeicao (tipo_pessoa, hospede_id, data, almoco_colegio, janta_colegio)
         SELECT 'hospede' as tipo_pessoa, $1 as hospede_id, date_value as data,
                $3 as almoco_colegio, $4 as janta_colegio
         FROM unnest($2::date[]) as date_value
         RETURNING *`,
        [hospede_id, dates, almoco, janta]
    );
    if (mealResult.rowCount === 0) {
        throw new Error('Failed to create meals');
    }

    return hospResult.rows[0];
}