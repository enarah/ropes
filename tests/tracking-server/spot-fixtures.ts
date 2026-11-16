// Invented identifiers, secrets and open-ocean positions. Never contacts SPOT.
export const feedId = "synthetic-feed-secret-canary";
export const password = "synthetic-password-secret-canary";
export const credentialKey = "synthetic-sync";
export const organisationId = "synthetic-sync-org-a";
export const integrationId = "synthetic-sync-integration-a";
export const environment = {
  NODE_ENV: "test", ROPES_RUNTIME_ENV: "sandbox", ALLOW_SPOT_ONE_SHOT_SYNC: "true",
  ROPES_SPOT_SYNC_ORGANISATION_ID: organisationId,
  ROPES_TRACKING_SYNTHETIC_SYNC_FEED_ID: feedId,
  ROPES_TRACKING_SYNTHETIC_SYNC_FEED_PASSWORD: password,
};
export const event = (changes: Record<string, unknown> = {}) => ({
  id: "synthetic-message-track", messengerId: "synthetic-messenger-a", unixTime: 1893498900,
  messageType: "TRACK", latitude: 0.12, longitude: -0.12, modelId: "SPOT2", ...changes,
});
const escape = (value: unknown) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
export function xml(messages: Record<string, unknown>[]) {
  return `<?xml version="1.0" encoding="UTF-8"?><response><feedMessageResponse><count>${messages.length}</count><feed><id>${feedId}</id><name>Ignored synthetic private metadata</name></feed><messages>${messages.map((message) => `<message clientUnixTime="0">${Object.entries(message).filter(([, value]) => value !== undefined).map(([key, value]) => `<${key}>${escape(value)}</${key}>`).join("")}</message>`).join("")}</messages></feedMessageResponse></response>`;
}
export const batch = () => [event(), event({ id: "synthetic-message-ok", messageType: "OK", unixTime: 1893498960 }),
  event({ id: "synthetic-message-help", messageType: "HELP", unixTime: 1893499020 }),
  event({ id: "synthetic-message-cancel", messageType: "HELP-CANCEL", unixTime: 1893499140, latitude: -99999, longitude: -99999 })];
// Explicit test-only XML-equivalent JSON mapping; not a claimed official schema.
export const jsonProfile = (body: unknown) => {
  const root = body as { response?: { feedMessageResponse?: { count: unknown; messages: { message: unknown } } } };
  if (!root?.response?.feedMessageResponse) throw new Error("Synthetic JSON profile rejected");
  const envelope = root.response.feedMessageResponse;
  return { count: envelope.count, messages: envelope.messages?.message };
};
