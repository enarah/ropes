// Test-only preload for the REAL CLI. Production URL construction/allowlisting
// still runs. No request can escape to SPOT: only this loopback mock is called.
const port = process.env.ROPES_SPOT_MOCK_PORT;
if (!/^\d+$/.test(port ?? "") || Number(port) < 1 || Number(port) > 65535 || !process.send) {
  throw new Error("INVALID_REHEARSAL_CONFIGURATION");
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(String(input));
  if (url.origin !== "https://api.findmespot.com" ||
    !/^\/spot-main-web\/consumer\/rest-api\/2\.0\/public\/feed\/[A-Za-z0-9_-]+\/message\.xml$/.test(url.pathname) ||
    options?.redirect !== "error") throw new Error("UNEXPECTED_REHEARSAL_REQUEST");
  // No secret-bearing URL, headers or body is forwarded to the mock server.
  const response = await originalFetch(`http://127.0.0.1:${port}/mock-feed`, options);
  // Synthetic Response intentionally has no URL, like existing injected tests.
  return new Response(response.body, { status: response.status, headers: response.headers });
};
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("REHEARSAL_BARRIER_TIMEOUT")), 15_000);
  process.once("message", (message) => {
    clearTimeout(timer);
    if (message !== "go") reject(new Error("INVALID_REHEARSAL_BARRIER"));
    else resolve();
    process.disconnect();
  });
  process.send("ready");
});
