import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  Download,
  ListFilter,
  MapPinned,
  Plus,
  Truck,
  Users,
} from "lucide-react";
import {
  getSelectedOrganisation,
  type DashboardOrganisation,
  type OrganisationSlug,
} from "@/lib/dashboard-data";
import {
  filterTripsForList,
  getLatestTripReviewNotePreview,
  getTripsForOrganisationWithPersistence,
  getTripListFilters,
  getTripPersistenceState,
  getTripTimingState,
  hasActiveTripListFilters,
  hasMinimumTripReviewData,
  organisationHref,
  tripNeedsAction,
  type DemoTrip,
  type TripListFilters,
  type TripListSearchParams,
} from "@/lib/trips-data";

type TripsListProps = {
  organisation?: DashboardOrganisation;
  searchParams?: TripListSearchParams;
  selectedOrganisationSlug?: string;
};

export async function TripsList({
  organisation: resolvedOrganisation,
  searchParams,
  selectedOrganisationSlug,
}: TripsListProps) {
  const organisation =
    resolvedOrganisation ?? getSelectedOrganisation(selectedOrganisationSlug);
  const filters = getTripListFilters(searchParams);
  const [allTrips, persistence] = await Promise.all([
    getTripsForOrganisationWithPersistence(organisation.slug),
    getTripPersistenceState(organisation.slug),
  ]);
  const trips = filterTripsForList(allTrips, filters);
  const activeFilterCount = getActiveFilterCount(filters);

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
          Showing {trips.length}
          {hasActiveTripListFilters(filters) ? ` of ${allTrips.length}` : ""}{" "}
          {persistence.isDatabaseAvailable ? "persisted" : "fake demo"} trip
          {trips.length === 1 ? "" : "s"} for {organisation.name}. No trips
          from another organisation are included.
          {activeFilterCount
            ? ` ${activeFilterCount} list filter${
                activeFilterCount === 1 ? "" : "s"
              } active.`
            : ""}
        </p>
      </section>

      <TripListFiltersBar
        filters={filters}
        organisationSlug={organisation.slug}
      />

      <section className="grid gap-4">
        {trips.length ? (
          trips.map((trip) => (
            <TripListCard
              key={trip.id}
              organisationSlug={organisation.slug}
              trip={trip}
            />
          ))
        ) : (
          <EmptyTripFilterState
            filters={filters}
            organisationSlug={organisation.slug}
          />
        )}
      </section>
    </div>
  );
}

function TripListFiltersBar({
  filters,
  organisationSlug,
}: {
  filters: TripListFilters;
  organisationSlug: OrganisationSlug;
}) {
  return (
    <section className="rounded-md border border-earth-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-charcoal-950">
        <ListFilter aria-hidden="true" size={18} />
        <h2 className="text-lg font-semibold">Trip list filters</h2>
      </div>
      <div className="grid gap-4 xl:grid-cols-4">
        <FilterGroup
          currentValue={filters.action}
          filters={filters}
          label="Focus"
          name="action"
          options={[
            { label: "All", value: "all" },
            { label: "Needs action", value: "needs-action" },
          ]}
          organisationSlug={organisationSlug}
        />
        <FilterGroup
          currentValue={filters.approval}
          filters={filters}
          label="Approval"
          name="approval"
          options={[
            { label: "All", value: "all" },
            { label: "Draft", value: "draft" },
            { label: "Ready", value: "ready-for-review" },
            { label: "Approved", value: "approved" },
            { label: "Changes", value: "changes-requested" },
            { label: "Cancelled", value: "cancelled" },
          ]}
          organisationSlug={organisationSlug}
        />
        <FilterGroup
          currentValue={filters.status}
          filters={filters}
          label="Trip status"
          name="status"
          options={[
            { label: "All", value: "all" },
            { label: "Draft", value: "draft" },
            { label: "Planned", value: "planned" },
            { label: "Active", value: "in-progress" },
            { label: "Done", value: "completed" },
            { label: "Cancelled", value: "cancelled" },
          ]}
          organisationSlug={organisationSlug}
        />
        <FilterGroup
          currentValue={filters.timing}
          filters={filters}
          label="Timing"
          name="timing"
          options={[
            { label: "All", value: "all" },
            { label: "Upcoming", value: "upcoming" },
            { label: "Past", value: "past" },
            { label: "Cancelled", value: "cancelled" },
          ]}
          organisationSlug={organisationSlug}
        />
      </div>
    </section>
  );
}

