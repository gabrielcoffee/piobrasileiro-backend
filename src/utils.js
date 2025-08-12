import pool from "./db";

// Unused since it's a simple app with about 150 users, pagination might be necessary if this would scale to 
// Hundreds of thousands of users, then pagination could be used to improve performance
export async function calculatePagination(currentPage, itemsPerPage = 8, db_table) {

    // Query the database to get the number of entities in the list
    const countResult = await pool.query('SELECT COUNT(*) FROM $1 WHERE active = TRUE', [db_table]);
    const totalItems = parseInt(countResult.rows[0].count);

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const safePage = Math.max(1, Math.min(currentPage, totalPages));
    const offset = (safePage - 1) * itemsPerPage;
    
    return {
        safePage,
        totalPages,
        offset,
        totalItems
    };
}

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