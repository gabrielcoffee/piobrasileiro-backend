import pool from "./db.js";

export function getCurrentWeekDates() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    const daysToMonday = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
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