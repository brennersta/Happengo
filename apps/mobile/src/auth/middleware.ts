import type { Middleware } from "openapi-fetch";

export function bearerAuthMiddleware(
  getAccessToken: () => Promise<string | null>,
): Middleware {
  return {
    async onRequest({ request }) {
      const token = await getAccessToken();
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
      return request;
    },
  };
}
