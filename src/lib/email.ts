/**
 * Minimal email transport. Uses the Resend HTTP API directly (no SDK
 * dependency); without RESEND_API_KEY the message is logged to the server
 * console instead, so local testing stays free (see README).
 */
export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.MAIL_FROM ?? 'MyBrand <onboarding@resend.dev>',
          to: [to],
          subject,
          text,
          html: html ?? `<pre style="white-space:pre-wrap;font-family:inherit">${text}</pre>`,
        }),
      });
      if (!res.ok) {
        console.error('[email] Resend rejected the message:', res.status, await res.text());
      }
      return;
    } catch (err) {
      console.error('[email] Resend request failed:', err);
    }
  }
  console.log(`[email] (RESEND_API_KEY not set — not sent)\nTo: ${to}\nSubject: ${subject}\n\n${text}`);
}
