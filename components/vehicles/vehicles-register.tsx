import Link from "next/link";
import {
  ClipboardCheck,
  Gauge,
  ListFilter,
  Plus,
  Truck,
  Wrench,
} from "lucide-react";
import {
  getSelectedOrganisation,
  type DashboardOrganisation,
  type OrganisationSlug,
} from "@/lib/dashboard-data";
import {
  filterVehicleBookingsForRegister,
  filterVehiclesForRegister,
  getVehicleBookingCounts,
  getVehicleBookingsForOrganisationWithPersistence,
  getVehicleBookingSummaryCards,
  getVehiclePersistenceState,
  getVehicleRegisterFilters,
  getVehicleSummaryCards,
  getVehiclesForOrganisationWithPersistence,
  hasActiveVehicleRegisterFilters,
  organisationHref,
  type DemoVehicle,
  type VehicleBookingSummaryCard,
  type VehicleRegisterFilters,
  type VehicleRegisterSearchParams,
  type VehicleSummaryCard,
} from "@/lib/vehicles-data";
import { BookingCalendar } from "@/components/vehicles/booking-calendar";

type VehiclesRegisterProps = {
  organisation?: DashboardOrganisation;
  searchParams?: VehicleRegisterSearchParams;
  selectedOrganisationSlug?: string;
};

export async function VehiclesRegister({
  organisation: resolvedOrganisation,
  searchParams,
  selectedOrganisationSlug,
}: VehiclesRegisterProps) {
  const organisation =
    resolvedOrganisation ?? getSelectedOrganisation(selectedOrganisationSlug);
  const filters = getVehicleRegisterFilters(searchParams);
  const [vehicles, bookings, persistence] = await Promise.all([
    getVehiclesForOrganisationWithPersistence(organisation.slug),
    getVehicleBookingsForOrganisationWithPersistence(organisation.slug),
    getVehiclePersistenceState(organisation.slug),
  ]);
  const filteredVehicles = filterVehiclesForRegister(vehicles, filters);
  const filteredBookings = filterVehicleBookingsForRegister(bookings, filters);
  const summaryCards = getVehicleSummaryCards(vehicles);
  const bookingSummaryCards = getVehicleBookingSummaryCards(bookings);
  const bookingCounts = getVehicleBookingCounts(bookings);
  const activeFilterCount = getActiveFilterCount(filters);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-earth-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-ochre-700">
            Vehicles / {organisation.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-charcoal-950 md:text-4xl">
            Vehicle register
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
            Organisation-scoped fleet records with bookings, basic overlap
            checks and pre-start status placeholders.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white"
            href={organisationHref("/vehicles/new", organisation.slug)}
          >
            <Plus aria-hidden="true" size={16} />
            New vehicle
          </Link>
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-md border border-earth-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-800"
            href={organisationHref("/vehicles/bookings/new", organisation.slug)}
          >
            <Plus aria-hidden="true" size={16} />
            New booking
          </Link>
        </div>
      </section>

      <section className="rounded-md border border-earth-200 bg-earth-50 p-4">
        <p className="text-sm font-semibold text-charcoal-950">
          Selected organisation context
        </p>
        <p className="text-sm leading-6 text-charcoal-600">
          Showing {filteredVehicles.length}
          {hasActiveVehicleRegisterFilters(filters)
            ? ` of ${vehicles.length}`
            : ""}{" "}
          {persistence.isDatabaseAvailable ? "persisted" : "fake demo"} vehicle
          {filteredVehicles.length === 1 ? "" : "s"} and{" "}
          {filteredBookings.length}
          {hasActiveBookingFilters(filters) ? ` of ${bookings.length}` : ""}{" "}
          {persistence.isDatabaseAvailable ? "persisted" : "fake demo"} booking
          {filteredBookings.length === 1 ? "" : "s"} for {organisation.name}. No
          vehicle data from another organisation is included.
          {activeFilterCount
            ? ` ${activeFilterCount} register filter${
                activeFilterCount === 1 ? "" : "s"
              } active.`
            : ""}
        </p>
      </section>

      <VehicleSummaryStrip
        cards={summaryCards}
        organisationSlug={organisation.slug}
      />

      <VehicleRegisterFiltersBar
        filters={filters}
        organisationSlug={organisation.slug}
      />

      <section className="grid gap-4">
        {filteredVehicles.length ? (
          filteredVehicles.map((vehicle) => (
            <VehicleRegisterCard
              bookingCount={bookingCounts[vehicle.id] ?? 0}
              key={vehicle.id}
              organisationSlug={organisation.slug}
              vehicle={vehicle}
            />
          ))
        ) : (
          <EmptyVehicleFilterState
            filters={filters}
            organisationSlug={organisation.slug}
          />
        )}
      </section>

      <VehicleBookingSummaryStrip
        cards={bookingSummaryCards}
        filters={filters}
        organisationSlug={organisation.slug}
      />

      <VehicleBookingFiltersBar
        filters={filters}
        organisationSlug={organisation.slug}
      />

      <BookingCalendar
        bookings={filteredBookings}
        organisationSlug={organisation.slug}
        vehicles={vehicles}
      />
      {!filteredBookings.length ? (
        <EmptyBookingFilterState
          filters={filters}
          organisationSlug={organisation.slug}
        />
      ) : null}
    </div>
  );
}

