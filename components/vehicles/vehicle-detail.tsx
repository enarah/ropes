import Link from "next/link";
import {
  CalendarPlus,
  ClipboardCheck,
  Gauge,
  Pencil,
  Wrench,
} from "lucide-react";
import type { DemoVehicle, DemoVehicleBooking } from "@/lib/vehicles-data";
import { organisationHref } from "@/lib/vehicles-data";
import {
  BookingCalendar,
  formatDateTime,
} from "@/components/vehicles/booking-calendar";

type VehicleDetailProps = {
  bookings: DemoVehicleBooking[];
  organisationName: string;
  organisationSlug: string;
  saved?: string;
  vehicle: DemoVehicle;
};

export function VehicleDetail({
  bookings,
  organisationName,
  organisationSlug,
  saved,
  vehicle,
}: VehicleDetailProps) {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-earth-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-ochre-700">
            Vehicles / {organisationName}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-charcoal-950">
            {vehicle.name}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
            {vehicle.notes}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-md border border-earth-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-800"
            href={organisationHref(
              `/vehicles/${vehicle.id}/edit`,
              organisationSlug,
            )}
          >
            <Pencil aria-hidden="true" size={16} />
            Edit
          </Link>
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white"
            href={`${organisationHref("/vehicles/bookings/new", organisationSlug)}&vehicle=${vehicle.id}`}
          >
            <CalendarPlus aria-hidden="true" size={16} />
            New booking
          </Link>
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-md border border-earth-300 bg-earth-50 px-4 py-2 text-sm font-semibold text-charcoal-800"
            href={organisationHref(
              `/vehicles/${vehicle.id}/pre-start`,
              organisationSlug,
            )}
          >
            <ClipboardCheck aria-hidden="true" size={16} />
            Pre-start
          </Link>
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-md border border-earth-300 bg-earth-50 px-4 py-2 text-sm font-semibold text-charcoal-800"
            href={organisationHref(
              `/vehicles/${vehicle.id}/defects`,
              organisationSlug,
            )}
          >
            <Wrench aria-hidden="true" size={16} />
            Report defect
          </Link>
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-md border border-earth-300 bg-earth-50 px-4 py-2 text-sm font-semibold text-charcoal-800"
            href={organisationHref(
              `/vehicles/${vehicle.id}/maintenance`,
              organisationSlug,
            )}
          >
            <Wrench aria-hidden="true" size={16} />
            Maintenance
          </Link>
        </div>
      </section>

      {saved === "vehicle" ? (
        <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
          <p className="text-sm font-semibold text-charcoal-950">
            Vehicle saved
          </p>
          <p className="text-sm leading-6 text-charcoal-600">
            The organisation-scoped vehicle record was saved. Existing bookings
            were not changed.
          </p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Status" value={vehicle.status} />
        <SummaryCard label="Registration" value={vehicle.registration} />
        <SummaryCard
          label="Odometer"
          value={`${vehicle.odometerKm.toLocaleString("en-AU")} km`}
        />
        <SummaryCard
          label="Open defects"
          value={String(vehicle.openDefectCount ?? 0)}
        />
        <SummaryCard
          label="Maintenance"
          value={
            vehicle.latestMaintenanceDate
              ? formatDate(vehicle.latestMaintenanceDate)
              : "Not recorded"
          }
        />
        <SummaryCard label="Base" value={vehicle.homeBase} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel icon={<Gauge aria-hidden="true" size={18} />} title="Vehicle">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Fact label="Make" value={vehicle.make} />
            <Fact label="Model" value={vehicle.model} />
            <Fact label="Year" value={String(vehicle.year)} />
            <Fact label="Equipment" value={vehicle.equipmentStatus} />
          </dl>
        </Panel>

        <Panel
          icon={<ClipboardCheck aria-hidden="true" size={18} />}
          title="Pre-start status"
        >
          <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
            <p className="text-lg font-semibold text-charcoal-950">
              {vehicle.preStartStatus}
            </p>
            <p className="mt-2 text-sm leading-6 text-charcoal-600">
              Latest persisted checklist status when a local database is
              configured. Maintenance records, sign-off workflow and booking
              changes remain future work.
            </p>
            <Link
              className="mt-4 inline-flex rounded-md bg-charcoal-900 px-3 py-2 text-sm font-semibold text-white"
              href={organisationHref(
                `/vehicles/${vehicle.id}/pre-start`,
                organisationSlug,
              )}
            >
              Open checklist
            </Link>
          </div>
        </Panel>
      </section>

      <Panel icon={<Wrench aria-hidden="true" size={18} />} title="Defects">
        <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-charcoal-950">
                {vehicle.openDefectCount
                  ? `${vehicle.openDefectCount} open`
                  : "None open"}
              </p>
              <p className="mt-2 text-sm leading-6 text-charcoal-600">
                {formatDefectDetailSummary(vehicle)}
              </p>
            </div>
            <Link
              className="inline-flex w-fit rounded-md bg-charcoal-900 px-3 py-2 text-sm font-semibold text-white"
              href={organisationHref(
                `/vehicles/${vehicle.id}/defects`,
                organisationSlug,
              )}
            >
              Report defect
            </Link>
          </div>
        </div>
      </Panel>

      <Panel
        icon={<Wrench aria-hidden="true" size={18} />}
        title="Maintenance"
      >
        <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-charcoal-950">
                {vehicle.latestMaintenanceDate
                  ? formatMaintenanceDetailSummary(vehicle)
                  : "Not recorded"}
              </p>
              <p className="mt-2 text-sm leading-6 text-charcoal-600">
                Recent maintenance visibility only. Work orders, scheduling and
                booking blocks remain outside this foundation.
              </p>
            </div>
            <Link
              className="inline-flex w-fit rounded-md bg-charcoal-900 px-3 py-2 text-sm font-semibold text-white"
              href={organisationHref(
                `/vehicles/${vehicle.id}/maintenance`,
                organisationSlug,
              )}
            >
              Add record
            </Link>
          </div>
        </div>
      </Panel>

      <Panel icon={<Wrench aria-hidden="true" size={18} />} title="Bookings">
        {bookings.length ? (
          <div className="divide-y divide-earth-100">
            {bookings.map((booking) => (
              <div
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
                key={booking.id}
              >
                <div>
                  <p className="font-medium text-charcoal-950">
                    {booking.tripTitle}
                  </p>
                  <p className="text-sm text-charcoal-600">
                    {formatDateTime(booking.startsAt)} -{" "}
                    {formatDateTime(booking.endsAt)}
                  </p>
                  <p className="mt-1 text-sm text-charcoal-600">
                    {booking.purpose}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="w-fit rounded-md bg-earth-100 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
                    {booking.status}
                  </span>
                  <Link
                    className="w-fit rounded-md border border-earth-300 bg-white px-2.5 py-1 text-xs font-semibold text-charcoal-700"
                    href={organisationHref(
                      `/vehicles/bookings/${booking.id}`,
                      organisationSlug,
                    )}
                  >
                    View
                  </Link>
                  <Link
                    className="w-fit rounded-md bg-charcoal-900 px-2.5 py-1 text-xs font-semibold text-white"
                    href={organisationHref(
                      `/vehicles/bookings/${booking.id}/edit`,
                      organisationSlug,
                    )}
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-charcoal-600">
            No fake bookings exist for this vehicle in the selected
            organisation.
          </p>
        )}
      </Panel>

      <BookingCalendar
        bookings={bookings}
        organisationSlug={organisationSlug}
        vehicles={[vehicle]}
      />
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-sand-100 p-3">
      <dt className="text-xs font-semibold uppercase text-charcoal-600">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-charcoal-950">{value}</dd>
    </div>
  );
}

function formatDefectDetailSummary(vehicle: DemoVehicle) {
  if (!vehicle.openDefectCount) {
    return "No open defect reports are visible for this vehicle in the selected organisation.";
  }

  const latest = [
    vehicle.latestDefectStatus,
    vehicle.latestDefectSeverity,
    vehicle.latestDefectCategory,
    vehicle.latestDefectReportedAt
      ? formatDateTime(vehicle.latestDefectReportedAt)
      : undefined,
  ]
    .filter(Boolean)
    .join(" / ");

  return latest
    ? `Latest open defect: ${latest}.`
    : "Open defect metadata is visible for this vehicle.";
}

function formatMaintenanceDetailSummary(vehicle: DemoVehicle) {
  return [
    vehicle.latestMaintenanceType,
    vehicle.latestMaintenanceStatus,
    vehicle.latestMaintenanceDate
      ? formatDate(vehicle.latestMaintenanceDate)
      : undefined,
  ]
    .filter(Boolean)
    .join(" / ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
  }).format(new Date(value));
}
