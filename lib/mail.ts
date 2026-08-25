import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!_resend) {
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM = process.env.EMAIL_FROM || "PostMost <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Reset your PostMost password",
    html: `
      <p>Someone requested a password reset for your PostMost account.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
