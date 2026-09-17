export type CanonicalRoleDefinition = {
  description: string;
  name: string;
};

export const canonicalRoleDefinitions = [
  {
    name: "Platform Owner",
    description: "Full control across the whole platform.",
  },
  {
    name: "Enarah Admin",
    description: "Can support Enarah and partner organisation setup.",
  },
  {
    name: "Organisation Admin",
    description: "Can manage one partner organisation.",
  },
  {
    name: "Operations Manager",
    description: "Can manage trips, vehicles, staff allocation and reports.",
  },
  {
    name: "Ranger Coordinator / Head Ranger",
    description: "Can coordinate trips, ranger activity and field records.",
  },
  {
    name: "Field Staff / Ranger",
    description: "Can view assigned trips and submit field updates.",
  },
  {
    name: "Read-only Partner / Funder",
    description: "Can view approved dashboards and reports.",
  },
] as const satisfies readonly CanonicalRoleDefinition[];

export type CanonicalRoleName = (typeof canonicalRoleDefinitions)[number]["name"];

export function getCanonicalRoleDefinition(roleName: string) {
  return canonicalRoleDefinitions.find((role) => role.name === roleName);
}
