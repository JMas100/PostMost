import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "Terms of Service — PostMost",
  description: "The terms that govern your use of PostMost.",
};

const EFFECTIVE_DATE = "August 23, 2026";

export default function TermsOfServicePage() {
  return (
    <div className="marketing-light flex min-h-screen flex-col bg-background text-foreground">
      <MarketingNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 lg:px-[48px] xl:px-0">
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective {EFFECTIVE_DATE}</p>

        <div className="mt-10 space-y-10 text-[15px] leading-7 text-foreground">
          <section>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of PostMost
              (&quot;PostMost,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), including
              postmost.co and the PostMost application (together, the &quot;Service&quot;). By creating an
              account or using the Service, you agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">1. The service</h2>
            <p className="mt-2">
              PostMost lets you create a single product listing and publish it to multiple third-party
              marketplaces you connect to your account. For marketplaces with a public API (eBay, Etsy),
              PostMost acts through your authorized connection to that marketplace. For marketplaces
              without one (Poshmark, Mercari, Depop, Facebook Marketplace, Craigslist, OfferUp, Vinted,
              Grailed), PostMost signs in and manages listings using credentials you provide, acting as
              your agent and at your direction — the same as if you were doing it yourself in a browser.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">2. Account registration</h2>
            <p className="mt-2">
              You must provide accurate information to create an account and are responsible for keeping
              your login credentials confidential. You&apos;re responsible for all activity that happens
              under your account.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">3. Your marketplace accounts</h2>
            <p className="mt-2">
              You&apos;re solely responsible for complying with the terms of service, seller policies, and
              applicable laws of every marketplace you connect to PostMost. PostMost is a tool that acts
              on your instructions — connecting a marketplace account, publishing a listing, or removing a
              listing through PostMost is something you are directing us to do on your behalf. We are not
              responsible for actions taken by a marketplace against your account (such as suspension or
              listing removal), or for a marketplace changing its policies, availability, or API access in
              a way that affects PostMost&apos;s ability to work with it.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">4. Subscriptions &amp; billing</h2>
            <p className="mt-2">
              Paid plans are billed in advance on a monthly or annual basis through Stripe. By subscribing,
              you authorize us to charge your payment method on a recurring basis until you cancel. You can
              cancel at any time from your billing settings; your plan remains active through the end of
              the current billing period. Fees are non-refundable except where required by law.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">5. Acceptable use</h2>
            <p className="mt-2">You agree not to use PostMost to:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>List items that are illegal, stolen, counterfeit, or that you don&apos;t have the right to sell;</li>
              <li>Violate the terms of service or policies of any marketplace you connect;</li>
              <li>Attempt to interfere with, disrupt, or gain unauthorized access to the Service or other users&apos; accounts;</li>
              <li>Use the Service to send spam or engage in fraudulent activity; or</li>
              <li>Reverse-engineer or resell the Service without our permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">6. AI-generated content</h2>
            <p className="mt-2">
              PostMost offers optional AI features that suggest listing titles, descriptions, prices, and
              other details based on the photos or text you provide. AI-generated suggestions may be
              inaccurate or unsuitable for a given item. You&apos;re responsible for reviewing and editing
              any AI-generated content before publishing a listing.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">7. Intellectual property</h2>
            <p className="mt-2">
              You retain ownership of the listing content and photos you upload. By using the Service, you
              grant PostMost a license to use, store, and transmit that content solely as necessary to
              provide the Service (for example, publishing it to the marketplaces you select). PostMost
              and its branding are our property and may not be used without permission.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">8. Disclaimers</h2>
            <p className="mt-2">
              The Service is provided &quot;as is&quot; without warranties of any kind, express or
              implied. We don&apos;t guarantee that cross-posting, delisting, or any other automated action
              will always succeed, or that the Service will be uninterrupted or error-free — including
              because a marketplace we integrate with is not always officially supported and can change
              its own site or API without notice.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">9. Limitation of liability</h2>
            <p className="mt-2">
              To the fullest extent permitted by law, PostMost will not be liable for indirect, incidental,
              special, or consequential damages, or for lost profits or lost sales, arising from your use
              of the Service — including a failed, delayed, or duplicated listing or sale on a connected
              marketplace. Our total liability for any claim relating to the Service is limited to the
              amount you paid us in the twelve months before the claim arose.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">10. Termination</h2>
            <p className="mt-2">
              You may stop using the Service and close your account at any time. We may suspend or
              terminate your access if you violate these Terms or if we reasonably believe your use of the
              Service creates risk or legal exposure for us or others.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">11. Changes to these terms</h2>
            <p className="mt-2">
              We may update these Terms from time to time. If we make material changes, we&apos;ll update
              the effective date above and, where appropriate, notify you directly. Continued use of the
              Service after changes take effect means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">12. Contact us</h2>
            <p className="mt-2">
              Questions about these Terms? Email{" "}
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
