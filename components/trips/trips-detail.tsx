import Link from "next/link";
import {
  CalendarCheck,
  Download,
  MapPinned,
  Pencil,
  Truck,
  Users,
} from "lucide-react";
import type { DemoTrip } from "@/lib/trips-data";
import { organisationHref } from "@/lib/trips-data";

type TripsDetailProps = {
  organisationName: string;
  organisationSlug: string;
  trip: DemoTrip;
};

export function TripsDetail({
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
        <p className="text-sm leading-6 text-charcoal-600">
          This demo trip is marked as <strong>{trip.approvalStatus}</strong>.
          Approval actions are placeholders only until real permissions and
          workflow rules are added.
        </p>
      </Panel>
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
