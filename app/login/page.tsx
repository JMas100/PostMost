"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser } from "@/lib/actions/auth";
import { toast } from "sonner";
import { Wordmark, LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

function passwordStrength(password: string): { label: string; className: string } | null {
  if (!password) return null;
  const hasVariety = /[A-Z]/.test(password) && /[0-9]/.test(password);
  if (password.length >= 8 && hasVariety) return { label: "Strong", className: "text-success" };
  if (password.length >= 8) return { label: "Good", className: "text-warning" };
  return { label: "Too short", className: "text-muted-foreground" };
}

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFieldError("");
    if (isRegister) {
      const result = await registerUser(email, password, name);
      if (result.error) {
        setFieldError(typeof result.error === "string" ? result.error : "Couldn't create that account.");
        setLoading(false);
        return;
      }
      toast.success("Account created. Signing you in...");
    }
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      // Errors belong on the field, not a toast that disappears in four seconds and never says
      // which field was wrong.
      setFieldError(res.error === "CredentialsSignin" ? "That email and password don't match." : res.error);
    } else {
      router.push(isRegister ? "/onboarding" : "/dashboard");
      router.refresh();
    }
  }

  const strength = isRegister ? passwordStrength(password) : null;

  return (
    <div className="flex min-h-screen">
      {/* The marketing promise carries across the boundary so the product looks like the site
          the user just left, instead of a centered card on a grey field that reads as a form to
          fill. Hidden on narrow screens -- the 390 view is just the form. */}
      <div className="marketing-light relative hidden w-1/2 flex-col justify-between bg-[#090B0D] p-12 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          {/* Not the shared Wordmark: its "post" half is text-foreground, which resolves dark
              and disappears against this panel's literal dark background. */}
          <span className="font-heading inline-flex items-baseline text-2xl tracking-tight">
            <span className="font-light text-white/80">post</span>
            <span className="font-extrabold text-primary">most</span>
          </span>
        </Link>
        <div className="space-y-4">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Post once. Sell most.</h1>
          <p className="max-w-sm text-lg text-white/70">
            One listing, every marketplace you sell on. When it sells anywhere, we pull it from the rest
            automatically.
          </p>
        </div>
        <p className="text-sm text-white/50">Free while you list your first ten items. No card required.</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1 text-center lg:hidden">
            <Link href="/" className="mb-4 inline-flex items-center gap-2">
              <LogoMark className="h-7 w-7" />
              <Wordmark className="text-2xl" />
            </Link>
          </div>

          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-bold">{isRegister ? "Create your account" : "Welcome back"}</h2>
            <p className="text-sm text-muted-foreground">
              {isRegister ? (
                <>
                  Already selling with us?{" "}
                  <button type="button" className="text-primary underline underline-offset-2" onClick={() => { setIsRegister(false); setFieldError(""); }}>
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  New here?{" "}
                  <button type="button" className="text-primary underline underline-offset-2" onClick={() => { setIsRegister(true); setFieldError(""); }}>
                    Create an account
                  </button>
                </>
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldError(""); }}
                aria-invalid={Boolean(fieldError)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!isRegister && (
                  <Link href="/forgot-password" className="text-xs text-muted-foreground underline">
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                required
                minLength={isRegister ? 8 : undefined}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldError(""); }}
                aria-invalid={Boolean(fieldError)}
                className={fieldError ? "border-destructive" : undefined}
              />
              {isRegister && !fieldError && (
                <p className="text-xs text-muted-foreground">
                  At least 8 characters. A phrase you&apos;ll remember beats a word you won&apos;t.
                  {strength && <span className={cn("ml-1 font-medium", strength.className)}>{strength.label}</span>}
                </p>
              )}
              {fieldError && <p className="text-xs font-medium text-destructive">{fieldError}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
            </Button>
          </form>

          {isRegister && (
            <p className="text-center text-xs text-muted-foreground">
              By creating an account you agree to the{" "}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
