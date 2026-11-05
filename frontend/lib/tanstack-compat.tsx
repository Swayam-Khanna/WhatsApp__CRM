"use client";

import NextLink from "next/link";
import {
  useRouter as useNextRouter,
  useParams as useNextParams,
  usePathname as useNextPathname,
  notFound as nextNotFound,
  redirect as nextRedirect,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import { type ReactNode } from "react";

export function Link({ to, href: directHref, params, search, children, ...props }: any) {
  let href = directHref || to || "/";
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      href = href.replace(`$${key}`, String(value));
    });
  }
  if (search) {
    const searchParams = new URLSearchParams();
    Object.entries(search).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      href += `?${queryString}`;
    }
  }
  return (
    <NextLink href={href} {...props}>
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useNextRouter();
  return (options: any) => {
    let href = options.to || "/";
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        href = href.replace(`$${key}`, String(value));
      });
    }
    if (options.search) {
      const searchParams = new URLSearchParams();
      Object.entries(options.search).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        href += `?${queryString}`;
      }
    }
    router.push(href);
  };
}

export function useParams() {
  const params = useNextParams();
  return params || {};
}

export function useRouter() {
  return useNextRouter();
}

export function usePathname() {
  const p = useNextPathname();
  return p || "/";
}

export function notFound() {
  nextNotFound();
}

export function redirect(options: any) {
  nextRedirect(options.href || options.to || "/");
}

export function useRouterState(options?: { select: (s: any) => any }) {
  const pathname = useNextPathname();
  const state = {
    location: {
      pathname,
    },
  };
  if (options?.select) {
    return options.select(state);
  }
  return state;
}

export function useSearch() {
  const searchParams = useNextSearchParams();
  if (!searchParams) return {};
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function createFileRoute(path: string) {
  return function (options?: any) {
    const routeObj = {
      useLoaderData: () => {
        return {};
      },
    };
    return routeObj;
  };
}

export function Outlet() {
  return null;
}
