import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/** PostMost's brand palette, computed from the same HSL primitives as app/globals.css'
 *  --lime/--lime-dark/--ink/--cloud/--slate/--border-light. Email clients (Outlook especially)
 *  don't reliably support CSS variables or hsl(), so these are hardcoded hex equivalents. */
export const BRAND = {
  lime: "#b8f358",
  limeDark: "#99da2f",
  ink: "#14181a",
  cloud: "#f9fafb",
  slate: "#67737e",
  border: "#e5e7eb",
  white: "#ffffff",
};

const FONT_STACK =
  '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: BRAND.cloud, margin: 0, padding: "40px 0", fontFamily: FONT_STACK }}>
        <Container
          style={{
            backgroundColor: BRAND.white,
            borderRadius: 12,
            border: `1px solid ${BRAND.border}`,
            maxWidth: 480,
            margin: "0 auto",
            padding: "32px 40px 40px",
          }}
        >
          <Section style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
              <span style={{ fontWeight: 300, color: BRAND.ink }}>post</span>
              <span style={{ fontWeight: 800, color: BRAND.limeDark }}>most</span>
            </Text>
          </Section>
          {children}
          <Section style={{ marginTop: 32, borderTop: `1px solid ${BRAND.border}`, paddingTop: 20 }}>
            <Text style={{ fontSize: 13, color: BRAND.slate, margin: 0, lineHeight: "20px" }}>
              PostMost · cross-post once, sell everywhere.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: BRAND.limeDark,
        color: BRAND.ink,
        fontWeight: 700,
        fontSize: 15,
        textDecoration: "none",
        padding: "12px 24px",
        borderRadius: 8,
      }}
    >
      {children}
    </a>
  );
}
