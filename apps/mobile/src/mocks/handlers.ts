import { http, HttpResponse } from "msw";
import { getDemoProfile, updateDemoAttendanceSharing, updateDemoDisplayName } from "./profile";
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
import { closeDemoIncident, createDemoIncident, getDemoIncident, listDemoIncidents, voteDemoIncident, type CreateIncident } from "./incidents";

export const handlers = [
  http.post("/v1/reports", async ({ request }) => {
    const body = await request.json() as { targetType: string; targetId: string; reason: string };
    return HttpResponse.json({ ...body, createdAt: new Date().toISOString(), reportCount: 1, priorityReview: false }, { status: 201 });
  }),
  http.get("/v1/moderation/queue", () => HttpResponse.json({ items: [
    { targetType: "event", targetId: "demo-event-1", title: "Harbour choir", category: null, description: "A short harbour rehearsal, open to anyone nearby.", address: "Tallinn, Estonia", reportCount: 3, priorityReview: true, latestReportedAt: new Date().toISOString(), reasons: ["spam_scam", "fake_misleading"], resolved: false },
    { targetType: "incident", targetId: "demo-incident-1", title: null, category: "fire", description: "Smoke visible above the industrial area.", address: "Tallinn, Estonia", reportCount: 1, priorityReview: false, latestReportedAt: new Date().toISOString(), reasons: ["inappropriate_content"], resolved: false },
  ] })),
  http.post("/v1/moderation/incidents/:id/close", ({ params }) => HttpResponse.json({ targetType: "incident", targetId: params.id, action: "close_incident", reason: "Demo action", at: new Date().toISOString() })),
  http.post("/v1/moderation/events/:id/hide", ({ params }) => HttpResponse.json({ targetType: "event", targetId: params.id, action: "hide_event", reason: "Demo action", at: new Date().toISOString() })),
  http.get("/v1/incidents", ({ request }) => HttpResponse.json({ items: listDemoIncidents(new URL(request.url).searchParams.get("bbox")) })),
  http.post("/v1/incidents", async ({ request }) => {
    const result = createDemoIncident(await request.json() as CreateIncident);
    return result ? HttpResponse.json(result, { status: 201 }) : HttpResponse.json({ title: "Invalid incident", status: 400 }, { status: 400 });
  }),
  http.get("/v1/incidents/:id", ({ params }) => {
    const result = getDemoIncident(String(params.id));
    return result ? HttpResponse.json(result) : new HttpResponse(null, { status: 404 });
  }),
  http.post("/v1/incidents/:id/vote", async ({ params, request }) => {
    const body = await request.json() as { vote: "still_there" | "gone" };
    const result = voteDemoIncident(String(params.id), body.vote);
    return result ? HttpResponse.json(result) : new HttpResponse(null, { status: 409 });
  }),
  http.post("/v1/incidents/:id/close", ({ params }) => {
    const result = closeDemoIncident(String(params.id));
    return result ? HttpResponse.json(result) : new HttpResponse(null, { status: 404 });
  }),
  http.get("/v1/me", () => HttpResponse.json(getDemoProfile())),
  http.put("/v1/me/display-name", async ({ request }) => {
    const body = await request.json() as { displayName?: unknown };
    const profile = updateDemoDisplayName(body.displayName);
    return profile ? HttpResponse.json(profile) : HttpResponse.json({ title: "Invalid display name", status: 400 }, { status: 400 });
  }),
  http.put("/v1/me/attendance-sharing", async ({ request }) => {
    const body = await request.json() as { shareAttendanceWithFriends?: unknown };
    const profile = updateDemoAttendanceSharing(body.shareAttendanceWithFriends);
    return profile ? HttpResponse.json(profile) : HttpResponse.json({ title: "Invalid request", status: 400 }, { status: 400 });
  }),
  http.get("/v1/friends/invite", () => HttpResponse.json(demoInviteStatus())),
  http.post("/v1/friends/invite/rotate", () => HttpResponse.json(rotateDemoInvite())),
  http.post("/v1/friends/invite", () => {
    const issued = createDemoInvite();
    return issued ? HttpResponse.json(issued, { status: 201 }) : new HttpResponse(null, { status: 409 });
  }),
  http.get("/v1/friends/invites/:token", ({ params }) => {
    const result = previewDemoInvite(String(params.token));
    if (result === "self") return new HttpResponse(null, { status: 409 });
    if (result === "missing") return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(result);
  }),
  http.post("/v1/friends/invites/:token/accept", ({ params }) => {
    const result = acceptDemoInvite(String(params.token));
    if (result === "self") return new HttpResponse(null, { status: 409 });
    if (result === "missing") return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(result);
  }),
  http.put("/v1/friends/:userId/tags", async ({ params, request }) => {
    const body = await request.json() as { tags?: string[] | null };
    const updated = replaceDemoFriendTags(String(params.userId), body.tags ?? []);
    return updated ? HttpResponse.json(updated) : new HttpResponse(null, { status: 404 });
  }),
  http.delete("/v1/friends/:userId", ({ params }) => (
    removeDemoFriend(String(params.userId)) ? new HttpResponse(null, { status: 204 }) : new HttpResponse(null, { status: 404 })
  )),
  http.get("/v1/friends", () => HttpResponse.json(listDemoFriends())),
  http.get("/v1/events/:id/attendance/me", ({ params }) => {
    const response = getDemoAttendance(String(params.id));
    return response ? HttpResponse.json(response) : new HttpResponse(null, { status: 404 });
  }),
  http.get("/v1/events/:id/attendance/requests", ({ params }) => {
    const response = getDemoPendingRequests(String(params.id));
    return response ? HttpResponse.json(response) : new HttpResponse(null, { status: 404 });
  }),
  http.post("/v1/events/:id/attendance", async ({ params, request }) => {
    const body = await request.json() as { shareToken?: string | null };
    const response = requestDemoAttendance(String(params.id), body.shareToken ?? null);
    return response ? HttpResponse.json(response) : new HttpResponse(null, { status: 409 });
  }),
  http.post("/v1/events/:id/attendance/cancel", ({ params }) => {
    const response = cancelDemoAttendance(String(params.id));
    return response ? HttpResponse.json(response) : new HttpResponse(null, { status: 409 });
  }),
  http.post("/v1/events/:id/attendance/requests/:userId/approve", ({ params }) => {
    const response = decideDemoAttendance(String(params.id), String(params.userId), "attending");
    return response ? HttpResponse.json(response) : new HttpResponse(null, { status: 409 });
  }),
  http.post("/v1/events/:id/attendance/requests/:userId/reject", ({ params }) => {
    const response = decideDemoAttendance(String(params.id), String(params.userId), "rejected");
    return response ? HttpResponse.json(response) : new HttpResponse(null, { status: 409 });
  }),
  http.get("/v1/events/mine", () => HttpResponse.json(listMyEvents())),
  http.patch("/v1/events/:id", async ({ params, request }) => {
    const body = await request.json() as import("./contract").EditEventRequest;
    const event = editDemoEvent(String(params.id), body);
    return event ? HttpResponse.json(event) : new HttpResponse(null, { status: 409 });
  }),
  http.post("/v1/events/:id/cancel", ({ params }) => {
    const event = cancelDemoEvent(String(params.id));
    return event ? HttpResponse.json(event) : new HttpResponse(null, { status: 404 });
  }),
  http.get("/v1/events/:id", ({ params }) => {
    const event = getEvent(String(params.id));
    return event ? HttpResponse.json(event) : new HttpResponse(null, { status: 404 });
  }),
  http.get("/v1/events", ({ request }) => {
    const bbox = new URL(request.url).searchParams.get("bbox");
    if (!bbox) return new HttpResponse(null, { status: 400 });
    const params = new URL(request.url).searchParams;
    const when = params.get("when") ?? "now";
    const timeZoneId = params.get("timeZoneId") ?? "Europe/Tallinn";
    if (!isValidListDateFilter(when, timeZoneId)) {
      return HttpResponse.json({
        type: "https://happengo.app/problems/invalid-date-range",
        title: "Invalid date range",
        status: 400,
        detail: "when must be now, today, weekend, or next7days, and timeZoneId must be a valid IANA time zone.",
      }, { status: 400, headers: { "Content-Type": "application/problem+json" } });
    }
    return HttpResponse.json(listEvents(bbox, new Date(), {
      tags: params.getAll("tags"),
      happeningNow: params.get("happeningNow") === "true",
      when: when as "now" | "today" | "weekend" | "next7days",
      timeZoneId,
    }));
  }),
  http.post("/v1/events", async ({ request }) => {
    const body = await request.json() as CreateEventRequest;
    const event = createDemoEvent(body);
    if (!event) return new HttpResponse(null, { status: 400 });
    return HttpResponse.json(event, { status: 201, headers: { Location: `/v1/events/${event.id}` } });
  }),
];
