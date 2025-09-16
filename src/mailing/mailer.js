// src/mailer.js
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: "sa-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function sendEmail({ to, subject, html }) {
  const command = new SendEmailCommand({
    Source: "notifications@piobrasileiroapp.com",
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: {
        Html: { Data: html },
        Text: { Data: html.replace(/<[^>]+>/g, "") },
      },
    },
  });

  return sesClient.send(command);
}

