import assert from "node:assert/strict";
import { inspect } from "node:util";
import test from "node:test";
import { SpotCredentials, createEnvironmentCredentialResolver } from "../../lib/tracking/credentials";
import { createSpotAdapter, parseSpotFeed, spotRequest, assertSpotRequest } from "../../lib/tracking/providers/spot";
import { TrackingSyncError } from "../../lib/tracking/sync-errors";
import { feedId, password, credentialKey, environment, event, xml, jsonProfile, batch } from "./spot-fixtures";

const credentials = new SpotCredentials(feedId, password);
const code = (expected: string) => (error: unknown) => {
  assert.ok(error instanceof TrackingSyncError);
  assert.equal(error.code, expected);
  assert.doesNotMatch(String(error.stack), new RegExp(`${feedId}|${password}|api.findmespot.com`));
  return true;
};
test("credential resolver is canonical, injectable, opaque and fails closed before invalid-key lookup", async () => {
  const resolved = await createEnvironmentCredentialResolver(environment)(credentialKey);
  assert.doesNotMatch(JSON.stringify(resolved) + inspect(resolved), new RegExp(`${feedId}|${password}`));
  const url = spotRequest(resolved);
  assert.equal(url.hostname, "api.findmespot.com");
  assert.equal(url.searchParams.get("feedPassword"), password);
  assert.ok(url.pathname.includes(feedId));
  for (const key of ["", "UPPER", "a_b", "a--b", "../escape", "__proto__", "x".repeat(65)]) {
    let lookedUp = false;
    const resolver = createEnvironmentCredentialResolver(new Proxy({}, { get() { lookedUp = true; } }));
    await assert.rejects(resolver(key), code("CREDENTIALS_UNAVAILABLE"));
    assert.equal(lookedUp, false);
  }
  await assert.rejects(createEnvironmentCredentialResolver({})(credentialKey), code("CREDENTIALS_UNAVAILABLE"));
  assert.throws(() => new SpotCredentials("https://synthetic.invalid"), code("CREDENTIALS_UNAVAILABLE"));
  assert.throws(() => new SpotCredentials(feedId, "bad\nvalue"), code("CREDENTIALS_UNAVAILABLE"));
  assert.equal(spotRequest(new SpotCredentials(feedId)).searchParams.has("feedPassword"), false);
});
test("documented XML zero, single and multiple messages preserve Unix UTC times and independent HELP_CANCEL", () => {
  assert.deepEqual(parseSpotFeed(xml([]), credentials), { messages: [], malformedMessagesRejected: 0 });
  const single = parseSpotFeed(xml([event()]), credentials);
  assert.equal(single.messages.length, 1);
  assert.equal(single.messages[0].message.occurredAt.toISOString(), "2030-01-01T11:55:00.000Z");
  assert.equal(parseSpotFeed(xml([event()]).replace("<count>1</count>", "<count>10</count>"), credentials).messages.length, 1);
  const result = parseSpotFeed(xml(batch()), credentials);
  assert.deepEqual(result.messages.map((event) => event.message.messageKind), ["TRACKING", "CHECK_IN", "HELP", "HELP_CANCEL"]);
  assert.equal(result.messages.at(-1)?.message.latitude, null);
  assert.equal(result.messages.at(-1)?.message.longitude, null);
  assert.equal(result.messages.at(-1)?.message.occurredAt.toISOString(), "2030-01-01T11:59:00.000Z");
  assert.equal(JSON.stringify(result).includes("Ignored synthetic private metadata"), false);
});
test("XML malformed messages are bounded rejects; invalid coordinate pairs remain non-position events", () => {
  const result = parseSpotFeed(xml([
    event({ unixTime: undefined }), event({ unixTime: "not-time" }), event({ messengerId: undefined }),
    event({ id: "" }), event({ unixTime: "1893498900.5" }), event({ messageType: undefined }),
    event({ messageType: "FUTURE-TYPE", latitude: undefined, longitude: -0.12 }),
    event({ latitude: "NaN", longitude: 1 }), event({ latitude: "", longitude: 0 }),
  ]), credentials);
  assert.equal(result.malformedMessagesRejected, 6);
  assert.equal(result.messages.length, 3);
  assert.equal(result.messages[0].message.messageKind, "UNKNOWN");
  for (const event of result.messages) { assert.equal(event.message.latitude, null); assert.equal(event.message.longitude, null); }
});
test("XML syntax, duplicate fields, DTD/entities, depth and envelope/count errors fail safely", () => {
  for (const body of ["not XML", "<response>",
    `<!DOCTYPE response [<!ENTITY x SYSTEM "file:///synthetic">]><response>&x;</response>`,
    "<response><errors><error>" + password + "</error></errors></response>",
    xml([event()]).replace("<count>1</count>", "<count>invalid</count>"), "<response>" + "<x>".repeat(20) + "</x>".repeat(20) + "</response>",
    xml([event()]).replace("<message ", "<message bad=\"&unknown;\" "),
  ]) assert.throws(() => parseSpotFeed(body, credentials), (error: unknown) => {
    assert.ok(error instanceof TrackingSyncError); assert.doesNotMatch(String(error), new RegExp(password)); return true;
  });
  assert.equal(parseSpotFeed(xml([event()]).replace("</message>", "<id>duplicate</id></message>"), credentials).malformedMessagesRejected, 1);
});
test("JSON is opt-in through an explicit envelope profile, supporting singleton and arrays without guessing errors", () => {
  for (const messages of [event(), [event(), event({ id: "synthetic-second" })]]) {
    const payload = JSON.stringify({ response: { feedMessageResponse: { count: Array.isArray(messages) ? 2 : 1, messages: { message: messages } } } });
    assert.equal(parseSpotFeed(payload, credentials, jsonProfile).messages.length, Array.isArray(messages) ? 2 : 1);
    assert.throws(() => parseSpotFeed(payload, credentials), code("MALFORMED_RESPONSE"));
  }
  assert.throws(() => parseSpotFeed('{"response":{"errors":{"text":"synthetic"}}}', credentials, jsonProfile), code("MALFORMED_RESPONSE"));
});
test("reflected credential values are not persisted as IDs, message types or model metadata", () => {
  const result = parseSpotFeed(xml([event({ id: feedId }), event({ messengerId: password }),
    event({ modelId: password }), event({ messageType: password })]), credentials);
  assert.equal(result.malformedMessagesRejected, 3);
  assert.equal(result.messages[0].model, null);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(`${feedId}|${password}`));
});
test("requests are HTTPS/host/path allowlisted with explicit one-page offsets and no redirects", async () => {
  for (const value of ["http://api.findmespot.com", "https://synthetic.invalid", "https://api.findmespot.com:444", "https://api.findmespot.com.evil.invalid", "https://user:pass@api.findmespot.com"]) {
    assert.throws(() => assertSpotRequest(new URL(value + "/spot-main-web/consumer/rest-api/2.0/public/feed/synthetic/message.xml")), code("UNSAFE_REQUEST"));
  }
  for (const start of [0, -1, 2, 50, 1.5, NaN, 1_000_002]) assert.throws(() => spotRequest(credentials, start), code("INVALID_ARGUMENTS"));
  let calls = 0;
  const adapter = createSpotAdapter({ transport: async (url, init) => {
    calls++;
    assert.equal(url.searchParams.get("start"), "51"); assert.equal(init.redirect, "error");
    assert.equal(init.referrerPolicy, "no-referrer"); assert.equal(init.cache, "no-store");
    return new Response(xml([event()]), { headers: { "content-type": "application/xml" } });
  } });
  await adapter.retrieve(credentials, 51); assert.equal(calls, 1);
  await assert.rejects(createSpotAdapter({ transport: async () => new Response(null, { status: 302, headers: { location: "https://synthetic.invalid" } }) }).retrieve(credentials), code("UNSAFE_REQUEST"));
  await assert.rejects(createSpotAdapter({ transport: async () => Object.defineProperty(new Response(xml([])), "redirected", { value: true }) }).retrieve(credentials), code("UNSAFE_REQUEST"));
});
test("provider failures and transport exceptions never expose request URLs, secrets or raw error text", async () => {
  assert.equal(new TrackingSyncError(password as never).message, "PERSISTENCE_FAILED");
  const messages: string[] = [];
  const original = console.error; console.error = (...args) => { messages.push(args.join(" ")); };
  try {
    await assert.rejects(createSpotAdapter({ transport: async () => new Response(password, { status: 503 }) }).retrieve(credentials), code("PROVIDER_ERROR"));
    await assert.rejects(createSpotAdapter({ transport: async (url) => { throw new Error(url.href + password); } }).retrieve(credentials), code("REQUEST_FAILED"));
    assert.deepEqual(messages, []);
  } finally { console.error = original; }
});
test("request deadline covers headers and stalled bodies, aborts transport and cancels streams", async () => {
  let signal: AbortSignal | null | undefined;
  await assert.rejects(createSpotAdapter({ timeoutMs: 15, transport: async (_url, init) => {
    signal = init.signal; return new Promise(() => {});
  } }).retrieve(credentials), code("REQUEST_TIMEOUT"));
  assert.equal(signal?.aborted, true);
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  await assert.rejects(createSpotAdapter({ timeoutMs: 15, transport: async () => new Response(body) }).retrieve(credentials), code("REQUEST_TIMEOUT"));
  assert.equal(cancelled, true);
});
test("response limits apply to declared and streamed bytes, and invalid UTF-8 is rejected", async () => {
  await assert.rejects(createSpotAdapter({ maxBytes: 20, transport: async () => new Response("", { headers: { "content-length": "21" } }) }).retrieve(credentials), code("RESPONSE_TOO_LARGE"));
  await assert.rejects(createSpotAdapter({ maxBytes: 20, transport: async () => new Response("x".repeat(21)) }).retrieve(credentials), code("RESPONSE_TOO_LARGE"));
  await assert.rejects(createSpotAdapter({ transport: async () => new Response(new Uint8Array([0xff])) }).retrieve(credentials), code("MALFORMED_RESPONSE"));
});
