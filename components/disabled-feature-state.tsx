import { LockKeyhole } from "lucide-react";
import { getCapabilityDefinition } from "@/lib/capability-registry";
import type { OrganisationCapabilityKey } from "@/lib/capability-registry";

type DisabledFeatureStateProps = {
  capability: OrganisationCapabilityKey;
  organisationName: string;
};

export function DisabledFeatureState({
  capability,
  organisationName,
}: DisabledFeatureStateProps) {
  const definition = getCapabilityDefinition(capability);

  return (
    <section className="rounded-md border border-earth-200 bg-white p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-earth-100 text-charcoal-800">
        <LockKeyhole aria-hidden="true" size={20} />
      </div>
      <p className="mt-4 text-sm font-semibold text-ochre-700">
        Capability disabled
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-charcoal-950">
        {definition?.label ?? capability} is not enabled
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-charcoal-600">
        {organisationName} has access to ROPES, but this feature is not enabled
        for the selected organisation. Tenant access still controls who can see
        the organisation; capability checks control which modules and workflows
        are available inside it.
      </p>
    </section>
  );
}
