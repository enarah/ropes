import Link from "next/link";
import { CalendarDays, Pencil, Truck } from "lucide-react";
import type { DemoVehicle, DemoVehicleBooking } from "@/lib/vehicles-data";
import { organisationHref } from "@/lib/vehicles-data";
import { formatDateTime } from "@/components/vehicles/booking-calendar";

type VehicleBookingDetailProps = {
  booking: DemoVehicleBooking;
  organisationName: string;
  organisationSlug: string;
  saved?: string;
  vehicle?: DemoVehicle;
};

export function VehicleBookingDetail({
  booking,
  organisationName,
  organisationSlug,
  saved,
  vehicle,
}: VehicleBookingDetailProps) {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-earth-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-ochre-700">
            Vehicle bookings / {organisationName}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-charcoal-950">
            {booking.tripTitle}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
            Organisation-scoped booking detail for coordinator review. Advanced
            scheduling, approvals and maintenance workflows remain future work.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {vehicle ? (
            <Link
              className="inline-flex w-fit items-center gap-2 rounded-md border border-earth-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-800"
              href={organisationHref(`/vehicles/${vehicle.id}`, organisationSlug)}
            >
              <Truck aria-hidden="true" size={16} />
              Vehicle
            </Link>
          ) : null}
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white"
            href={organisationHref(
              `/vehicles/bookings/${booking.id}/edit`,
              organisationSlug,
            )}
          >
            <Pencil aria-hidden="true" size={16} />
            Edit booking
          </Link>
        </div>
      </section>

      {saved === "booking" ? (
        <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
          <p className="text-sm font-semibold text-charcoal-950">
            Booking saved
          </p>
          <p className="text-sm leading-6 text-charcoal-600">
            The organisation-scoped booking was updated after tenant and overlap
            checks.
          </p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Status" value={booking.status} />
        <SummaryCard
          label="Vehicle"
          value={
            vehicle
              ? `${vehicle.name} / ${vehicle.registration}`
              : "Unknown vehicle"
          }
        />
        <SummaryCard label="Requested by" value={booking.requestedBy} />
        <SummaryCard
          label="Window"
          value={`${formatDateTime(booking.startsAt)} - ${formatDateTime(
            booking.endsAt,
          )}`}
        />
      </section>

      <section className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-charcoal-950">
          <CalendarDays aria-hidden="true" size={18} />
          <h2 className="text-xl font-semibold">Booking notes</h2>
        </div>
        <p className="text-sm leading-6 text-charcoal-700">
          {booking.purpose}
        </p>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-charcoal-600">{label}</p>
      <p className="mt-2 text-lg font-semibold text-charcoal-950">{value}</p>
    </article>
  );
}
