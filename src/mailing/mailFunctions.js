import { reminderHtml, confirmationHtml, resetPasswordHtml } from "./htmlTemplates.js";
import { sendEmailAWS, sendEmailMailerSend } from "./mailer.js";
import pool from "../db.js";
import { getCurrentWeekDates } from "../utils.js";

export async function SendResetPasswordEmail(email, nome_completo, resetLink) {

    const htmlContent = resetPasswordHtml(nome_completo, resetLink);

    try {
        await sendEmailAWS({
            to: email,
            subject: "Altere sua senha",
            html: htmlContent,
        });

        /*
        await sendEmailMailerSend({
            to: email,
            subject: "Altere sua senha",
            html: htmlContent,
        });
        */
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
            `);

        for (const user of users.rows) {

            if (user.email !== "cafegabriel1@gmail.com") continue;

            const htmlContent = reminderHtml(user.nome_completo);

            await sendEmailAWS({
                to: user.email,
                subject: "Agende suas refeições até hoje às 19h",
                html: htmlContent,
            });

            /*
            await sendEmailMailerSend({
                to: user.email,
                subject: "Agende suas refeições até hoje às 19h",
                html: htmlContent,
            });
            */
        }
    } catch (err) {
        console.error("Error sending notification emails:", err);
    }
}

export async function SendConfirmationEmail() {

    const { sunday, monday } = getCurrentWeekDates();

    try {

        const users = await pool.query(`
            SELECT ua.id, p.nome_completo, ua.email 
            FROM user_auth ua
            JOIN perfil p on ua.id = p.user_id
        `);

        for (const user of users.rows) {

            const meals = await pool.query(`
                SELECT r.data, r.almoco_colegio, r.almoco_levar, r.janta_colegio
                FROM refeicao r
                WHERE r.usuario_id = $1
                AND r.data >= $2 AND r.data <= $3
                ORDER BY r.data DESC
            `, [user.id, monday, sunday]);

            const htmlContent = confirmationHtml(user.nome_completo, monday, meals.rows);

            await sendEmailAWS({
                to: user.email,
                subject: "Confirmação de agendamento de refeições",
                html: htmlContent,
            });

            /*
            await sendEmailMailerSend({
                to: user.email,
                subject: "Confirmação de agendamento de refeições",
                html: htmlContent,
            });
            */
        }
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
        `);

        for (const user of users.rows) {

            const htmlContent = reminderHtml(user.nome_completo);

            await sendEmailAWS({
                to: user.email,
                subject: "Agende suas refeições até hoje às 19h",
                html: htmlContent,
            });

            /*
            await sendEmailMailerSend({
                to: user.email,
                subject: "Agende suas refeições até hoje às 19h",
                html: htmlContent,
            });
            */
        }
    } catch (err) {
        console.error("Error sending update emails:", err);
    }
}