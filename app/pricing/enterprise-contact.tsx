"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { submitEnterpriseContact } from "@/lib/actions/enterprise-contact";
import { cn } from "@/lib/utils";

const BULLETS = [
  "Negotiated seats and volume pricing",
  "API access, signed webhooks, and custom integrations",
  "SLA and a dedicated account manager",
];

const VOLUME_OPTIONS = ["Under 2,000", "2,000–10,000", "10,000+"];

const FIELD_CLASS =
  "h-[46px] w-full rounded-[8px] border border-[#24282D] bg-[#15181C] px-3 text-[14px] text-white placeholder:text-[#68727D] outline-none focus-visible:border-[#B6F34A]";
const LABEL_CLASS = "mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#68727D]";

export function EnterpriseContact() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [volume, setVolume] = useState(VOLUME_OPTIONS[0]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("volume", volume);
    startTransition(async () => {
      const result = await submitEnterpriseContact(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <section id="contact" className="bg-[#090B0D] py-[104px]">
      <div className="mx-auto grid max-w-[1440px] items-start gap-14 px-6 lg:px-[48px] xl:grid-cols-[1fr_520px] xl:gap-[88px] xl:px-[80px]">
        <div>
          <h2 className="max-w-[480px] font-display text-[32px] font-bold leading-[1.15] tracking-[-0.03em] text-white xl:text-[42px]">
            Running a warehouse, not a closet?
          </h2>
          <p className="mt-5 max-w-[460px] text-[16px] leading-relaxed text-[#68727D] xl:text-[17px]">
            Enterprise plans are built for teams: negotiated seats, API and webhook limits that
            scale with you, custom integrations, and an SLA you can plan around.
          </p>
          <ul className="mt-7 flex flex-col gap-3">
            {BULLETS.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-[14.5px] text-white">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[#B6F34A]">
                  <Check className="h-3 w-3 text-[#090B0D]" />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
          <p className="mt-7 text-[14px] text-[#68727D]">
            Or email{" "}
            <a href="mailto:sales@postmost.co" className="font-semibold text-[#B6F34A]">
              sales@postmost.co
            </a>{" "}
            directly.
          </p>
        </div>

        <div className="rounded-[16px] border border-[#24282D] bg-[#0E1114] p-8">
          {success ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#B6F34A]">
                <Check className="h-6 w-6 text-[#090B0D]" />
              </div>
              <p className="mt-4 text-[17px] font-semibold text-white">Request sent.</p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#68727D]">
                We reply within one business day. No sales sequences, no spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-[17px] font-semibold text-white">Talk to sales</p>
              <p className="mt-1 text-[13.5px] text-[#68727D]">We reply within one business day.</p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLASS} htmlFor="ec-name">Name</label>
                  <input id="ec-name" name="name" type="text" required className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS} htmlFor="ec-email">Work email</label>
                  <input id="ec-email" name="email" type="email" required className={FIELD_CLASS} />
                </div>
              </div>

              <div className="mt-3">
                <label className={LABEL_CLASS} htmlFor="ec-company">Company</label>
                <input id="ec-company" name="company" type="text" required className={FIELD_CLASS} />
              </div>

              <div className="mt-3">
                <span className={LABEL_CLASS}>Listings per month</span>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Listings per month">
                  {VOLUME_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={volume === option}
                      onClick={() => setVolume(option)}
                      className={cn(
                        "flex h-11 items-center justify-center rounded-[8px] border px-2 text-center text-[12.5px] font-medium text-white transition-colors",
                        volume === option ? "border-[#B6F34A] bg-[#15181C]" : "border-[#24282D] bg-[#15181C] hover:border-[#68727D]"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <label className={LABEL_CLASS} htmlFor="ec-message">What do you need?</label>
                <textarea id="ec-message" name="message" required rows={3} className={cn(FIELD_CLASS, "h-[96px] resize-none py-2.5")} />
              </div>

              {error && <p className="mt-3 text-[13px] text-[#EF4444]">{error}</p>}

              <button
                type="submit"
                disabled={isPending}
                className="mt-5 flex h-[50px] w-full items-center justify-center rounded-[8px] bg-[#B6F34A] text-[15px] font-semibold text-[#090B0D] transition-colors hover:bg-[#c6f96c] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Sending…" : "Send request"}
              </button>
              <p className="mt-3 text-[12.5px] leading-relaxed text-[#68727D]">
                We&apos;ll only use this to answer your question. No sales sequences.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
