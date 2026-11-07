"use client";

import { createFileRoute, Link, useNavigate, useSearch } from "@/lib/tanstack-compat";
import { useEffect, useState, Suspense } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, ArrowRight, Eye, EyeOff, Check, CheckCircle2 } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { useAuth } from "@/hooks/use-auth";
import { GoogleIcon } from "@/components/auth/google-button";
import { authClient } from "@/lib/auth-client";
import styles from "./register.module.css";

const emailRegisterSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name (at least 2 characters)").max(80),
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const CHECKLIST_ITEMS = [
  "Direct connection to verified local farmers",
  "100% lab-tested & traceable harvests",
  "Real-time order tracking & seamless reorders",
  "Exclusive harvest drops & seasonal offers",
];

function RegisterPageContent() {
  const navigate = useNavigate();
  const searchParams = useSearch();
  const { session } = useAuth();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const rawRedirect = searchParams.redirect;
  const redirectTarget =
    typeof rawRedirect === "string" && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : null;

  useEffect(() => {
    if (session) navigate({ to: redirectTarget || "/account", replace: true });
  }, [session, navigate, redirectTarget]);

  return (
    <MarketingLayout>
      <div className={styles.registerWrapper}>
        <div className={styles.registerGrid}>
          {/* Left Column */}
          <div className={styles.leftColumn}>
            <h1 className={styles.headline}>Join Prajnaa</h1>
            <p className={styles.subheadline}>
              Create an account to shop fresh from verified farmers, track your orders in real-time, and support sustainable agriculture.
            </p>

            <ul className={styles.checklist}>
              {CHECKLIST_ITEMS.map((item) => (
                <li key={item} className={styles.checklistItem}>
                  <div className={styles.checkCircle}>
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column: Card */}
          <div className={styles.cardColumn}>
            <div className={styles.registerCard}>
              {registeredEmail ? (
                <div className={styles.confirmBox}>
                  <div className={styles.confirmIconCircle}>
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h2 className={styles.confirmTitle}>Check your email</h2>
                  <p className={styles.confirmText}>
                    We&apos;ve sent an activation link to your inbox. Please click the link to verify your email address.
                  </p>
                  <div className={styles.confirmEmailBadge}>{registeredEmail}</div>
                  <p className={styles.confirmHelper}>
                    Once you click the link in your email, your email is verified and your account is active! You can then sign in directly below.
                  </p>
                  <Link
                    to={redirectTarget ? `/auth/login?redirect=${encodeURIComponent(redirectTarget)}` : "/auth/login"}
                    className={styles.primaryButton}
                  >
                    Go to Sign in <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              ) : (
                <>
                  <h2 className={styles.cardTitle}>Create account</h2>
                  <p className={styles.cardSubtitle}>
                    Enter your details to join the Prajnaa community
                  </p>

                  <EmailRegisterForm
                    redirectTarget={redirectTarget}
                    onRegistered={(email) => setRegisteredEmail(email)}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}

function EmailRegisterForm({
  redirectTarget,
  onRegistered,
}: {
  redirectTarget: string | null;
  onRegistered: (email: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fullNameInput, setFullNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ full_name?: string; email?: string; password?: string }>({});

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTarget || "/account",
      });
    } catch (err: any) {
      console.error("[NeonAuth] Google sign-up error:", err);
      toast.error(err?.message || "Google sign-up failed");
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const rawFullName = String(fd.get("full_name") || fullNameInput).trim();
    const rawEmail = String(fd.get("email") || emailInput).trim().toLowerCase();
    const rawPassword = String(fd.get("password") || passwordInput);

    const parsed = emailRegisterSchema.safeParse({
      full_name: rawFullName,
      email: rawEmail,
      password: rawPassword,
    });

    if (!parsed.success) {
      const errs: { full_name?: string; email?: string; password?: string } = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0] === "full_name" && !errs.full_name) {
          errs.full_name = issue.message;
        }
        if (issue.path[0] === "email" && !errs.email) {
          errs.email = issue.message;
        }
        if (issue.path[0] === "password" && !errs.password) {
          errs.password = issue.message;
        }
      });
      setFieldErrors(errs);
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const callbackURL =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/login?verified=true`
          : "https://prajnaa-farm-8zam.vercel.app/auth/login?verified=true";

      const { data, error } = await authClient.signUp.email({
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.full_name,
        callbackURL,
      });

      if (error) {
        const errMsg = (error.message || "").toLowerCase();
        if (errMsg.includes("already in use") || errMsg.includes("exists") || errMsg.includes("duplicate")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else if (errMsg.includes("origin") || errMsg.includes("403")) {
          toast.error("Sign-up verification error. Please try again.");
        } else {
          toast.error(error.message || "Registration failed");
        }
        return;
      }

      toast.success("Account created! Check your email to verify.");
      onRegistered(parsed.data.email);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={styles.form} noValidate>
      {/* Full Name */}
      <div className={styles.fieldGroup}>
        <label htmlFor="reg-fullname" className={styles.fieldLabel}>
          Full name
        </label>
        <div className={styles.inputWrapper}>
          <input
            id="reg-fullname"
            name="full_name"
            type="text"
            required
            autoComplete="name"
            placeholder="e.g. Ramesh Kumar"
            value={fullNameInput}
            onChange={(e) => {
              setFullNameInput(e.target.value);
              if (fieldErrors.full_name) setFieldErrors((p) => ({ ...p, full_name: undefined }));
            }}
            className={styles.pillInput}
          />
        </div>
        {fieldErrors.full_name && <p className={styles.fieldError}>{fieldErrors.full_name}</p>}
      </div>

      {/* Email Address */}
      <div className={styles.fieldGroup}>
        <label htmlFor="reg-email" className={styles.fieldLabel}>
          Email address
        </label>
        <div className={styles.inputWrapper}>
          <input
            id="reg-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@example.com"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
            }}
            className={styles.pillInput}
          />
        </div>
        {fieldErrors.email && <p className={styles.fieldError}>{fieldErrors.email}</p>}
      </div>

      {/* Password */}
      <div className={styles.fieldGroup}>
        <label htmlFor="reg-password" className={styles.fieldLabel}>
          Password
        </label>
        <div className={styles.inputWrapper}>
          <input
            id="reg-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="Create password (min. 6 characters)"
            value={passwordInput}
            onChange={(e) => {
              setPasswordInput(e.target.value);
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            className={`${styles.pillInput} ${styles.pillInputWithIcon}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={styles.eyeButton}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {fieldErrors.password && <p className={styles.fieldError}>{fieldErrors.password}</p>}
      </div>

      {/* Submit Button */}
      <button type="submit" disabled={loading} className={styles.primaryButton}>
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Creating account...
          </>
        ) : (
          <>
            Create account & continue <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      {/* Divider */}
      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerText}>or</span>
        <span className={styles.dividerLine} />
      </div>

      {/* Google Button */}
      <button
        type="button"
        disabled={googleLoading}
        onClick={handleGoogleSignUp}
        className={styles.googleButton}
      >
        {googleLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-foreground" />
        ) : (
          <>
            <GoogleIcon className="h-5 w-5" />
            <span>Continue with Google</span>
          </>
        )}
      </button>

      {/* Footer link to Sign In */}
      <div className={styles.cardFooter}>
        <span>Already have an account?</span>
        <Link
          to={redirectTarget ? `/auth/login?redirect=${encodeURIComponent(redirectTarget)}` : "/auth/login"}
          className={styles.loginLink}
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}

function RegisterPage() {
  return (
    <Suspense
      fallback={
        <MarketingLayout>
          <div className="container-prj grid place-items-center py-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </MarketingLayout>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}

export default RegisterPage;
const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});
