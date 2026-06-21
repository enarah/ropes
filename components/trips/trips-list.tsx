import Link from "next/link";
import { Download, Plus, Users, Truck } from "lucide-react";
import {
  getSelectedOrganisation,
  type OrganisationSlug,
} from "@/lib/dashboard-data";
import {
  getTripsForOrganisation,
  getTripsForOrganisationWithPersistence,
  getTripPersistenceState,
  organisationHref,
} from "@/lib/trips-data";

type TripsListProps = {
  selectedOrganisationSlug?: string;
};

export async function TripsList({ selectedOrganisationSlug }: TripsListProps) {
  const organisation = getSelectedOrganisation(selectedOrganisationSlug);
  const [trips, persistence] = await Promise.all([
    getTripsForOrganisationWithPersistence(organisation.slug),
    getTripPersistenceState(organisation.slug),
  ]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-earth-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-ochre-700">
            Trips / {organisation.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-charcoal-950 md:text-4xl">
            Trips
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
            Organisation-scoped trips for journey planning, approvals,
            participants, vehicles and itinerary review.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center gap-2 rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white"
            href={organisationHref("/trips/new", organisation.slug)}
          >
            <Plus aria-hidden="true" size={16} />
            New trip
          </Link>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-earth-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-800"
            type="button"
          >
            <Download aria-hidden="true" size={16} />
            Export
          </button>
        </div>
      </section>

      <section className="rounded-md border border-earth-200 bg-earth-50 p-4">
        <p className="text-sm font-semibold text-charcoal-950">
          Selected organisation context
        </p>
        <p className="text-sm leading-6 text-charcoal-600">
          Showing {trips.length}{" "}
          {persistence.isDatabaseAvailable ? "persisted" : "fake demo"} trip
          {trips.length === 1 ? "" : "s"} for {organisation.name}. No trips
          from another organisation are included.
        </p>
      </section>

      <section className="grid gap-4">
        {trips.map((trip) => (
          <TripListCard
            key={trip.id}
            organisationSlug={organisation.slug}
            trip={trip}
          />
        ))}
      </section>
    </div>
  );
}

function TripListCard({
  organisationSlug,
  trip,
}: {
  organisationSlug: OrganisationSlug;
  trip: ReturnType<typeof getTripsForOrganisation>[number];
}) {
  return (
    <article className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-earth-100 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
              {trip.status}
            </span>
            <span className="rounded-md bg-ochre-50 px-2.5 py-1 text-xs font-semibold text-ochre-800">
              {trip.approvalStatus}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-charcoal-950">
            <Link href={organisationHref(`/trips/${trip.id}`, organisationSlug)}>
              {trip.title}
            </Link>
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-charcoal-600">
            {trip.purpose}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-md border border-earth-300 bg-white px-3 py-2 text-sm font-semibold text-charcoal-800"
            href={organisationHref(`/trips/${trip.id}`, organisationSlug)}
          >
            View
          </Link>
          <Link
            className="rounded-md bg-charcoal-900 px-3 py-2 text-sm font-semibold text-white"
            href={organisationHref(`/trips/${trip.id}/edit`, organisationSlug)}
          >
            Edit
          </Link>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Destination" value={trip.destination} />
        <Fact label="Lead" value={trip.lead} />
        <Fact
          icon={<Users aria-hidden="true" size={15} />}
          label="Participants"
          value={String(trip.participants.length)}
        />
        <Fact
          icon={<Truck aria-hidden="true" size={15} />}
          label="Vehicles"
          value={String(trip.vehicles.length)}
        />
      </dl>
    </article>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-sand-100 p-3">
      <dt className="flex items-center gap-1 text-xs font-semibold uppercase text-charcoal-600">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-charcoal-950">{value}</dd>
    </div>
  );
}
