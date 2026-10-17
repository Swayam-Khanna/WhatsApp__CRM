import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export function useTrafficTracker() {
  const pathname = usePathname();
  const { user } = useAuth();
  const lastPath = useRef<string>("");

  useEffect(() => {
    const currentPath = pathname || "";

    // Skip tracking for admin panel, or if the path is unchanged
    if (
      !currentPath ||
      currentPath.startsWith("/admin") ||
      currentPath === lastPath.current
    ) {
      return;
    }

    lastPath.current = currentPath;

    const trackVisit = async () => {
      try {
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        let browser = "Chrome";
        if (ua.includes("Edg")) browser = "Edge";
        else if (ua.includes("Chrome") && !ua.includes("Chromium")) browser = "Chrome";
        else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
        else if (ua.includes("Firefox")) browser = "Firefox";

        const width = typeof window !== "undefined" ? window.innerWidth : 1024;
        let device = "Desktop";
        if (width < 768) device = "Mobile";
        else if (width < 1024) device = "Tablet";

        const visitorName =
          user?.name ||
          (user?.email ? user.email.split("@")[0] : null);

        const payload = {
          route: currentPath,
          visitorType: user ? "Registered" : "Guest",
          visitorName: visitorName,
          userId: user?.id || null,
          device: device,
          browser: browser,
        };

        await fetch("/api/traffic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch (err) {
        // Silent non-blocking fail
      }
    };

    // Slight debounce to let route navigation settle
    const timer = setTimeout(trackVisit, 300);
    return () => clearTimeout(timer);
  }, [pathname, user?.id]);
}

