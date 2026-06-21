import Link from "next/link";
import { CalendarDays } from "lucide-react";
import {
  getVehicleBookingTimingState,
  organisationHref,
  type DemoVehicle,
  type DemoVehicleBooking,
} from "@/lib/vehicles-data";

type BookingCalendarProps = {
  bookings: DemoVehicleBooking[];
  organisationSlug?: string;
  vehicles: DemoVehicle[];
};

export function BookingCalendar({
  bookings,
  organisationSlug,
  vehicles,
}: BookingCalendarProps) {
  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  return (
    <div className="overflow-hidden rounded-md border border-earth-200 bg-white">
      <div className="flex items-center gap-2 border-b border-earth-200 bg-earth-50 px-4 py-3">
        <CalendarDays aria-hidden="true" size={18} />
        <h2 className="text-lg font-semibold text-charcoal-950">
          Booking calendar
        </h2>
      </div>
      <div className="grid divide-y divide-earth-100">
        {sortedBookings.map((booking) => {
          const vehicle = vehicles.find((item) => item.id === booking.vehicleId);
          const timingState = getVehicleBookingTimingState(booking);

          return (
            <article
              className="grid gap-3 p-4 md:grid-cols-[11rem_1fr_auto] md:items-center"
              key={booking.id}
            >
              <div>
                <p className="text-sm font-semibold text-charcoal-950">
                  {formatDate(booking.startsAt)}
                </p>
                <p className="text-xs text-charcoal-600">
                  {formatTime(booking.startsAt)} - {formatTime(booking.endsAt)}
                </p>
              </div>
              <div>
                <p className="font-medium text-charcoal-950">
                  {booking.tripTitle}
                </p>
                <p className="text-sm text-charcoal-600">
                  {vehicle?.name ?? "Unknown demo vehicle"} /{" "}
                  {booking.requestedBy}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="w-fit rounded-md bg-earth-100 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
                  {booking.status}
                </span>
                <span className="w-fit rounded-md bg-ochre-50 px-2.5 py-1 text-xs font-semibold text-ochre-800">
                  {timingState.label}
                </span>
                {organisationSlug ? (
                  <>
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
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeStyle: "short",
  }).format(new Date(value));
}
