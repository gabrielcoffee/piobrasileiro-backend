import cron from "node-cron";
import { SendConfirmationEmail } from "./mailFunctions.js";

// Runs every Sunday at 08:00
/*
cron.schedule("* * * * *", async () => {
    console.log("Running Sunday notification...");
    SendConfirmationEmail();
});
*/