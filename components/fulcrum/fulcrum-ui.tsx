export type CompactListRow = {
  meta: string;
  status: string;
  title: string;
};

export function Panel({
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

export function CompactList({ rows }: { rows: CompactListRow[] }) {
  return (
    <div className="divide-y divide-earth-100">
      {rows.map((row) => (
        <div
          className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
          key={`${row.title}-${row.meta}`}
        >
          <div>
            <p className="font-medium text-charcoal-950">{row.title}</p>
            <p className="text-sm text-charcoal-600">{row.meta}</p>
          </div>
          <span className="w-fit rounded-md bg-earth-100 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
            {row.status}
          </span>
        </div>
      ))}
    </div>
  );
}

export function FieldList({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <div className="rounded-md bg-sand-100 p-4">
      <p className="text-sm font-semibold text-charcoal-950">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-charcoal-700"
            key={value}
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-charcoal-600">{label}</dt>
      <dd className="text-right font-semibold text-charcoal-950">{value}</dd>
    </div>
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function organisationHref(pathname: string, organisationSlug: string) {
  return `${pathname}?org=${organisationSlug}`;
}