function VehicleSummaryStrip({
  cards,
  organisationSlug,
}: {
  cards: VehicleSummaryCard[];
  organisationSlug: OrganisationSlug;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <Link
          className="rounded-md border border-earth-200 bg-white p-4 shadow-sm transition hover:border-ochre-500"
          href={vehicleFilterHref(
            organisationSlug,
            getVehicleRegisterFilters(),
            card.filters,
          )}
          key={card.id}
        >
          <p className="text-sm font-semibold text-charcoal-600">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-charcoal-950">
            {card.count}
          </p>
          <p className="mt-1 text-sm leading-6 text-charcoal-600">
            {card.description}
          </p>
        </Link>
      ))}
    </section>
  );
}

function VehicleBookingSummaryStrip({
  cards,
  filters,
  organisationSlug,
}: {
  cards: VehicleBookingSummaryCard[];
  filters: VehicleRegisterFilters;
  organisationSlug: OrganisationSlug;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <Link
          className="rounded-md border border-earth-200 bg-white p-4 shadow-sm transition hover:border-ochre-500"
          href={vehicleFilterHref(organisationSlug, filters, card.filters)}
          key={card.id}
        >
          <p className="text-sm font-semibold text-charcoal-600">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-charcoal-950">
            {card.count}
          </p>
          <p className="mt-1 text-sm leading-6 text-charcoal-600">
            {card.description}
          </p>
        </Link>
      ))}
    </section>
  );
}

function VehicleRegisterFiltersBar({
  filters,
  organisationSlug,
}: {
  filters: VehicleRegisterFilters;
  organisationSlug: OrganisationSlug;
}) {
  return (
    <section className="rounded-md border border-earth-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-charcoal-950">
        <ListFilter aria-hidden="true" size={18} />
        <h2 className="text-lg font-semibold">Vehicle register filters</h2>
      </div>
      <FilterGroup
        currentValue={filters.status}
        filters={filters}
        label="Fleet status"
        name="status"
        options={[
          { label: "All", value: "all" },
          { label: "Available", value: "available" },
          { label: "Booked", value: "booked" },
          { label: "Maintenance", value: "maintenance" },
          { label: "Retired", value: "retired" },
        ]}
        organisationSlug={organisationSlug}
      />
    </section>
  );
}

