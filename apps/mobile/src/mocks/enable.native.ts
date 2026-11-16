import { listEvents } from "./contract";

let patched = false;

/**
 * Web uses the MSW service worker. MSW has no React Native entry, so a dev
 * build patches fetch with the same viewport response. Production builds do not.
 */
export async function enableMocks(): Promise<void> {
  if (!__DEV__ || patched) return;
  patched = true;
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname.endsWith("/v1/events")) {
      const bbox = url.searchParams.get("bbox");
      if (!bbox) return new Response(null, { status: 400 });
      return Response.json(listEvents(bbox));
    }
    return original(input, init);
  };
}
