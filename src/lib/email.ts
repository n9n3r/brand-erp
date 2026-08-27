import nodemailer from 'nodemailer';

/**
 * Minimal email transport (Nodemailer over SMTP — works with any provider:
 * Gmail/Google Workspace, Resend SMTP, Mailgun, SES, Mailpit, …).
 * Without SMTP_HOST the message is logged to the server console instead,
 * so local testing stays free (see README).
 *
 * Config (all optional):
 *   SMTP_HOST   e.g. "smtp.gmail.com" — required to actually send
 *   SMTP_PORT   default 587 (STARTTLS); 465 uses implicit TLS
 *   SMTP_SECURE "true"/"false" — auto-derived from the port when unset
 *   SMTP_USER   auth user; empty = no auth (local relay)
 *   SMTP_PASS   auth password / app-specific password / token
 *   MAIL_FROM   default "MyBrand <noreply@localhost>"
 */
let cachedTransport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (!cachedTransport) {
    const port = Number(process.env.SMTP_PORT ?? 587) || 587;
    cachedTransport = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' }
        : undefined,
    });
  }
  return cachedTransport;
}

export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    console.log(`[email] (SMTP_HOST not set — not sent)\nTo: ${to}\nSubject: ${subject}\n\n${text}`);
    return;
  }
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM ?? 'MyBrand <noreply@localhost>',
      to,
      subject,
      text,
      html: html ?? `<pre style="white-space:pre-wrap;font-family:inherit">${text}</pre>`,
    });
  } catch (err) {
    console.error('[email] SMTP send failed:', err);
  }
}
