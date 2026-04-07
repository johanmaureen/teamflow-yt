export const runtime = "nodejs";
export async function register() {
  // Conditionally import if facing runtime compatibility issues
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/orpc.server");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    // Optionally handle edge, or leave empty to do nothing
  }
}
