const defaultFulcrumConnectionTestUrl =
  "https://api.fulcrumapp.com/api/v2/users.json";

export type FulcrumConnectionTestResult =
  | {
      accountLabel?: string;
      category: "credentials_accepted";
      ok: true;
    }
  | {
      category:
        | "forbidden"
        | "network_error"
        | "rate_limited"
        | "unauthorized"
        | "unexpected_response"
        | "upstream_unavailable";
      ok: false;
    };

export async function testFulcrumApiToken(
  apiToken: string,
): Promise<FulcrumConnectionTestResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(getFulcrumConnectionTestUrl(), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-ApiToken": apiToken,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        category: mapFailedStatus(response.status),
        ok: false,
      };
    }

    return {
      accountLabel: getSafeAccountLabel(await readSafeJson(response)),
      category: "credentials_accepted",
      ok: true,
    };
  } catch {
    return {
      category: "network_error",
      ok: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getFulcrumConnectionTestUrl() {
  return (
    process.env["FULCRUM_CONNECTION_TEST_URL"] ??
    defaultFulcrumConnectionTestUrl
  );
}

function mapFailedStatus(
  status: number,
): Exclude<FulcrumConnectionTestResult["category"], "credentials_accepted"> {
  if (status === 401) {
    return "unauthorized";
  }

  if (status === 403) {
    return "forbidden";
  }

  if (status === 429) {
    return "rate_limited";
  }

  if (status >= 500) {
    return "upstream_unavailable";
  }

  return "unexpected_response";
}

async function readSafeJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function getSafeAccountLabel(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const user = getRecord(record["user"]);
  const organisation = getRecord(record["organization"] ?? record["organisation"]);
  const label =
    getString(record["name"]) ??
    getString(user?.["name"]) ??
    getString(organisation?.["name"]);

  return label ? label.slice(0, 120) : undefined;
}

function getRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
