import "server-only";

// Mock is explicitly selected. A missing/invalid configuration never signs in
// a demo user, and an API outage must never fall back to mock authentication.
export const authMockEnabled = () => process.env.AUTH_MODE === "mock";
export const authApiEnabled = () => process.env.AUTH_MODE === "api";
export const authEnabled = () => authMockEnabled() || authApiEnabled();