function VehicleBookingFiltersBar({
  filters,
  organisationSlug,
}: {
  filters: VehicleRegisterFilters;
  organisationSlug: OrganisationSlug;
}) {
  return (
    <section className="rounded-md border border-earth-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-charcoal-950">
        <ListFilter aria-hidden="true" size={18} />
        <h2 className="text-lg font-semibold">Booking visibility filters</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <FilterGroup
          currentValue={filters.bookingStatus}
          filters={filters}
          label="Booking status"
          name="bookingStatus"
          options={[
            { label: "All", value: "all" },
            { label: "Requested", value: "requested" },
            { label: "Approved", value: "approved" },
            { label: "Active", value: "active" },
            { label: "Completed", value: "completed" },
            { label: "Cancelled", value: "cancelled" },
          ]}
          organisationSlug={organisationSlug}
        />
        <FilterGroup
          currentValue={filters.bookingTiming}
          filters={filters}
          label="Timing"
          name="bookingTiming"
          options={[
            { label: "All", value: "all" },
            { label: "Upcoming", value: "upcoming" },
            { label: "Active now", value: "current" },
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
  filters: VehicleRegisterFilters;
  label: string;
  name: keyof VehicleRegisterFilters;
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
              href={vehicleFilterHref(organisationSlug, filters, {
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

function VehicleRegisterCard({
  bookingCount,
  organisationSlug,
  vehicle,
}: {
  bookingCount: number;
  organisationSlug: string;
  vehicle: DemoVehicle;
}) {
  return (
    <article className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-earth-100 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
              {vehicle.status}
            </span>
            <span className="rounded-md bg-ochre-50 px-2.5 py-1 text-xs font-semibold text-ochre-800">
              Pre-start: {vehicle.preStartStatus}
            </span>
            {vehicle.openDefectCount ? (
              <span className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
                Defects: {vehicle.openDefectCount} open
              </span>
            ) : (
              <span className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
                Defects: none open
              </span>
            )}
          </div>
          <h2 className="mt-3 text-xl font-semibold text-charcoal-950">
            <Link
              href={organisationHref(`/vehicles/${vehicle.id}`, organisationSlug)}
            >
              {vehicle.name}
            </Link>
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-charcoal-600">
            {vehicle.notes}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-md border border-earth-300 bg-white px-3 py-2 text-sm font-semibold text-charcoal-800"
            href={organisationHref(`/vehicles/${vehicle.id}`, organisationSlug)}
          >
            View
          </Link>
          <Link
            className="rounded-md border border-earth-300 bg-white px-3 py-2 text-sm font-semibold text-charcoal-800"
            href={organisationHref(
              `/vehicles/${vehicle.id}/edit`,
              organisationSlug,
            )}
          >
            Edit
          </Link>
          <Link
            className="rounded-md bg-charcoal-900 px-3 py-2 text-sm font-semibold text-white"
            href={`${organisationHref("/vehicles/bookings/new", organisationSlug)}&vehicle=${vehicle.id}`}
          >
            Book
          </Link>
          <Link
            className="rounded-md border border-earth-300 bg-earth-50 px-3 py-2 text-sm font-semibold text-charcoal-800"
            href={organisationHref(
              `/vehicles/${vehicle.id}/pre-start`,
              organisationSlug,
            )}
          >
            Pre-start
          </Link>
          <Link
            className="rounded-md border border-earth-300 bg-earth-50 px-3 py-2 text-sm font-semibold text-charcoal-800"
            href={organisationHref(
              `/vehicles/${vehicle.id}/defects`,
              organisationSlug,
            )}
          >
            Report defect
          </Link>
          <Link
            className="rounded-md border border-earth-300 bg-earth-50 px-3 py-2 text-sm font-semibold text-charcoal-800"
            href={organisationHref(
              `/vehicles/${vehicle.id}/maintenance`,
              organisationSlug,
            )}
          >
            Maintenance
          </Link>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-7">
        <Fact
          icon={<Truck aria-hidden="true" size={15} />}
          label="Registration"
          value={vehicle.registration}
        />
        <Fact label="Vehicle" value={formatVehicleDescription(vehicle)} />
        <Fact
          icon={<Gauge aria-hidden="true" size={15} />}
          label="Odometer"
          value={formatOdometer(vehicle.odometerKm)}
        />
        <Fact label="Bookings" value={String(bookingCount)} />
        <Fact
          icon={<ClipboardCheck aria-hidden="true" size={15} />}
          label="Pre-start"
          value={vehicle.preStartStatus}
        />
        <Fact
          icon={<Wrench aria-hidden="true" size={15} />}
          label="Defects"
          value={formatDefectSummary(vehicle)}
        />
        <Fact
          icon={<Wrench aria-hidden="true" size={15} />}
          label="Maintenance"
          value={formatMaintenanceSummary(vehicle)}
        />
      </dl>
    </article>
  );
}

function EmptyVehicleFilterState({
  filters,
  organisationSlug,
}: {
  filters: VehicleRegisterFilters;
  organisationSlug: OrganisationSlug;
}) {
  return (
    <section className="rounded-md border border-earth-200 bg-earth-50 p-6">
      <div className="flex items-start gap-3">
        <Truck aria-hidden="true" className="mt-1 text-ochre-700" size={20} />
        <div>
          <h2 className="text-lg font-semibold text-charcoal-950">
            No vehicles match this filter
          </h2>
          <p className="mt-2 text-sm leading-6 text-charcoal-600">
            The selected organisation has no vehicles in this fleet status.
            Clear the filter to return to the full register.
          </p>
          <Link
            className="mt-4 inline-flex rounded-md bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white"
            href={vehicleFilterHref(organisationSlug, filters, {
              status: "all",
            })}
          >
            Clear filter
          </Link>
        </div>
      </div>
    </section>
  );
}

function EmptyBookingFilterState({
  filters,
  organisationSlug,
}: {
  filters: VehicleRegisterFilters;
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
            No bookings match these filters
          </h2>
          <p className="mt-2 text-sm leading-6 text-charcoal-600">
            The selected organisation has no bookings for this status and timing
            view. Clear the booking filters to return to all bookings.
          </p>
          <Link
            className="mt-4 inline-flex rounded-md bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white"
            href={vehicleFilterHref(organisationSlug, filters, {
              bookingStatus: "all",
              bookingTiming: "all",
            })}
          >
            Clear booking filters
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

function vehicleFilterHref(
  organisationSlug: OrganisationSlug,
  filters: VehicleRegisterFilters,
  changes: Partial<Record<keyof VehicleRegisterFilters, string>>,
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

  return `/vehicles?${params.toString()}`;
}

function formatVehicleDescription(vehicle: DemoVehicle) {
  return [vehicle.year || "Year not set", vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ");
}

function formatOdometer(odometerKm: number) {
  return `${new Intl.NumberFormat("en-AU").format(odometerKm)} km`;
}

function formatDefectSummary(vehicle: DemoVehicle) {
  if (!vehicle.openDefectCount) {
    return "None open";
  }

  const latest = [
    vehicle.latestDefectStatus,
    vehicle.latestDefectSeverity,
    vehicle.latestDefectCategory,
  ]
    .filter(Boolean)
    .join(" / ");

  return latest ? `${vehicle.openDefectCount} open - ${latest}` : "Open";
}

function formatMaintenanceSummary(vehicle: DemoVehicle) {
  if (!vehicle.maintenanceRecordCount || !vehicle.latestMaintenanceDate) {
    return "Not recorded";
  }

  return [
    vehicle.latestMaintenanceType,
    vehicle.latestMaintenanceStatus,
    formatDate(vehicle.latestMaintenanceDate),
  ]
    .filter(Boolean)
    .join(" / ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getActiveFilterCount(filters: VehicleRegisterFilters) {
  return Object.values(filters).filter((value) => value !== "all").length;
}

function hasActiveBookingFilters(filters: VehicleRegisterFilters) {
  return filters.bookingStatus !== "all" || filters.bookingTiming !== "all";
}
