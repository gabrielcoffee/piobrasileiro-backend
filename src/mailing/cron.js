import cron from "node-cron";
import { SendReminderEmail } from "./mailFunctions.js";


// change this to run every sunday at 08:00
// 0 minutos, 8 horas, 0 (sunday) dia da semana
cron.schedule("0 8 * * 0", async () => {
    console.log("Running Sunday notification...");
    SendReminderEmail();
});

