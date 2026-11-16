import createFetchClient, { type Client, type Middleware } from "openapi-fetch";
import createQueryClient from "openapi-react-query";
import type { paths } from "./generated/schema";

export type { components, paths } from "./generated/schema";

export type ApiFetchClient = Client<paths>;

export function createApiClient(options: {
  baseUrl: string;
  middleware?: readonly Middleware[];
  fetch?: typeof globalThis.fetch;
}) {
  const fetchClient = createFetchClient<paths>({
    baseUrl: options.baseUrl,
    fetch: options.fetch,
  });
  for (const middleware of options.middleware ?? []) {
    fetchClient.use(middleware);
  }
  return {
    fetchClient,
    query: createQueryClient(fetchClient),
  };
}
