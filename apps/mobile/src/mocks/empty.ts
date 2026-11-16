export async function enableMocks(): Promise<void> {}

export const handlers: never[] = [];

export function setupWorker(): { start: () => Promise<void> } {
  return { start: async () => {} };
}
