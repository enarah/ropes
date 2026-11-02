// Shared server-side check for the disposable demo database. Connection values
// are never returned or included in diagnostics. This grants no write permission.
export function isDisposableDemoDatabaseUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ["postgres:", "postgresql:"].includes(url.protocol) &&
      Boolean(url.hostname) && url.pathname === "/ropes_demo" && !url.hash &&
      [...url.searchParams.keys()].every((key) =>
        ["schema", "sslmode", "connection_limit", "pool_timeout"].includes(key),
      );
  } catch {
    return false;
  }
}
