import {
  cancelDemoAttendance,
  createDemoEvent,
  decideDemoAttendance,
  getDemoAttendance,
  getDemoPendingRequests,
  getEvent,
  listEvents,
  requestDemoAttendance,
  type CreateEventRequest,
} from "./contract";

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
    const mineMatch = url.pathname.match(/\/v1\/events\/([^/]+)\/attendance\/me$/);
    if (request.method === "GET" && mineMatch?.[1]) {
      const response = getDemoAttendance(mineMatch[1]);
      return response ? Response.json(response) : new Response(null, { status: 404 });
    }
    const requestsMatch = url.pathname.match(/\/v1\/events\/([^/]+)\/attendance\/requests$/);
    if (request.method === "GET" && requestsMatch?.[1]) {
      const response = getDemoPendingRequests(requestsMatch[1]);
      return response ? Response.json(response) : new Response(null, { status: 404 });
    }
    const joinMatch = url.pathname.match(/\/v1\/events\/([^/]+)\/attendance$/);
    if (request.method === "POST" && joinMatch?.[1]) {
      const body = await request.json() as { shareToken?: string | null };
      const response = requestDemoAttendance(joinMatch[1], body.shareToken ?? null);
      return response ? Response.json(response) : new Response(null, { status: 409 });
    }
    const cancelMatch = url.pathname.match(/\/v1\/events\/([^/]+)\/attendance\/cancel$/);
    if (request.method === "POST" && cancelMatch?.[1]) {
      const response = cancelDemoAttendance(cancelMatch[1]);
      return response ? Response.json(response) : new Response(null, { status: 409 });
    }
    const decisionMatch = url.pathname.match(/\/v1\/events\/([^/]+)\/attendance\/requests\/([^/]+)\/(approve|reject)$/);
    if (request.method === "POST" && decisionMatch?.[1] && decisionMatch[2] && decisionMatch[3]) {
      const decision = decisionMatch[3] === "approve" ? "attending" : "rejected";
      const response = decideDemoAttendance(decisionMatch[1], decisionMatch[2], decision);
      return response ? Response.json(response) : new Response(null, { status: 409 });
    }
    if (request.method === "GET" && url.pathname.endsWith("/v1/events")) {
      const bbox = url.searchParams.get("bbox");
      if (!bbox) return new Response(null, { status: 400 });
      return Response.json(listEvents(bbox));
    }
    const eventMatch = url.pathname.match(/\/v1\/events\/([^/]+)$/);
    if (request.method === "GET" && eventMatch?.[1]) {
      const event = getEvent(eventMatch[1]);
      return event ? Response.json(event) : new Response(null, { status: 404 });
    }
    if (request.method === "POST" && url.pathname.endsWith("/v1/events")) {
      const body = await request.json() as CreateEventRequest;
      const event = createDemoEvent(body);
      if (!event) return new Response(null, { status: 400 });
      return Response.json(event, { status: 201, headers: { Location: `/v1/events/${event.id}` } });
    }
    return original(input, init);
  };
}
