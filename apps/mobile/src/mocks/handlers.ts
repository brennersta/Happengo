import { http, HttpResponse } from "msw";
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

export const handlers = [
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
  http.get("/v1/events/:id", ({ params }) => {
    const event = getEvent(String(params.id));
    return event ? HttpResponse.json(event) : new HttpResponse(null, { status: 404 });
  }),
  http.get("/v1/events", ({ request }) => {
    const bbox = new URL(request.url).searchParams.get("bbox");
    if (!bbox) return new HttpResponse(null, { status: 400 });
    const params = new URL(request.url).searchParams;
    return HttpResponse.json(listEvents(bbox, new Date(), {
      tags: params.getAll("tags"),
      happeningNow: params.get("happeningNow") === "true",
    }));
  }),
  http.post("/v1/events", async ({ request }) => {
    const body = await request.json() as CreateEventRequest;
    const event = createDemoEvent(body);
    if (!event) return new HttpResponse(null, { status: 400 });
    return HttpResponse.json(event, { status: 201, headers: { Location: `/v1/events/${event.id}` } });
  }),
];
