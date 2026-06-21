import Link from "next/link";
import { ClipboardCheck, Plus, Truck } from "lucide-react";
import {
  getSelectedOrganisation,
  type DashboardOrganisation,
} from "@/lib/dashboard-data";
import {
  getVehicleBookingsForOrganisationWithPersistence,
  getVehiclePersistenceState,
  getVehiclesForOrganisationWithPersistence,
  organisationHref,
  type DemoVehicle,
} from "@/lib/vehicles-data";
import { BookingCalendar } from "@/components/vehicles/booking-calendar";

type VehiclesRegisterProps = {
  organisation?: DashboardOrganisation;
  selectedOrganisationSlug?: string;
};

export async function VehiclesRegister({
  organisation: resolvedOrganisation,
  selectedOrganisationSlug,
}: VehiclesRegisterProps) {
  const organisation =
    resolvedOrganisation ?? getSelectedOrganisation(selectedOrganisationSlug);
  const [vehicles, bookings, persistence] = await Promise.all([
    getVehiclesForOrganisationWithPersistence(organisation.slug),
    getVehicleBookingsForOrganisationWithPersistence(organisation.slug),
    getVehiclePersistenceState(organisation.slug),
  ]);

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
          Showing {vehicles.length}{" "}
          {persistence.isDatabaseAvailable ? "persisted" : "fake demo"} vehicle
          {vehicles.length === 1 ? "" : "s"} and {bookings.length}{" "}
          {persistence.isDatabaseAvailable ? "persisted" : "fake demo"} booking
          {bookings.length === 1 ? "" : "s"} for {organisation.name}. No
          vehicle data from another organisation is included.
        </p>
      </section>

      <section className="grid gap-4">
        {vehicles.map((vehicle) => (
          <VehicleRegisterCard
            key={vehicle.id}
            organisationSlug={organisation.slug}
            vehicle={vehicle}
          />
        ))}
      </section>

      <BookingCalendar bookings={bookings} vehicles={vehicles} />
    </div>
  );
}

function VehicleRegisterCard({
  organisationSlug,
  vehicle,
}: {
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
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Fact
          icon={<Truck aria-hidden="true" size={15} />}
          label="Registration"
          value={vehicle.registration}
        />
        <Fact label="Vehicle" value={`${vehicle.year} ${vehicle.make}`} />
        <Fact label="Base" value={vehicle.homeBase} />
        <Fact
          icon={<ClipboardCheck aria-hidden="true" size={15} />}
          label="Pre-start"
          value={vehicle.preStartStatus}
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
