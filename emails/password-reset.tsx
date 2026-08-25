import { Heading, Hr, Section, Text } from "@react-email/components";
import { BRAND, EmailButton, EmailLayout } from "./components";

export function PasswordResetEmail({ resetUrl }: { resetUrl: string }) {
  return (
    <EmailLayout preview="Reset your PostMost password">
      <Heading style={{ fontSize: 20, fontWeight: 700, color: BRAND.ink, margin: "0 0 12px" }}>
        Reset your password
      </Heading>
      <Text style={{ fontSize: 15, color: BRAND.ink, lineHeight: "24px", margin: "0 0 24px" }}>
        Someone requested a password reset for your PostMost account. Click below to choose a new
        one — this link expires in 1 hour.
      </Text>
      <Section style={{ marginBottom: 24 }}>
        <EmailButton href={resetUrl}>Reset password</EmailButton>
      </Section>
      <Text style={{ fontSize: 13, color: BRAND.slate, lineHeight: "20px", margin: "0 0 4px" }}>
        Or paste this link into your browser:
      </Text>
      <Text style={{ fontSize: 13, color: BRAND.slate, lineHeight: "20px", wordBreak: "break-all", margin: 0 }}>
        {resetUrl}
      </Text>
      <Hr style={{ borderColor: BRAND.border, margin: "24px 0" }} />
      <Text style={{ fontSize: 13, color: BRAND.slate, lineHeight: "20px", margin: 0 }}>
        Didn&apos;t request this? You can safely ignore this email — your password won&apos;t
        change unless you click the link above.
      </Text>
    </EmailLayout>
  );
}
