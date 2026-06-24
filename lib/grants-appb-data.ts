import { canReadOrganisation } from "@/lib/auth-session";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";

export type GrantsAppbOverview = {
  grants: GrantOverview[];
  isDatabaseAvailable: boolean;
  isDatabaseConfigured: boolean;
};

export type GrantOverview = {
  appbReportCount: number;
  funder: string;
  fundingAgreementNumber?: string;
  fundingPeriod: string;
  id: string;
  programType: string;
  project?: string;
  rangerProgram?: string;
  reportingPeriods: GrantReportingPeriodOverview[];
  status: string;
  title: string;
};

export type GrantReportingPeriodOverview = {
  appbReports: AppbReportOverview[];
  cycle: string;
  dateRange: string;
  dueOn?: string;
  id: string;
  label: string;
  status: string;
};

export type AppbReportOverview = {
  id: string;
  manualFields: AppbManualFieldOverview[];
  missingDataSummary?: string;
  status: string;
  templateProfileId: string;
  templateVersionLabel: string;
};

export type AppbManualFieldOverview = {
  fieldGroup: string;
  fieldId: string;
  fieldLabel: string;
  fieldType: string;
  notes?: string;
  sensitivity: string;
  status: string;
  valueDate?: string;
  valueNumber?: string;
  valueText?: string;
};

export async function getGrantsAppbOverview(
  organisationSlug: string,
): Promise<GrantsAppbOverview> {
  if (!isDatabaseConfigured()) {
    return {
      grants: [],
      isDatabaseAvailable: false,
      isDatabaseConfigured: false,
    };
  }

  try {
    const prisma = getPrismaClient();
    const organisation = await prisma.organisation.findUnique({
      select: {
        id: true,
      },
      where: {
        slug: organisationSlug,
      },
    });

    const hasAccess = organisation
      ? await canReadOrganisation(prisma, organisation.id)
      : false;

    if (!organisation || !hasAccess) {
      return {
        grants: [],
        isDatabaseAvailable: false,
        isDatabaseConfigured: true,
      };
    }

    const grants = await prisma.grant.findMany({
      include: {
        appbReports: {
          select: {
            id: true,
          },
          where: {
            organisationId: organisation.id,
          },
        },
        project: {
          select: {
            code: true,
            name: true,
          },
        },
        rangerProgram: {
          select: {
            name: true,
          },
        },
        reportingPeriods: {
          include: {
            appbReports: {
              orderBy: {
                createdAt: "desc",
              },
              select: {
                id: true,
                manualFieldValues: {
                  orderBy: {
                    updatedAt: "desc",
                  },
                  select: {
                    fieldGroup: true,
                    fieldId: true,
                    fieldLabel: true,
                    fieldType: true,
                    notes: true,
                    sensitivity: true,
                    status: true,
                    valueDate: true,
                    valueNumber: true,
                    valueText: true,
                  },
                  where: {
                    organisationId: organisation.id,
                  },
                },
                missingDataSummary: true,
                status: true,
                templateProfileId: true,
                templateVersionLabel: true,
              },
              where: {
                organisationId: organisation.id,
              },
            },
          },
          orderBy: {
            startsOn: "asc",
          },
          where: {
            organisationId: organisation.id,
          },
        },
      },
      orderBy: [
        {
          fundingPeriodStart: "desc",
        },
        {
          title: "asc",
        },
      ],
      where: {
        organisationId: organisation.id,
      },
    });

    return {
      grants: grants.map((grant) => ({
        appbReportCount: grant.appbReports.length,
        funder: formatEnumLabel(grant.funder),
        fundingAgreementNumber: grant.fundingAgreementNumber ?? undefined,
        fundingPeriod: formatDateRange(
          grant.fundingPeriodStart,
          grant.fundingPeriodEnd,
        ),
        id: grant.id,
        programType: formatEnumLabel(grant.programType),
        project: grant.project
          ? `${grant.project.name} (${grant.project.code})`
          : undefined,
        rangerProgram: grant.rangerProgram?.name,
        reportingPeriods: grant.reportingPeriods.map((period) => ({
          appbReports: period.appbReports.map((report) => ({
            id: report.id,
            manualFields: report.manualFieldValues.map((field) => ({
              fieldGroup: field.fieldGroup,
              fieldId: field.fieldId,
              fieldLabel: field.fieldLabel,
              fieldType: formatEnumLabel(field.fieldType),
              notes: field.notes ?? undefined,
              sensitivity: formatEnumLabel(field.sensitivity),
              status: formatEnumLabel(field.status),
              valueDate: field.valueDate
                ? formatDateInputValue(field.valueDate)
                : undefined,
              valueNumber: field.valueNumber?.toString(),
              valueText: field.valueText ?? undefined,
            })),
            missingDataSummary: report.missingDataSummary ?? undefined,
            status: formatEnumLabel(report.status),
            templateProfileId: report.templateProfileId,
            templateVersionLabel: report.templateVersionLabel,
          })),
          cycle: formatEnumLabel(period.cycle),
          dateRange: formatDateRange(period.startsOn, period.endsOn),
          dueOn: period.dueOn ? formatShortDate(period.dueOn) : undefined,
          id: period.id,
          label: period.label,
          status: formatEnumLabel(period.status),
        })),
        status: formatEnumLabel(grant.status),
        title: grant.title,
      })),
      isDatabaseAvailable: true,
      isDatabaseConfigured: true,
    };
  } catch {
    return {
      grants: [],
      isDatabaseAvailable: false,
      isDatabaseConfigured: true,
    };
  }
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateRange(start: Date, end: Date) {
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}
