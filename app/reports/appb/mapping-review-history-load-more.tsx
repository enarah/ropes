"use client";

import { useState, useTransition } from "react";
import type { AppbMappingReviewDecisionHistoryEntry } from "@/lib/appb-reporting";
import {
  type AppbMappingReviewHistoryLoadMoreInput,
} from "@/lib/appb-mapping-review-history";
import { loadOlderAppbMappingReviewHistoryAction } from "./actions";

type AppbMappingReviewHistoryLoadMoreProps = {
  initialCursor?: string;
  initialRemainingCount: number;
  requestScope: Omit<AppbMappingReviewHistoryLoadMoreInput, "cursor">;
};

export function AppbMappingReviewHistoryLoadMore({
  initialCursor,
  initialRemainingCount,
  requestScope,
}: AppbMappingReviewHistoryLoadMoreProps) {
  const [events, setEvents] = useState<
    AppbMappingReviewDecisionHistoryEntry[]
  >([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [remainingCount, setRemainingCount] = useState(
    initialRemainingCount,
  );
  const [errorCode, setErrorCode] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function loadOlderEvents() {
    if (!cursor) {
      setErrorCode("invalid-request");
      return;
    }

    setErrorCode(undefined);
    startTransition(async () => {
      try {
        const result = await loadOlderAppbMappingReviewHistoryAction({
          ...requestScope,
          cursor,
        });

        if (result.status === "error") {
          setErrorCode(result.code);
          return;
        }

        setEvents((currentEvents) => [...currentEvents, ...result.events]);
        setRemainingCount(result.remainingCount);

        setCursor(result.nextCursor);
      } catch {
        setErrorCode("unavailable");
      }
    });
  }

  return (
    <div className="mt-2 rounded-md border border-earth-200 bg-white p-2">
      {events.length > 0 ? (
        <MappingReviewDecisionVersionList versions={events} />
      ) : null}

      {errorCode ? (
        <p className="mt-2 text-xs leading-5 text-red-700">
          {loadMoreErrorMessage(errorCode)}
        </p>
      ) : null}

      {remainingCount > 0 && cursor ? (
        <button
          className="mt-2 inline-flex rounded-md border border-earth-300 bg-white px-3 py-2 text-xs font-semibold text-charcoal-700 disabled:cursor-wait disabled:opacity-60"
          disabled={isPending}
          onClick={loadOlderEvents}
          type="button"
        >
          {isPending
            ? "Loading older events…"
            : `Load older events (${remainingCount} remaining)`}
        </button>
      ) : remainingCount > 0 ? (
        <p className="mt-2 text-xs leading-5 text-charcoal-600">
          Older value-free events are available, but the safe cursor is no
          longer valid. Refresh this report before loading them.
        </p>
      ) : events.length > 0 ? (
        <p className="mt-2 text-xs leading-5 text-charcoal-600">
          All older value-free events for this target are loaded.
        </p>
      ) : null}
    </div>
  );
}

export function MappingReviewDecisionVersionList({
  versions,
}: {
  versions: AppbMappingReviewDecisionHistoryEntry[];
}) {
  return (
    <ol className="mt-2 space-y-2">
      {versions.map((version, index) => {
        const isUpdate = Boolean(
          version.previousDecision || version.previousStatus,
        );

        return (
          <li
            className="rounded-md bg-white p-2 text-xs leading-5 text-charcoal-600"
            key={`${version.reviewedAt}-${index}`}
          >
            <p className="font-semibold text-charcoal-700">
              {isUpdate ? "Decision changed" : "Current decision recorded"}
            </p>
            <p>
              Decision:{" "}
              {version.previousDecision
                ? `${formatStatus(version.previousDecision)} → ${formatStatus(version.newDecision)}`
                : formatStatus(version.newDecision)}
            </p>
            <p>
              {version.previousStatus ? "Status changed" : "Status"}:{" "}
              {version.previousStatus
                ? `${formatStatus(version.previousStatus)} → ${formatStatus(version.newStatus)}`
                : formatStatus(version.newStatus)}
            </p>
            <p>
              Reviewed by {version.reviewerDisplayName ?? "Unknown reviewer"} /{" "}
              {formatReviewDate(version.reviewedAt)}
            </p>
            {version.safeNote ? <p>Safe note: {version.safeNote}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}

function loadMoreErrorMessage(code: string) {
  switch (code) {
    case "access-denied":
      return "Access to older APP&B mapping review history was denied.";
    case "invalid-request":
      return "The older-history request was invalid or no longer matches this target.";
    default:
      return "Older APP&B mapping review history is temporarily unavailable.";
  }
}

function formatStatus(status: string) {
  return status
    .split("-")
    .join(" ")
    .split("_")
    .join(" ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatReviewDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Review date unavailable";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
