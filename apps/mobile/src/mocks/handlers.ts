import { http, HttpResponse } from "msw";
import { health, listEvents } from "./contract";

export const handlers = [
  http.get("/health", () => HttpResponse.json(health)),
  http.get("/v1/events", ({ request }) => {
    const bbox = new URL(request.url).searchParams.get("bbox");
    return HttpResponse.json(listEvents(bbox));
  }),
];
