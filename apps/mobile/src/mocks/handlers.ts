import { http, HttpResponse } from "msw";
import { listEvents } from "./contract";

export const handlers = [
  http.get("/v1/events", ({ request }) => {
    const bbox = new URL(request.url).searchParams.get("bbox");
    if (!bbox) return new HttpResponse(null, { status: 400 });
    return HttpResponse.json(listEvents(bbox));
  }),
];
