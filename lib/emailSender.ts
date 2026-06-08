import nodemailer from "nodemailer";

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass || pass.startsWith("xxxx")) {
    throw new Error("Gmail SMTP is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env");
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
  });
}

export async function sendEmail({ to, subject, body }: SendEmailInput) {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER;
  return transporter.sendMail({
    from,
    to,
    subject,
    text: body,
    html: body.replace(/\n/g, "<br/>"),
  });
}

export async function verifyEmailConnection() {
  const transporter = getTransporter();
  return transporter.verify();
}
