const nodemailer = require("nodemailer");

let transporter = null;

// SMTP is configured through env vars (see .env.example). Without SMTP_HOST the email is
// printed to the server console instead, which is what you want while developing.
const getTransporter = () => {
  if (!process.env.SMTP_HOST) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  return transporter;
};

// Escapes user-provided text before it goes into an HTML email
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();

  if (!t) {
    console.log(`\n[DEV EMAIL — SMTP not configured]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return { logged: true };
  }

  await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  return { sent: true };
}

// Email sending must never break the request that triggered it
const sendMailSafe = (mail) =>
  sendMail(mail).catch((err) => console.error("Email failed:", err.message));


const resetPasswordEmail = (name, link) => ({
  subject: "Reset your password",
  text: `Hi ${name},\n\nUse this link to reset your password (valid for 30 minutes):\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
  html: `<p>Hi ${esc(name)},</p><p>Use this link to reset your password (valid for 30 minutes):</p><p><a href="${esc(link)}">Reset password</a></p><p>If you didn't ask for this, you can ignore this email.</p>`,
});

const statusChangeEmail = (name, jobTitle, company, status) => ({
  subject: `Application update: ${jobTitle} at ${company}`,
  text: `Hi ${name},\n\nYour application for ${jobTitle} at ${company} is now: ${status}.\n\nLog in to see the details.`,
  html: `<p>Hi ${esc(name)},</p><p>Your application for <b>${esc(jobTitle)}</b> at ${esc(company)} is now: <b>${esc(status)}</b>.</p><p>Log in to see the details.</p>`,
});

module.exports = { sendMail, sendMailSafe, resetPasswordEmail, statusChangeEmail };
