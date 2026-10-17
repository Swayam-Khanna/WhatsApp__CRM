"use client";

import { createFileRoute, Link, useNavigate, useSearch } from "@/lib/tanstack-compat";
import { useEffect, useState, Suspense } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, ArrowRight, Eye, EyeOff, Check } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/lib/admin/use-admin";
import { ADMIN_EMAILS } from "@/lib/admin/admin-constants";
import { useFarmerProfile } from "@/lib/farmer/use-farmer";
import { GoogleIcon } from "@/components/auth/google-button";
import { authClient } from "@/lib/auth-client";
import styles from "./login.module.css";

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const CHECKLIST_ITEMS = [
  "Secure account login",
  "Synced cart across devices",
  "Track orders anytime",
  "Know the farmer behind every harvest",
];

function LoginPageContent() {
  const navigate = useNavigate();
  const searchParams = useSearch();
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: farmerProfile, isLoading: farmerLoading } = useFarmerProfile();

  const rawRedirect = searchParams.redirect;
  const redirectTarget =
    typeof rawRedirect === "string" && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : null;

  useEffect(() => {
    if (searchParams.verified === "true" || searchParams.verified === "1") {
      toast.success("Email verified successfully! Please sign in to continue.");
    }
  }, [searchParams.verified]);

  useEffect(() => {
    if (user && !adminLoading && !farmerLoading) {
      // 1. Prioritize explicit redirect target (e.g. /checkout, /become-a-seller/register)
      if (redirectTarget) {
        navigate({ to: redirectTarget, replace: true });
      }
      // 2. Redirect Admin
      else if (isAdmin) {
        navigate({ to: "/admin/dashboard", replace: true });
      }
      // 3. Redirect Farmer
      else if (farmerProfile) {
        navigate({ to: "/farmer-portal/dashboard", replace: true });
      }
      // 4. Default to Customer Account Dashboard for regular shoppers & customers
      else {
        navigate({ to: "/account", replace: true });
      }
    }
  }, [user, isAdmin, adminLoading, farmerProfile, farmerLoading, navigate, redirectTarget]);

  return (
    <MarketingLayout>
      <div className={styles.loginWrapper}>
        <div className={styles.loginGrid}>
          {/* Left Column */}
          <div className={styles.leftColumn}>
            <h1 className={styles.headline}>Welcome back</h1>
            <p className={styles.subheadline}>
              Sign in to your account to continue shopping fresh from verified farmers and track your orders.
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
            <div className={styles.loginCard}>
              <h2 className={styles.cardTitle}>Sign in</h2>
              <p className={styles.cardSubtitle}>
                Enter your email and password to access your account
              </p>

              <LoginForm redirectTarget={redirectTarget} />
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}

function LoginForm({ redirectTarget }: { redirectTarget: string | null }) {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTarget || "/account",
      });
    } catch (err: any) {
      console.error("[NeonAuth] Google sign-in error:", err);
      toast.error(err?.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const rawEmail = String(fd.get("email") || emailInput).trim().toLowerCase();
    const rawPassword = String(fd.get("password") || passwordInput);
    const parsed = emailSchema.safeParse({ email: rawEmail, password: rawPassword });
    if (!parsed.success) {
      const errs: { email?: string; password?: string } = {};
      parsed.error.issues.forEach((issue) => {
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
      const { data, error } = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        const errMsg = (error.message || "").toLowerCase();
        const errStatus = (error as any).status;
        if (errMsg.includes("verify") || errMsg.includes("verification")) {
          toast.error(
            "Your email isn't verified yet. Please check your inbox for the verification link we sent when you registered."
          );
        } else if (
          errMsg.includes("invalid") ||
          errMsg.includes("credential") ||
          errMsg.includes("password") ||
          errMsg.includes("not found") ||
          errMsg.includes("401") ||
          errStatus === 401
        ) {
          toast.error("Incorrect email or password. Please try again.");
        } else if (errMsg.includes("origin") || errMsg.includes("403") || errStatus === 403) {
          toast.error("Authentication error. Please refresh and try again.");
        } else {
          toast.error(error.message || "Email sign-in failed");
        }
        return;
      }

      if (data?.user && !data.user.emailVerified) {
        toast.info(
          "Welcome back! Please verify your email via the link sent to your inbox when convenient."
        );
      }

      toast.success("Signed in successfully");
      const isAdminUser =
        ADMIN_EMAILS.has((parsed.data.email || "").toLowerCase().trim()) ||
        (data?.user as any)?.role === "admin";
      window.location.href = redirectTarget || (isAdminUser ? "/admin/dashboard" : "/account");
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("verify") || msg.includes("verification")) {
        toast.error(
          "Your email isn't verified yet. Please check your inbox for the verification link we sent when you registered."
        );
      } else {
        toast.error("Incorrect email or password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={onSubmit} className={styles.form} noValidate>
        {/* Email Field */}
        <div className={styles.fieldGroup}>
          <label htmlFor="email" className={styles.fieldLabel}>
            Email address
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="name@example.com"
              className={styles.pillInput}
            />
          </div>
          {fieldErrors.email && <p className={styles.fieldError}>{fieldErrors.email}</p>}
        </div>

        {/* Password Field */}
        <div className={styles.fieldGroup}>
          <div className={styles.passwordLabelRow}>
            <label htmlFor="password" className={styles.fieldLabel} style={{ marginBottom: 0 }}>
              Password
            </label>
            <Link to="/auth/forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>
          <div className={styles.inputWrapper}>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="Enter your password"
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

        {/* Primary Submit Button */}
        <button type="submit" disabled={loading} className={styles.primaryButton}>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <>
              <span>Sign in & continue</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerText}>or</span>
        <span className={styles.dividerLine} />
      </div>

      {/* Google Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
        className={styles.googleButton}
      >
        {googleLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#0f3d2e]" />
        ) : (
          <GoogleIcon className="h-5 w-5 shrink-0" />
        )}
        <span>Continue with Google</span>
      </button>

      {/* Card Footer */}
      <div className={styles.cardFooter}>
        <span>New here?</span>
        <Link
          to={
            redirectTarget
              ? `/auth/register?redirect=${encodeURIComponent(redirectTarget)}`
              : "/auth/register"
          }
          className={styles.registerLink}
        >
          Create an account
        </Link>
      </div>
    </>
  );
}

function LoginPage() {
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
      <LoginPageContent />
    </Suspense>
  );
}

export default LoginPage;
const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});
