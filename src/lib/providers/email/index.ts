import "server-only";

export type Email = { to: string; subject: string; html: string; text?: string };

/** Sends via SMTP when SMTP_HOST is set; otherwise logs to the console (development). */
export async function sendEmail(email: Email) {
  if (!process.env.SMTP_HOST) {
    console.info(`[email:console] to=${email.to} subject="${email.subject}"`);
    return { ok: true, transport: "console" as const };
  }
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  await transport.sendMail({ from: process.env.EMAIL_FROM, ...email });
  return { ok: true, transport: "smtp" as const };
}

export function layoutEmail(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#FAF8F3;font-family:Inter,Arial,sans-serif;color:#1A2333">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E6E1D6;border-radius:8px">
<tr><td style="background:#0E1A2B;padding:20px 28px;border-radius:8px 8px 0 0;font-family:Georgia,serif;font-size:24px;color:#fff">Marq<span style="color:#C8A24A">o</span>va</td></tr>
<tr><td style="padding:28px"><h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px">${title}</h1>${body}</td></tr>
<tr><td style="padding:16px 28px;font-size:12px;color:#5B6575;border-top:1px solid #E6E1D6">Marqova — See it. Trust it. Own it.</td></tr>
</table></td></tr></table></body></html>`;
}
