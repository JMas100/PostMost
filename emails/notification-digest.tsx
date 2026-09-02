import { Heading, Hr, Section, Text } from "@react-email/components";
import { BRAND, EmailButton, EmailLayout } from "./components";

export interface DigestItem {
  title: string;
  body: string;
}

export function NotificationDigestEmail({ items, appUrl }: { items: DigestItem[]; appUrl: string }) {
  return (
    <EmailLayout preview={`${items.length} update${items.length === 1 ? "" : "s"} from yesterday`}>
      <Heading style={{ fontSize: 20, fontWeight: 700, color: BRAND.ink, margin: "0 0 12px" }}>
        Yesterday on PostMost
      </Heading>
      <Text style={{ fontSize: 15, color: BRAND.ink, lineHeight: "24px", margin: "0 0 20px" }}>
        {items.length} update{items.length === 1 ? "" : "s"} from your background jobs.
      </Text>
      {items.map((item, i) => (
        <Section key={i} style={{ marginBottom: i === items.length - 1 ? 24 : 16 }}>
          <Text style={{ fontSize: 14, fontWeight: 600, color: BRAND.ink, margin: "0 0 4px" }}>{item.title}</Text>
          <Text style={{ fontSize: 13, color: BRAND.slate, lineHeight: "20px", margin: 0 }}>{item.body}</Text>
        </Section>
      ))}
      <Section style={{ marginBottom: 24 }}>
        <EmailButton href={appUrl}>See all notifications</EmailButton>
      </Section>
      <Hr style={{ borderColor: BRAND.border, margin: "24px 0" }} />
      <Text style={{ fontSize: 13, color: BRAND.slate, lineHeight: "20px", margin: 0 }}>
        You can turn off the daily digest in Settings → Notifications.
      </Text>
    </EmailLayout>
  );
}
