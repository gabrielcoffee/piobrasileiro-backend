import { reminderHtml, confirmationHtml, resetPasswordHtml, welcomeHtml } from "./htmlTemplates.js";
import { sendEmailMailerSend } from "./mailer.js";
import pool from "../db.js";
import { getCurrentWeekInfoRegular } from "../utils.js";

export async function SendResetPasswordEmail(email, nome_completo, resetLink) {
    try {

        const htmlContent = resetPasswordHtml(nome_completo, resetLink);
    
        await sendEmailMailerSend({
            to: email,
            subject: "Altere sua senha",
            html: htmlContent,
        });
    } catch (err) {
        console.error("Error sending reset password email:", err);
    }
}

export async function SendReminderEmail() {
    try {

        const users = await pool.query(`
            SELECT p.nome_completo, ua.email 
            FROM user_auth ua
            JOIN perfil p on ua.id = p.user_id
            WHERE ua.active = true
            `);

        for (const user of users.rows) {

            const htmlContent = reminderHtml(user.nome_completo);
            
            await sendEmailMailerSend({
                to: user.email,
                subject: "Agende suas refeições até hoje às 19h",
                html: htmlContent,
            });
        }
    } catch (err) {
        console.error("Error sending notification emails:", err);
    }
}

export async function SendWelcomeEmailToAllUsersNow() {
    try {
        const users = await pool.query(`
            SELECT p.nome_completo, ua.email 
            FROM user_auth ua
            JOIN perfil p on ua.id = p.user_id
            WHERE ua.active = true
            `);

        for (const user of users.rows) {
            await SendWelcomeEmail(user.nome_completo, user.email);
        }
    } catch (err) {
        console.error("Error sending welcome emails:", err);
    }
}

export async function SendWelcomeEmail(nome_completo, email) {
    try {

        const htmlContent = welcomeHtml(nome_completo, email);
        
        await sendEmailMailerSend({
            to: email,
            subject: "Bem-vindo ao App do Colégio Pio Brasileiro!",
            html: htmlContent,
        });
    } catch (err) {
        console.error("Error sending notification emails:", err);
    }
}

export async function SendConfirmationEmail(userId) {

    const { monday, sunday } = getCurrentWeekInfoRegular();

    try {

        const userResult = await pool.query(`
            SELECT p.nome_completo, ua.email
            FROM user_auth ua
            JOIN perfil p on ua.id = p.user_id
            WHERE ua.id = $1
        `, [userId]);

        const nome_completo = userResult.rows[0].nome_completo;
        const email = userResult.rows[0].email;


        const mealsResult = await pool.query(`
            SELECT r.data, r.almoco_colegio, r.almoco_levar, r.janta_colegio
            FROM refeicao r
            WHERE r.usuario_id = $1
            AND r.data >= $2 AND r.data <= $3
            ORDER BY r.data DESC
        `, [userId, monday, sunday]);

        const meals = mealsResult.rows;


        const htmlContent = confirmationHtml(nome_completo, monday, meals);
        await sendEmailMailerSend({
            to: email,
            subject: "Confirmação de agendamento de refeições",
            html: htmlContent,
        });

    } catch (err) {
        console.error("Error sending confirmation emails:", err);
    }
}



export async function SendUpdateEmail() {
    try {

        const users = await pool.query(`
            SELECT p.nome_completo, ua.email 
            FROM user_auth ua
            JOIN perfil p on ua.id = p.user_id
            WHERE ua.active = true
        `);

        for (const user of users.rows) {

            const htmlContent = reminderHtml(user.nome_completo);

            await sendEmailMailerSend({
                to: user.email,
                subject: "Agende suas refeições até hoje às 19h",
                html: htmlContent,
            });
        }
    } catch (err) {
        console.error("Error sending update emails:", err);
    }
}