function FilterGroup({
  currentValue,
  filters,
  label,
  name,
  options,
  organisationSlug,
}: {
  currentValue: string;
  filters: TripListFilters;
  label: string;
  name: keyof TripListFilters;
  options: Array<{ label: string; value: string }>;
  organisationSlug: OrganisationSlug;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-charcoal-600">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = currentValue === option.value;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-md bg-charcoal-900 px-3 py-2 text-sm font-semibold text-white"
                  : "rounded-md border border-earth-300 bg-earth-50 px-3 py-2 text-sm font-semibold text-charcoal-800"
              }
              href={tripFilterHref(organisationSlug, filters, {
                [name]: option.value,
              })}
              key={option.value}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TripListCard({
  organisationSlug,
  trip,
}: {
  organisationSlug: OrganisationSlug;
  trip: DemoTrip;
}) {
  const timingState = getTripTimingState(trip);
  const needsAction = tripNeedsAction(trip);
  const minimumReviewDataReady = hasMinimumTripReviewData(trip);
  const latestReviewNotePreview = getLatestTripReviewNotePreview(trip);

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
            <span className="rounded-md bg-sand-100 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
              {timingState.label}
            </span>
            {needsAction ? (
              <span className="rounded-md bg-charcoal-900 px-2.5 py-1 text-xs font-semibold text-white">
                Needs action
              </span>
            ) : null}
            {!minimumReviewDataReady ? (
              <span className="rounded-md bg-earth-200 px-2.5 py-1 text-xs font-semibold text-charcoal-800">
                Review data missing
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-xl font-semibold text-charcoal-950">
            <Link href={organisationHref(`/trips/${trip.id}`, organisationSlug)}>
              {trip.title}
            </Link>
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-charcoal-600">
            {trip.purpose}
          </p>
          {latestReviewNotePreview ? (
            <p className="mt-3 max-w-3xl rounded-md border border-earth-200 bg-earth-50 p-3 text-sm leading-6 text-charcoal-700">
              <span className="font-semibold text-charcoal-950">
                Latest review note:
              </span>{" "}
              {latestReviewNotePreview}
            </p>
          ) : null}
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

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
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
        <Fact
          icon={<MapPinned aria-hidden="true" size={15} />}
          label="Itinerary"
          value={String(trip.itinerary.length)}
        />
        <Fact
          icon={<CalendarDays aria-hidden="true" size={15} />}
          label="Starts"
          value={formatDate(trip.startsAt)}
        />
      </dl>
    </article>
  );
}

function EmptyTripFilterState({
  filters,
  organisationSlug,
}: {
  filters: TripListFilters;
  organisationSlug: OrganisationSlug;
}) {
  return (
    <section className="rounded-md border border-earth-200 bg-earth-50 p-6">
      <div className="flex items-start gap-3">
        <ClipboardCheck
          aria-hidden="true"
          className="mt-1 text-ochre-700"
          size={20}
        />
        <div>
          <h2 className="text-lg font-semibold text-charcoal-950">
            No trips match these filters
          </h2>
          <p className="mt-2 text-sm leading-6 text-charcoal-600">
            The selected organisation has no trips for this workflow view.
            Clear the filters to return to the default trip list.
          </p>
          <Link
            className="mt-4 inline-flex rounded-md bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white"
            href={tripFilterHref(organisationSlug, filters, {
              action: "all",
              approval: "all",
              status: "all",
              timing: "all",
            })}
          >
            Clear filters
          </Link>
        </div>
      </div>
    </section>
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

function getActiveFilterCount(filters: TripListFilters) {
  return Object.values(filters).filter((value) => value !== "all").length;
}

function tripFilterHref(
  organisationSlug: OrganisationSlug,
  filters: TripListFilters,
  changes: Partial<Record<keyof TripListFilters, string>>,
) {
  const nextFilters = {
    ...filters,
    ...changes,
  };
  const params = new URLSearchParams({ org: organisationSlug });

  for (const [key, value] of Object.entries(nextFilters)) {
    if (value !== "all") {
      params.set(key, value);
    }
  }

  return `/trips?${params.toString()}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
  }).format(new Date(value));
}
