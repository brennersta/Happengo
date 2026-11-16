import { createApiClient } from "@happengo/api-client";
import { bearerAuthMiddleware } from "./middleware";

test("attaches a bearer access token and omits it when signed out", async () => {
  const seen: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    seen.push(request.headers.get("Authorization") ?? "");
    return Response.json({ status: "ok" });
  };

  const signedIn = createApiClient({
    baseUrl: "http://localhost:5080",
    middleware: [bearerAuthMiddleware(async () => "abc")],
    fetch: fetchImpl,
  });
  const signedOut = createApiClient({
    baseUrl: "http://localhost:5080",
    middleware: [bearerAuthMiddleware(async () => null)],
    fetch: fetchImpl,
  });

  const ok = await signedIn.fetchClient.GET("/health");
  const anonymous = await signedOut.fetchClient.GET("/health");

  expect(ok.response.status).toBe(200);
  expect(anonymous.response.status).toBe(200);
  expect(seen).toEqual(["Bearer abc", ""]);
});
