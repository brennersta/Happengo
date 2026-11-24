import {
  acceptDemoInvite,
  createDemoInvite,
  demoInviteStatus,
  listDemoFriends,
  previewDemoInvite,
  removeDemoFriend,
  replaceDemoFriendTags,
  rotateDemoInvite,
} from "./friends";
import {
  cancelDemoAttendance,
  cancelDemoEvent,
  createDemoEvent,
  editDemoEvent,
  decideDemoAttendance,
  getDemoAttendance,
  getDemoPendingRequests,
  getEvent,
  isValidListDateFilter,
  listEvents,
  listMyEvents,
  requestDemoAttendance,
  type CreateEventRequest,
} from "./contract";
import { getDemoProfile, updateDemoDisplayName } from "./profile";

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

    if (request.method === "GET" && path.endsWith("/v1/me")) {
      return Response.json(getDemoProfile());
    }
    if (request.method === "PUT" && path.endsWith("/v1/me/display-name")) {
      const body = await request.json() as { displayName?: unknown };
      const profile = updateDemoDisplayName(body.displayName);
      return profile ? Response.json(profile) : Response.json({
        type: "https://happengo.app/problems/invalid-profile",
        title: "Invalid profile",
        status: 400,
      }, { status: 400 });
    }

    if (request.method === "GET" && path.endsWith("/v1/friends/invite")) {
      return Response.json(demoInviteStatus());
    }
    if (request.method === "POST" && path.endsWith("/v1/friends/invite/rotate")) {
      return Response.json(rotateDemoInvite());
    }
    if (request.method === "POST" && path.endsWith("/v1/friends/invite")) {
      const issued = createDemoInvite();
      return issued ? Response.json(issued, { status: 201 }) : problem(409);
    }
    const accept = path.match(/\/v1\/friends\/invites\/([^/]+)\/accept$/);
    if (request.method === "POST" && accept?.[1]) {
      const result = acceptDemoInvite(decodeURIComponent(accept[1]));
      if (result === "self") return problem(409);
      if (result === "missing") return problem(404);
      return Response.json(result);
    }
    const preview = path.match(/\/v1\/friends\/invites\/([^/]+)$/);
    if (request.method === "GET" && preview?.[1]) {
      const result = previewDemoInvite(decodeURIComponent(preview[1]));
      if (result === "self") return problem(409);
      if (result === "missing") return problem(404);
      return Response.json(result);
    }
    const friendTags = path.match(/\/v1\/friends\/([^/]+)\/tags$/);
    if (request.method === "PUT" && friendTags?.[1]) {
      const body = await request.json() as { tags?: string[] | null };
      const updated = replaceDemoFriendTags(friendTags[1], body.tags ?? []);
      return updated ? Response.json(updated) : problem(404);
    }
    const friend = path.match(/\/v1\/friends\/([^/]+)$/);
    if (request.method === "DELETE" && friend?.[1]) {
      return removeDemoFriend(friend[1]) ? new Response(null, { status: 204 }) : problem(404);
    }
    if (request.method === "GET" && path.endsWith("/v1/friends")) {
      return Response.json(listDemoFriends());
    }

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
    const cancelEvent = path.match(/\/v1\/events\/([^/]+)\/cancel$/);
    if (request.method === "POST" && cancelEvent?.[1]) {
      const event = cancelDemoEvent(cancelEvent[1]);
      return event ? Response.json(event) : problem(404);
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
    const eventEdit = path.match(/\/v1\/events\/([^/]+)$/);
    if (request.method === "PATCH" && eventEdit?.[1]) {
      const body = await request.json() as import("./contract").EditEventRequest;
      const event = editDemoEvent(eventEdit[1], body);
      return event ? Response.json(event) : problem(409);
    }
    if (request.method === "GET" && path.endsWith("/v1/events")) {
      const bbox = url.searchParams.get("bbox");
      if (!bbox) return new Response(null, { status: 400 });
      const when = url.searchParams.get("when") ?? "now";
      const timeZoneId = url.searchParams.get("timeZoneId") ?? "Europe/Tallinn";
      if (!isValidListDateFilter(when, timeZoneId)) {
        return Response.json({
          type: "https://happengo.app/problems/invalid-date-range",
          title: "Invalid date range",
          status: 400,
          detail: "when must be now, today, weekend, or next7days, and timeZoneId must be a valid IANA time zone.",
        }, { status: 400, headers: { "Content-Type": "application/problem+json" } });
      }
      return Response.json(listEvents(bbox, new Date(), {
        tags: url.searchParams.getAll("tags"),
        happeningNow: url.searchParams.get("happeningNow") === "true",
        when: when as "now" | "today" | "weekend" | "next7days",
        timeZoneId,
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

function problem(status: number): Response {
  return Response.json({
    type: status === 404 ? "https://happengo.app/problems/not-found" : "https://happengo.app/problems/invalid-friend",
    title: status === 404 ? "Not found" : "Friend invite conflict",
    status,
  }, { status });
}
