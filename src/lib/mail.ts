// Transactional email. Uses Resend when RESEND_API_KEY is set; otherwise
// logs to the server console so the password-reset flow stays testable on
// free hosting without an email provider.
type SendMailArgs = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendMail(args: SendMailArgs): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`\n[mail:dev] ────────────────────────────────\nTo: ${args.to}\nSubject: ${args.subject}\n${args.text}\n[mail:dev] ────────────────────────────────\n`);
    return { delivered: false };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'MyBrand <onboarding@resend.dev>',
        to: [args.to],
        subject: args.subject,
        text: args.text,
        html: args.html,
      }),
    });
    if (!res.ok) {
      console.error('[mail] provider error:', res.status, await res.text());
      return { delivered: false };
    }
    return { delivered: true };
  } catch (err) {
    console.error('[mail] send failed:', err);
    return { delivered: false };
  }
}
