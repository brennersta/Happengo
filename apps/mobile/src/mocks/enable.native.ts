import { health, listEvents } from "./contract";

let patched = false;

/**
 * Web uses the MSW service worker. MSW has no React Native entry, so a dev
 * build patches fetch with the same health and bbox responses.
 */
export async function enableMocks(): Promise<void> {
  if (patched) return;
  patched = true;
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/health" || url.pathname.endsWith("/health"))) {
      return Response.json(health);
    }
    if (request.method === "GET" && url.pathname.endsWith("/v1/events")) {
      return Response.json(listEvents(url.searchParams.get("bbox")));
    }
    return original(input, init);
  };
}
