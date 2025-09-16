/// AWS SES

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: "sa-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function sendEmailAWS({ to, subject, html }) {
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


/// MailerSend

import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

const sentFrom = new Sender("notifications@piobrasileiroapp.com", "Pio Brasileiro");

export async function sendEmailMailerSend({ to, subject, html }) {
  const recipients = [new Recipient(to)];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject(subject)
    .setHtml(html)
    .setText(html.replace(/<[^>]+>/g, ""));

  return mailerSend.email.send(emailParams);
}