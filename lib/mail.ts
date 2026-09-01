import { Resend } from "resend";
import { render } from "@react-email/render";
import { PasswordResetEmail } from "@/emails/password-reset";
import { TeamInviteEmail } from "@/emails/team-invite";

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
  const email = PasswordResetEmail({ resetUrl });
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Reset your PostMost password",
    react: email,
    text: await render(email, { plainText: true }),
  });
}

export async function sendTeamInviteEmail(to: string, inviteUrl: string, teamName: string) {
  const email = TeamInviteEmail({ inviteUrl, teamName });
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `You're invited to join ${teamName} on PostMost`,
    react: email,
    text: await render(email, { plainText: true }),
  });
}
