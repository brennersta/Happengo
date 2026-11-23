import {
  cancelDemoAttendance,
  createDemoEvent,
  decideDemoAttendance,
  getDemoAttendance,
  getDemoPendingRequests,
  getEvent,
  listEvents,
  listMyEvents,
  requestDemoAttendance,
  type CreateEventRequest,
} from "./contract";

let patched = false;

/** In-memory API for dev native builds and the static web demo. No service worker. */
export async function enableFetchMocks(): Promise<void> {
  if (patched) return;
  patched = true;
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const path = url.pathname;

    const me = path.match(/\/v1\/events\/([^/]+)\/attendance\/me$/);
    if (request.method === "GET" && me?.[1]) {
      const response = getDemoAttendance(me[1]);
      return response ? Response.json(response) : new Response(null, { status: 404 });
    }
    const requests = path.match(/\/v1\/events\/([^/]+)\/attendance\/requests$/);
    if (request.method === "GET" && requests?.[1]) {
      const response = getDemoPendingRequests(requests[1]);
      return response ? Response.json(response) : new Response(null, { status: 404 });
    }
    const join = path.match(/\/v1\/events\/([^/]+)\/attendance$/);
    if (request.method === "POST" && join?.[1]) {
      const body = await request.json() as { shareToken?: string | null };
      const response = requestDemoAttendance(join[1], body.shareToken ?? null);
      return response ? Response.json(response) : new Response(null, { status: 409 });
    }
    const cancel = path.match(/\/v1\/events\/([^/]+)\/attendance\/cancel$/);
    if (request.method === "POST" && cancel?.[1]) {
      const response = cancelDemoAttendance(cancel[1]);
      return response ? Response.json(response) : new Response(null, { status: 409 });
    }
    const decision = path.match(/\/v1\/events\/([^/]+)\/attendance\/requests\/([^/]+)\/(approve|reject)$/);
    if (request.method === "POST" && decision?.[1] && decision[2] && decision[3]) {
      const next = decision[3] === "approve" ? "attending" : "rejected";
      const response = decideDemoAttendance(decision[1], decision[2], next);
      return response ? Response.json(response) : new Response(null, { status: 409 });
    }
    if (request.method === "GET" && path.endsWith("/v1/events/mine")) {
      return Response.json(listMyEvents());
    }
    if (request.method === "GET" && path.endsWith("/v1/events")) {
      const bbox = url.searchParams.get("bbox");
      if (!bbox) return new Response(null, { status: 400 });
      return Response.json(listEvents(bbox, new Date(), {
        tags: url.searchParams.getAll("tags"),
        happeningNow: url.searchParams.get("happeningNow") === "true",
      }));
    }
    const eventMatch = path.match(/\/v1\/events\/([^/]+)$/);
    if (request.method === "GET" && eventMatch?.[1]) {
      const event = getEvent(eventMatch[1]);
      return event ? Response.json(event) : new Response(null, { status: 404 });
    }
    if (request.method === "POST" && path.endsWith("/v1/events")) {
      const body = await request.json() as CreateEventRequest;
      const event = createDemoEvent(body);
      if (!event) return new Response(null, { status: 400 });
      return Response.json(event, { status: 201, headers: { Location: `/v1/events/${event.id}` } });
    }
    return original(input, init);
  };
}
