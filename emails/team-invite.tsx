import { Heading, Hr, Section, Text } from "@react-email/components";
import { BRAND, EmailButton, EmailLayout } from "./components";

export function TeamInviteEmail({ inviteUrl, teamName }: { inviteUrl: string; teamName: string }) {
  return (
    <EmailLayout preview={`You've been invited to join ${teamName} on PostMost`}>
      <Heading style={{ fontSize: 20, fontWeight: 700, color: BRAND.ink, margin: "0 0 12px" }}>
        You&apos;re invited to join {teamName}
      </Heading>
      <Text style={{ fontSize: 15, color: BRAND.ink, lineHeight: "24px", margin: "0 0 24px" }}>
        You&apos;ve been invited to join {teamName} on PostMost. Click below to create your
        account — this link expires in 7 days.
      </Text>
      <Section style={{ marginBottom: 24 }}>
        <EmailButton href={inviteUrl}>Accept invite</EmailButton>
      </Section>
      <Text style={{ fontSize: 13, color: BRAND.slate, lineHeight: "20px", margin: "0 0 4px" }}>
        Or paste this link into your browser:
      </Text>
      <Text style={{ fontSize: 13, color: BRAND.slate, lineHeight: "20px", wordBreak: "break-all", margin: 0 }}>
        {inviteUrl}
      </Text>
      <Hr style={{ borderColor: BRAND.border, margin: "24px 0" }} />
      <Text style={{ fontSize: 13, color: BRAND.slate, lineHeight: "20px", margin: 0 }}>
        Didn&apos;t expect this? You can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}
