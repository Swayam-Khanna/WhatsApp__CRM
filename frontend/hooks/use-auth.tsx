"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { useWishlist } from "@/lib/wishlist-store";

export interface UserProfile {
  id: string; // matches neon auth user id
  name: string;
  email: string;
  phone: string;
  avatar: string;
  provider: string;
  google_id: string;
  phone_verified: boolean;
  email_verified: boolean;
  created_at: string;
}

type AuthContextValue = {
  session: { user: UserProfile } | null;
  user: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  linkPhone: (phoneNumber: string, verificationId: string, code: string) => Promise<void>;
  linkGoogle: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  linkPhone: async () => {},
  linkGoogle: async () => {},
  refreshUserProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const { data } = await authClient.getSession();
      if (data?.user) {
        const bUser = data.user;
        const mapped: UserProfile = {
          id: bUser.id,
          name: bUser.name || "User",
          email: bUser.email || "",
          phone: "",
          avatar: bUser.image || "",
          provider: "neon-auth",
          google_id: "",
          phone_verified: false,
          email_verified: Boolean(bUser.emailVerified),
          created_at: bUser.createdAt ? new Date(bUser.createdAt).toISOString() : new Date().toISOString(),
        };
        setUserProfile(mapped);
        try {
          void useWishlist.getState().setUser(mapped.id);
        } catch (e) {}

        // Ensure Neon database public.profiles and public.user_roles are provisioned
        fetch("/api/account/profile")
          .then((res) => (res.ok ? res.json() : null))
          .then((profileRes) => {
            if (profileRes?.data?.id) {
              setUserProfile((prev) =>
                prev
                  ? {
                      ...prev,
                      id: profileRes.data.id,
                      name: profileRes.data.full_name || prev.name,
                    }
                  : prev
              );
              try {
                void useWishlist.getState().setUser(profileRes.data.id);
              } catch (e) {}
            }
          })
          .catch((err) => {
            console.warn("[Neon Auth] Profile auto-reconcile note:", err);
          });
      } else {
        setUserProfile(null);
        try {
          void useWishlist.getState().setUser(null);
        } catch (e) {}
      }
    } catch (err: any) {
      // Clean fallback if auth endpoint is unconfigured or returns 404
      if (err?.status !== 404 && err?.statusCode !== 404) {
        console.debug("[Neon Auth] Session status:", err?.message || err);
      }
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const refreshUserProfile = async () => {
    await fetchSession();
  };

  const linkPhone = async () => {
    throw new Error("Phone authentication is not supported with Neon Auth.");
  };

  const linkGoogle = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/account",
    });
  };

  const signOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("mock_admin_user");
      sessionStorage.removeItem("dismiss_link_phone");
      sessionStorage.removeItem("dismiss_link_email");
    }
    await authClient.signOut();
    setUserProfile(null);
    try {
      void useWishlist.getState().setUser(null);
    } catch (e) {}
  };

  const value: AuthContextValue = {
    session: userProfile ? { user: userProfile } : null,
    user: userProfile,
    loading,
    signOut,
    linkPhone,
    linkGoogle,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
