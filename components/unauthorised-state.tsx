import { ShieldAlert } from "lucide-react";

type UnauthorisedStateProps = {
  attemptedOrganisationSlug?: string;
  message: string;
  title: string;
};

export function UnauthorisedState({
  attemptedOrganisationSlug,
  message,
  title,
}: UnauthorisedStateProps) {
  return (
    <section className="rounded-md border border-earth-200 bg-white p-6 shadow-sm">
      <div className="flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ochre-100 text-ochre-800">
          <ShieldAlert aria-hidden="true" size={22} />
        </div>
        <div>
          <p className="text-sm font-semibold text-ochre-700">
            Authenticated organisation access
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-charcoal-950">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-charcoal-700">{message}</p>
          {attemptedOrganisationSlug ? (
            <p className="mt-3 rounded-md bg-earth-50 px-3 py-2 text-sm text-charcoal-600">
              Requested organisation: {attemptedOrganisationSlug}
            </p>
          ) : null}
          <p className="mt-4 text-sm leading-6 text-charcoal-600">
            Local demo fallback is only used when authentication or the database
            is not configured. In authenticated mode ROPES does not show fake
            data in place of denied organisation data.
          </p>
        </div>
      </div>
    </section>
  );
}
