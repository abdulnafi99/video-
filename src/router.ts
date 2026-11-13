import { useEffect, useState } from "react";

/** Tiny hash router: #/route/param — no dependency needed. */
export function useRoute() {
  const parse = () => (window.location.hash.replace(/^#\/?/, "") || "overview").split("/");
  const [parts, setParts] = useState(parse);
  useEffect(() => {
    const on = () => setParts(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return parts;
}

export const go = (path: string) => {
  window.location.hash = `#/${path}`;
};
