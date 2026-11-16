import { createApiClient } from "@happengo/api-client";
import { auth, bearerAuthMiddleware } from "@/auth";

const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || "http://localhost:5080";

export const { fetchClient, query } = createApiClient({
  baseUrl,
  middleware: [bearerAuthMiddleware(() => auth.getAccessToken())],
});
