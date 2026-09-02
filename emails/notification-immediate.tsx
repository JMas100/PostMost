import { Heading, Hr, Section, Text } from "@react-email/components";
import { BRAND, EmailButton, EmailLayout } from "./components";

export function NotificationImmediateEmail({
  title,
  body,
  actionLabel,
  actionUrl,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
}) {
  return (
    <EmailLayout preview={title}>
      <Heading style={{ fontSize: 20, fontWeight: 700, color: BRAND.ink, margin: "0 0 12px" }}>{title}</Heading>
      <Text style={{ fontSize: 15, color: BRAND.ink, lineHeight: "24px", margin: "0 0 24px" }}>{body}</Text>
      {actionLabel && actionUrl && (
        <Section style={{ marginBottom: 24 }}>
          <EmailButton href={actionUrl}>{actionLabel}</EmailButton>
        </Section>
      )}
      <Hr style={{ borderColor: BRAND.border, margin: "24px 0" }} />
      <Text style={{ fontSize: 13, color: BRAND.slate, lineHeight: "20px", margin: 0 }}>
        You can adjust which notifications email you in Settings → Notifications.
      </Text>
    </EmailLayout>
  );
}
