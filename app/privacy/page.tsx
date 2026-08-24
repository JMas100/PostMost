import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "Privacy Policy — PostMost",
  description: "How PostMost collects, uses, and protects your information.",
};

const EFFECTIVE_DATE = "August 23, 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="marketing-light flex min-h-screen flex-col bg-background text-foreground">
      <MarketingNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 lg:px-[48px] xl:px-0">
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective {EFFECTIVE_DATE}</p>

        <div className="mt-10 space-y-10 text-[15px] leading-7 text-foreground">
          <section>
            <p>
              PostMost (&quot;PostMost,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides software that
              lets sellers create a single listing and publish it to multiple online marketplaces. This
              policy explains what information we collect when you use PostMost, how we use it, and the
              choices you have. It applies to postmost.co and the PostMost application.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">1. Information we collect</h2>
            <h3 className="mt-4 font-heading text-base font-semibold">Account information</h3>
            <p className="mt-2">
              When you create a PostMost account, we collect your email address, a password (stored only
              as a salted cryptographic hash — we never store or can recover your plain-text password),
              and, optionally, your name.
            </p>
            <h3 className="mt-4 font-heading text-base font-semibold">Listing content</h3>
            <p className="mt-2">
              Titles, descriptions, prices, condition, category, and other details you enter for your
              listings, along with any photos you upload. Photos are stored in our object storage
              provider and served over HTTPS.
            </p>
            <h3 className="mt-4 font-heading text-base font-semibold">Connected marketplace accounts</h3>
            <p className="mt-2">
              To cross-post on your behalf, PostMost needs to authenticate with each marketplace you
              connect. Depending on the marketplace, this works one of two ways:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>
                <span className="font-medium text-foreground">Marketplaces with a public API (eBay, Etsy):</span>{" "}
                you authorize PostMost directly through that marketplace&apos;s own sign-in page (OAuth).
                We receive and store an access token and refresh token issued by that marketplace —
                never your marketplace password.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Marketplaces without a public API (Poshmark, Mercari, Depop, Facebook Marketplace,
                  Craigslist, OfferUp, Vinted, Grailed):
                </span>{" "}
                you provide your username and password for that marketplace directly to PostMost, and we
                use automated browser sessions to sign in and manage listings exactly as you would in a
                browser, on your instruction.
              </li>
            </ul>
            <p className="mt-2">
              All stored credentials and tokens — for every marketplace — are encrypted at rest and are
              never shown back to you or anyone else after you save them.
            </p>
            <h3 className="mt-4 font-heading text-base font-semibold">Payment information</h3>
            <p className="mt-2">
              Subscription payments are processed by Stripe. PostMost does not receive or store your
              full card number — Stripe provides us only what we need to manage your subscription (such
              as plan status and a billing identifier).
            </p>
            <h3 className="mt-4 font-heading text-base font-semibold">Usage information</h3>
            <p className="mt-2">
              We record events like account creation, listings published, and cross-post outcomes so the
              product can show you accurate usage, plan limits, and analytics. We do not sell this data
              or share it with advertisers.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">2. How we use information</h2>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>To operate the core service: creating, publishing, and syncing your listings across the marketplaces you connect.</li>
              <li>To power optional AI features (photo-based listing generation, title/description suggestions, pricing suggestions, and background removal), which send the specific photo or text you submit to the AI provider below to generate a result.</li>
              <li>To process payments and manage your subscription.</li>
              <li>To provide customer support and respond to you when you contact us.</li>
              <li>To detect, prevent, and investigate fraud, abuse, or security issues.</li>
              <li>To improve the product based on aggregate usage patterns.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">3. Third-party service providers</h2>
            <p className="mt-2">
              We use the following providers to operate PostMost. Each processes only the data necessary
              to perform its function for us, under its own privacy and security terms:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li><span className="font-medium text-foreground">Vercel</span> — application hosting.</li>
              <li><span className="font-medium text-foreground">Neon</span> — database hosting.</li>
              <li><span className="font-medium text-foreground">Cloudflare R2</span> — photo/image storage.</li>
              <li><span className="font-medium text-foreground">Stripe</span> — subscription billing and payment processing.</li>
              <li><span className="font-medium text-foreground">OpenAI</span> — AI-generated listing content, title/description optimization, and pricing suggestions, when you use those features.</li>
              <li><span className="font-medium text-foreground">fal.ai</span> — background removal for photos, when you use that feature.</li>
              <li>
                <span className="font-medium text-foreground">The marketplaces you connect</span> (eBay, Etsy,
                Poshmark, Mercari, Depop, Facebook Marketplace, Craigslist, OfferUp, Vinted, Grailed) — we
                send your listing content to whichever of these you choose to publish to, using the
                credentials or authorization you provide.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">4. Cookies</h2>
            <p className="mt-2">
              PostMost uses a single session cookie to keep you signed in. We do not use third-party
              advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">5. Data security</h2>
            <p className="mt-2">
              Passwords are hashed, never stored in plain text. Marketplace credentials and OAuth tokens
              are encrypted at rest. All traffic to PostMost is encrypted in transit (HTTPS). No method of
              storage or transmission is 100% secure, but we work to protect your information using
              industry-standard practices.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">6. Data retention &amp; deletion</h2>
            <p className="mt-2">
              We retain your account and listing data for as long as your account is active. To request
              deletion of your account and associated data, email{" "}
              <a href="mailto:hello@postmost.co" className="underline underline-offset-2">
                hello@postmost.co
              </a>{" "}
              from the email address on your account. We will delete your data within a reasonable time,
              except where we&apos;re required to retain certain records (for example, billing records) by
              law.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">7. Your rights</h2>
            <p className="mt-2">
              Depending on where you live, you may have rights to access, correct, export, or delete your
              personal information, and to object to or restrict certain processing. To exercise any of
              these rights, contact us at{" "}
              <a href="mailto:hello@postmost.co" className="underline underline-offset-2">
                hello@postmost.co
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">8. Children&apos;s privacy</h2>
            <p className="mt-2">
              PostMost is not directed to, and we do not knowingly collect personal information from,
              anyone under 18. If you believe a minor has provided us with personal information, contact
              us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">9. Changes to this policy</h2>
            <p className="mt-2">
              We may update this policy from time to time. If we make material changes, we&apos;ll update
              the effective date above and, where appropriate, notify you directly.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">10. Contact us</h2>
            <p className="mt-2">
              Questions about this policy or your data? Email{" "}
              <a href="mailto:hello@postmost.co" className="underline underline-offset-2">
                hello@postmost.co
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
