/**
 * Web refresh tokens stay in memory for this process.
 * ADR 0005 rules out browser web storage. A durable web store is still open.
 */
export { memoryRefreshTokenStore as refreshTokenStore } from "./memoryRefreshTokenStore";
