import { useEffect, useState } from "react";

export type Route = "study" | "condition" | "method" | "sources";

const ROUTES: readonly Route[] = ["study", "condition", "method", "sources"];

/**
 * Hash routing, so the static build needs no server rewrites and a judge's
 * refresh on /#/method lands on Method rather than a 404.
 */
function parse(hash: string): Route {
  const name = hash.replace(/^#\/?/, "");
  return ROUTES.find((r) => r === name) ?? "study";
}

export function navigate(route: Route): void {
  window.location.hash = `/${route}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const sync = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return route;
}
