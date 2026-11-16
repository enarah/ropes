import "server-only";
// Node-only provider boundary. No Prisma, UI, raw payload persistence or logging.
import { SaxesParser } from "saxes";
import { SpotCredentials } from "../credentials";
import { normaliseSpotMessage } from "../domain";
import type { NormalisedTrackingMessage } from "../types";
import { TrackingSyncError } from "../sync-errors";

const origin = "https://api.findmespot.com";
const feedPath = "/spot-main-web/consumer/rest-api/2.0/public/feed/";
export type SpotTransport = (url: URL, init: RequestInit) => Promise<Response>;
export type SpotFeedMessage = { messengerId: string; model: string | null; message: NormalisedTrackingMessage };
export type SpotFeedResult = { messages: SpotFeedMessage[]; malformedMessagesRejected: number };
// The official page publishes XML, but no normative JSON envelope/error schema.
// JSON requires an explicitly supplied, separately reviewed mapping to XML fields.
export type SpotJsonProfile = (body: unknown) => { count: unknown; messages: unknown };

type XmlNode = { name: string; text: string; children: XmlNode[] };
function single(node: XmlNode, name: string): XmlNode | undefined {
  const found = node.children.filter((child) => child.name === name);
  if (found.length > 1) throw new TrackingSyncError("MALFORMED_RESPONSE");
  return found[0];
}
function xmlEnvelope(text: string) {
  const stack: XmlNode[] = [];
  let root: XmlNode | undefined;
  let nodes = 0;
  const parser = new SaxesParser({ xmlns: false });
  parser.on("doctype", () => { throw new TrackingSyncError("MALFORMED_RESPONSE"); });
  parser.on("error", () => { throw new TrackingSyncError("MALFORMED_RESPONSE"); });
  parser.on("opentag", (tag) => {
    if (++nodes > 3000 || stack.length >= 16) throw new TrackingSyncError("MALFORMED_RESPONSE");
    const node: XmlNode = { name: tag.name, text: "", children: [] };
    if (stack.length) stack.at(-1)!.children.push(node);
    else root = node;
    stack.push(node);
  });
  const append = (value: string) => { if (stack.length) stack.at(-1)!.text += value; };
  parser.on("text", append);
  parser.on("cdata", append);
  parser.on("closetag", () => { stack.pop(); });
  parser.write(text).close();
  if (!root || root.name !== "response") throw new TrackingSyncError("MALFORMED_RESPONSE");
  const response: XmlNode = root;
  if (response.children.some((child) => child.name !== "feedMessageResponse")) throw new TrackingSyncError("PROVIDER_ERROR");
  const feed = single(response, "feedMessageResponse");
  if (!feed) throw new TrackingSyncError("PROVIDER_ERROR");
  const scalar = (node: XmlNode, key: string) => {
    const child = single(node, key);
    if (child?.children.length) throw new TrackingSyncError("MALFORMED_RESPONSE");
    return child?.text.trim();
  };
  const messages = single(feed, "messages");
  if (messages?.children.some((node) => node.name !== "message")) throw new TrackingSyncError("MALFORMED_RESPONSE");
  return { count: scalar(feed, "count"), messages: messages?.children.map((node) => {
    // Ignore unneeded personal/free-text/feed metadata. Per-message structure
    // failures are counted, without discarding other well-formed messages.
    try {
      return Object.fromEntries(["id", "messengerId", "unixTime", "messageType", "latitude", "longitude", "modelId"]
        .map((key) => [key, scalar(node, key)]));
    } catch { return null; }
  }) ?? [] };
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function identity(value: unknown) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value)) return value;
  throw new TrackingSyncError("MALFORMED_RESPONSE");
}
function number(value: unknown) {
  if (typeof value === "number") return value;
  return typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
}
export function parseSpotFeed(text: string, credentials: SpotCredentials, jsonProfile?: SpotJsonProfile): SpotFeedResult {
  try {
    const envelope = jsonProfile ? jsonProfile(JSON.parse(text)) : xmlEnvelope(text);
    const count = number(envelope.count);
    const raw = Array.isArray(envelope.messages) ? envelope.messages : record(envelope.messages) ? [envelope.messages] : [];
    // The published sample's count and entries disagree; do not infer paging
    // from that metadata. Bound actual work and require an explicit empty count.
    if (!Number.isSafeInteger(count) || count < 0 || raw.length > 50 || (!raw.length && count !== 0)) {
      throw new TrackingSyncError("MALFORMED_RESPONSE");
    }
    const messages: SpotFeedMessage[] = [];
    let malformedMessagesRejected = 0;
    for (const item of raw) {
      try {
        if (!record(item)) throw new TrackingSyncError("MALFORMED_RESPONSE");
        const externalMessageId = identity(item.id), messengerId = identity(item.messengerId);
        const unixTime = number(item.unixTime);
        if (!Number.isSafeInteger(unixTime) || unixTime < 0 || unixTime > 253402300799 ||
          typeof item.messageType !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(item.messageType)) throw new TrackingSyncError("MALFORMED_RESPONSE");
        for (const value of [externalMessageId, messengerId, item.messageType]) {
          if (credentials.containsSecret(value)) throw new TrackingSyncError("MALFORMED_RESPONSE");
        }
        const model = typeof item.modelId === "string" && /^[A-Za-z0-9 _-]{1,40}$/.test(item.modelId) &&
          !credentials.containsSecret(item.modelId) ? item.modelId : null;
        messages.push({ messengerId, model, message: normaliseSpotMessage({ externalMessageId,
          occurredAt: new Date(unixTime * 1000), providerMessageType: item.messageType.toUpperCase(),
          latitude: number(item.latitude), longitude: number(item.longitude) }) });
      } catch { malformedMessagesRejected++; }
    }
    return { messages, malformedMessagesRejected };
  } catch (error) {
    if (error instanceof TrackingSyncError) throw error;
    throw new TrackingSyncError("MALFORMED_RESPONSE");
  }
}
export function spotRequest(credentials: SpotCredentials, start = 1, json = false): URL {
  if (!Number.isSafeInteger(start) || start < 1 || start > 1_000_001 || (start - 1) % 50 !== 0) throw new TrackingSyncError("INVALID_ARGUMENTS");
  const url = new URL(feedPath, origin);
  credentials.applyTo(url);
  url.pathname += `message.${json ? "json" : "xml"}`;
  if (start !== 1) url.searchParams.set("start", String(start));
  assertSpotRequest(url);
  return url;
}
export function assertSpotRequest(url: URL) {
  if (url.protocol !== "https:" || url.hostname !== "api.findmespot.com" || (url.port && url.port !== "443") ||
    url.username || url.password || url.hash || !/^\/spot-main-web\/consumer\/rest-api\/2\.0\/public\/feed\/[A-Za-z0-9_-]+\/message\.(xml|json)$/.test(url.pathname) ||
    [...url.searchParams.keys()].some((key) => key !== "feedPassword" && key !== "start")) throw new TrackingSyncError("UNSAFE_REQUEST");
}
export function createSpotAdapter({ transport = (url, init) => fetch(url, init), timeoutMs = 10_000,
  maxBytes = 262_144, jsonProfile }: { transport?: SpotTransport; timeoutMs?: number; maxBytes?: number; jsonProfile?: SpotJsonProfile } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000 || !Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 1_048_576) {
    throw new TrackingSyncError("INVALID_ARGUMENTS");
  }
  return {
    async retrieve(credentials: SpotCredentials, start = 1): Promise<SpotFeedResult> {
      const url = spotRequest(credentials, start, Boolean(jsonProfile));
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new TrackingSyncError("REQUEST_TIMEOUT")); }, timeoutMs);
      });
      const request = async () => {
        let response: Response;
        try {
          response = await transport(url, { method: "GET", redirect: "error", signal: controller.signal,
            cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
            headers: { Accept: jsonProfile ? "application/json" : "application/xml" } });
        } catch { throw new TrackingSyncError(controller.signal.aborted ? "REQUEST_TIMEOUT" : "REQUEST_FAILED"); }
        if (controller.signal.aborted) throw new TrackingSyncError("REQUEST_TIMEOUT");
        if (response.redirected || (response.status >= 300 && response.status < 400) || (response.url && response.url !== url.href)) throw new TrackingSyncError("UNSAFE_REQUEST");
        if (!response.ok) throw new TrackingSyncError("PROVIDER_ERROR");
        const length = response.headers.get("content-length");
        if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new TrackingSyncError("RESPONSE_TOO_LARGE");
        if (!response.body) throw new TrackingSyncError("MALFORMED_RESPONSE");
        const reader = response.body.getReader();
        const cancel = () => { void reader.cancel().catch(() => {}); };
        controller.signal.addEventListener("abort", cancel, { once: true });
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > maxBytes) throw new TrackingSyncError("RESPONSE_TOO_LARGE");
            chunks.push(value);
          }
        } finally {
          controller.signal.removeEventListener("abort", cancel);
          await reader.cancel().catch(() => {});
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        let text: string;
        try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
        catch { throw new TrackingSyncError("MALFORMED_RESPONSE"); }
        return parseSpotFeed(text, credentials, jsonProfile);
      };
      try { return await Promise.race([request(), timeout]); }
      catch (error) {
        controller.abort();
        if (error instanceof TrackingSyncError) throw error;
        throw new TrackingSyncError("REQUEST_FAILED");
      } finally { clearTimeout(timer); }
    },
  };
}
