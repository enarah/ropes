import Link from "next/link";
import {
  CalendarCheck,
  Download,
  MapPinned,
  Pencil,
  Truck,
  Users,
} from "lucide-react";
import { transitionTripApprovalAction } from "@/app/trips/actions";
import type { DemoTrip } from "@/lib/trips-data";
import { organisationHref } from "@/lib/trips-data";

type TripsDetailProps = {
  approvalResult?: string;
  organisationName: string;
  organisationSlug: string;
  trip: DemoTrip;
};

export function TripsDetail({
  approvalResult,
  organisationName,
  organisationSlug,
  trip,
}: TripsDetailProps) {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-earth-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-ochre-700">
            Trips / {organisationName}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-charcoal-950">
            {trip.title}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
            {trip.purpose}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-earth-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-800"
            href={organisationHref(`/trips/${trip.id}/edit`, organisationSlug)}
          >
            <Pencil aria-hidden="true" size={16} />
            Edit
          </Link>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white"
            type="button"
          >
            <Download aria-hidden="true" size={16} />
            Export
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Trip status" value={trip.status} />
        <SummaryCard label="Approval" value={trip.approvalStatus} />
        <SummaryCard label="Starts" value={formatDate(trip.startsAt)} />
        <SummaryCard label="Ends" value={formatDate(trip.endsAt)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel
          icon={<Users aria-hidden="true" size={18} />}
          title="Participants"
        >
          <div className="divide-y divide-earth-100">
            {trip.participants.map((participant) => (
              <Row
                key={participant.name}
                meta={participant.role}
                status={participant.status}
                title={participant.name}
              />
            ))}
          </div>
        </Panel>

        <Panel icon={<Truck aria-hidden="true" size={18} />} title="Vehicles">
          <div className="divide-y divide-earth-100">
            {trip.vehicles.map((vehicle) => (
              <Row
                key={vehicle.registration}
                meta={vehicle.registration}
                status={vehicle.status}
                title={vehicle.name}
              />
            ))}
          </div>
        </Panel>
      </section>

      <Panel icon={<MapPinned aria-hidden="true" size={18} />} title="Itinerary">
        <div className="grid gap-3 md:grid-cols-3">
          {trip.itinerary.map((item) => (
            <article
              className="rounded-md border border-earth-200 bg-earth-50 p-4"
              key={`${item.day}-${item.title}`}
            >
              <p className="text-xs font-semibold uppercase text-ochre-700">
                {item.day}
              </p>
              <h3 className="mt-2 font-semibold text-charcoal-950">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-charcoal-600">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel
        icon={<CalendarCheck aria-hidden="true" size={18} />}
        title="Approval status"
      >
        <ApprovalPanel
          approvalResult={approvalResult}
          organisationSlug={organisationSlug}
          trip={trip}
        />
      </Panel>
    </div>
  );
}

function ApprovalPanel({
  approvalResult,
  organisationSlug,
  trip,
}: {
  approvalResult?: string;
  organisationSlug: string;
  trip: DemoTrip;
}) {
  const actions = getApprovalActions(trip.approvalStatus);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
        <p className="text-sm font-semibold text-charcoal-950">
          Current workflow state: {trip.approvalStatus}
        </p>
        <p className="mt-1 text-sm leading-6 text-charcoal-600">
          Trips can move from draft to ready for review, then to approved or
          changes requested. Before review, ROPES checks for core trip details,
          at least one participant and at least one itinerary row. Vehicle
          allocation is recommended but not blocking yet.
        </p>
      </div>

      {approvalResult ? <ApprovalResultMessage result={approvalResult} /> : null}

      {trip.organisationId ? (
        actions.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {actions.map((action) => (
              <form
                action={transitionTripApprovalAction}
                className="rounded-md border border-earth-200 bg-white p-4"
                key={action.target}
              >
                <input
                  name="organisationSlug"
                  type="hidden"
                  value={organisationSlug}
                />
                <input
                  name="organisationId"
                  type="hidden"
                  value={trip.organisationId}
                />
                <input name="tripId" type="hidden" value={trip.id} />
                <input
                  name="targetApprovalStatus"
                  type="hidden"
                  value={action.target}
                />
                <label className="block">
                  <span className="text-sm font-semibold text-charcoal-800">
                    {action.noteLabel}
                  </span>
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-md border border-earth-200 bg-earth-50 px-3 py-2 text-sm outline-none focus:border-ochre-600"
                    maxLength={500}
                    name="approvalNote"
                    placeholder={action.notePlaceholder}
                    required={action.requiresNote}
                  />
                </label>
                <p className="mt-2 text-xs leading-5 text-charcoal-500">
                  Plain text only. Maximum 500 characters.
                  {action.requiresNote ? " Required for this action." : ""}
                </p>
                <button className={action.className} type="submit">
                  {action.label}
                </button>
              </form>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-charcoal-600">
            No workflow action is available from this state.
          </p>
        )
      ) : (
        <p className="text-sm leading-6 text-charcoal-600">
          Approval workflow actions require a configured database and a
          persisted organisation-scoped trip. Local demo trips keep their
          read-only approval labels.
        </p>
      )}

      <ApprovalNotes notes={trip.approvalNotes} />
    </div>
  );
}

function getApprovalActions(approvalStatus: DemoTrip["approvalStatus"]) {
  const primaryClass =
    "mt-3 rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white shadow-sm";
  const secondaryClass =
    "mt-3 rounded-md border border-earth-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-800";

  if (approvalStatus === "Draft") {
    return [
      {
        className: primaryClass,
        label: "Request review",
        noteLabel: "Review note",
        notePlaceholder: "Optional context for the reviewer.",
        requiresNote: false,
        target: "READY_FOR_REVIEW",
      },
      {
        className: secondaryClass,
        label: "Cancel trip",
        noteLabel: "Cancellation reason",
        notePlaceholder: "Briefly explain why this trip is being cancelled.",
        requiresNote: true,
        target: "CANCELLED",
      },
    ];
  }

  if (approvalStatus === "Ready for review") {
    return [
      {
        className: primaryClass,
        label: "Approve",
        noteLabel: "Approval note",
        notePlaceholder: "Optional approval context.",
        requiresNote: false,
        target: "APPROVED",
      },
      {
        className: secondaryClass,
        label: "Request changes",
        noteLabel: "Change-request reason",
        notePlaceholder: "Explain what needs to change before approval.",
        requiresNote: true,
        target: "CHANGES_REQUESTED",
      },
      {
        className: secondaryClass,
        label: "Cancel trip",
        noteLabel: "Cancellation reason",
        notePlaceholder: "Briefly explain why this trip is being cancelled.",
        requiresNote: true,
        target: "CANCELLED",
      },
    ];
  }

  if (approvalStatus === "Changes requested") {
    return [
      {
        className: primaryClass,
        label: "Resubmit for review",
        noteLabel: "Response note",
        notePlaceholder: "Optional note about what changed.",
        requiresNote: false,
        target: "READY_FOR_REVIEW",
      },
    ];
  }

  return [];
}

function ApprovalResultMessage({ result }: { result: string }) {
  const messages: Record<string, { title: string; body: string }> = {
    "already-cancelled": {
      title: "Trip is already cancelled",
      body: "Cancelled trips cannot move through the review workflow.",
    },
    demo: {
      title: "Demo fallback",
      body: "No local database is configured, so the approval action was not saved.",
    },
    error: {
      title: "Workflow update failed",
      body: "The approval action was rejected before any trip state changed.",
    },
    "invalid-transition": {
      title: "Workflow action unavailable",
      body: "That approval action is not allowed from the current trip state.",
    },
    "missing-review-data": {
      title: "Review requirements missing",
      body: "Add title, destination, purpose, valid dates, one participant and one itinerary row before requesting review.",
    },
    "missing-required-note": {
      title: "Review note required",
      body: "Add a short plain-text reason before requesting changes or cancelling a trip.",
    },
    "note-too-long": {
      title: "Review note is too long",
      body: "Keep approval notes to 500 characters or fewer.",
    },
    tenant: {
      title: "Organisation access required",
      body: "The tenant guard rejected this workflow action for the selected organisation.",
    },
    updated: {
      title: "Workflow updated",
      body: "The trip approval state was updated and recorded in the audit log.",
    },
  };
  const message = messages[result] ?? messages.error;

  return (
    <div className="rounded-md border border-earth-200 bg-white p-4">
      <p className="text-sm font-semibold text-charcoal-950">
        {message.title}
      </p>
      <p className="mt-1 text-sm leading-6 text-charcoal-600">
        {message.body}
      </p>
    </div>
  );
}

function ApprovalNotes({ notes }: { notes: DemoTrip["approvalNotes"] }) {
  if (!notes.length) {
    return (
      <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
        <p className="text-sm font-semibold text-charcoal-950">
          No review notes yet
        </p>
        <p className="mt-1 text-sm leading-6 text-charcoal-600">
          Approval notes will appear here for this organisation-scoped trip.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-charcoal-950">
        Recent review notes
      </h3>
      <div className="mt-3 divide-y divide-earth-100 rounded-md border border-earth-200 bg-white">
        {notes.map((note) => (
          <article className="p-4" key={note.id}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-charcoal-950">
                {note.fromApprovalStatus
                  ? `${note.fromApprovalStatus} to ${note.toApprovalStatus}`
                  : note.toApprovalStatus}
              </p>
              <p className="text-xs text-charcoal-500">
                {note.actorName} / {formatDate(note.createdAt)}
              </p>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-charcoal-700">
              {note.note}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-charcoal-600">{label}</p>
      <p className="mt-2 text-xl font-semibold text-charcoal-950">{value}</p>
    </article>
  );
}

function Panel({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-charcoal-950">
        {icon}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({
  meta,
  status,
  title,
}: {
  meta: string;
  status: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-medium text-charcoal-950">{title}</p>
        <p className="text-sm text-charcoal-600">{meta}</p>
      </div>
      <span className="rounded-md bg-earth-100 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
        {status}
      </span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
