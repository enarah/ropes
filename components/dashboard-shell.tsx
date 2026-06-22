"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  DatabaseZap,
  FileText,
  Home,
  MapPinned,
  Menu,
  Settings,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import {
  demoOrganisations,
  getSelectedOrganisation,
  navigationItems,
  type ModuleSlug,
} from "@/lib/dashboard-data";
import type { DashboardAuthContext } from "@/lib/auth-session";
import {
  defaultDemoCapabilityKeys,
  isModuleEnabledForCapabilities,
} from "@/lib/capability-registry";

const navIcons = {
  overview: Home,
  organisations: Building2,
  "ranger-operations": MapPinned,
  trips: ClipboardCheck,
  vehicles: Truck,
  projects: ClipboardList,
  people: Users,
  fulcrum: DatabaseZap,
  reports: FileText,
  compliance: ShieldCheck,
  settings: Settings,
} satisfies Record<ModuleSlug, typeof Home>;

type DashboardShellProps = {
  authContext: DashboardAuthContext;
  children: React.ReactNode;
};

type ShellOrganisation = DashboardAuthContext["availableOrganisations"][number];

export function DashboardShell({
  authContext,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSlug = getActiveSlug(pathname);
  const organisations = authContext.availableOrganisations.length
    ? authContext.availableOrganisations
    : authContext.source === "demo-fallback"
      ? demoOrganisations.map((organisation) => ({
          ...organisation,
          capabilityKeys: [...defaultDemoCapabilityKeys],
        }))
      : [];
  const selectedOrganisation = organisations.length
    ? organisations.find(
        (organisation) => organisation.slug === searchParams.get("org"),
      ) ?? organisations[0]
    : authContext.source === "demo-fallback"
      ? getSelectedOrganisation(searchParams.get("org"))
      : null;
  const selectedOrganisationSlug = selectedOrganisation?.slug ?? "";
  const selectedOrganisationForLinks =
    organisations.find(
      (organisation) => organisation.slug === searchParams.get("org"),
    ) ?? organisations[0] ?? selectedOrganisation;
  const visibleNavigationItems = navigationItems.filter((item) =>
    isModuleEnabledForCapabilities(
      item.slug,
      selectedOrganisationForLinks?.capabilityKeys,
    ),
  );

  function handleOrganisationChange(organisationSlug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("org", organisationSlug);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-sand-100 text-charcoal-900">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-earth-200 bg-charcoal-950 text-sand-50 lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <BrandBlock />
            <OrganisationSwitcher
              authContext={authContext}
              onChange={handleOrganisationChange}
              organisations={organisations}
              selectedOrganisationSlug={selectedOrganisationSlug}
              tone="dark"
            />
            <nav aria-label="Primary" className="flex-1 space-y-1 px-4 py-3">
              {visibleNavigationItems.map((item) => (
                <NavItem
                  active={activeSlug === item.slug}
                  href={withOrganisation(
                    item.href,
                    selectedOrganisationForLinks?.slug,
                  )}
                  key={item.slug}
                  label={item.label}
                  slug={item.slug}
                />
              ))}
            </nav>
            <div className="border-t border-white/10 p-5">
              <p className="text-sm font-semibold text-sand-50">
                {getSessionLabel(authContext)}
              </p>
              <p className="mt-1 text-sm leading-6 text-sand-200">
                {authContext.name}
                {authContext.email ? ` / ${authContext.email}` : ""}
              </p>
              {authContext.isAuthConfigured ? (
                <Link
                  className="mt-3 inline-flex rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-sand-50 hover:bg-white/10"
                  href={
                    authContext.source === "authenticated"
                      ? "/api/auth/signout"
                      : "/api/auth/signin"
                  }
                >
                  {authContext.source === "authenticated"
                    ? "Sign out"
                    : "Sign in"}
                </Link>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-b border-earth-200 bg-sand-100/95 px-4 py-4 backdrop-blur md:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <BrandMark />
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-earth-300 bg-white text-charcoal-900 shadow-sm">
                <Menu aria-hidden="true" size={20} />
              </div>
            </div>
            <OrganisationSwitcher
              authContext={authContext}
              onChange={handleOrganisationChange}
              organisations={organisations}
              selectedOrganisationSlug={selectedOrganisationSlug}
              tone="light"
            />
            <nav
              aria-label="Primary"
              className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1"
            >
              {visibleNavigationItems.map((item) => {
                const Icon = navIcons[item.slug];
                const isActive = activeSlug === item.slug;

                return (
                  <Link
                    className={`flex min-w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                      isActive
                        ? "border-ochre-600 bg-ochre-600 text-white"
                        : "border-earth-200 bg-white text-charcoal-700"
                    }`}
                    href={withOrganisation(
                      item.href,
                      selectedOrganisationForLinks?.slug,
                    )}
                    key={item.slug}
                  >
                    <Icon aria-hidden="true" size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function OrganisationSwitcher({
  authContext,
  onChange,
  organisations,
  selectedOrganisationSlug,
  tone,
}: {
  authContext: DashboardAuthContext;
  onChange: (organisationSlug: string) => void;
  organisations: readonly ShellOrganisation[];
  selectedOrganisationSlug: string;
  tone: "dark" | "light";
}) {
  const isDark = tone === "dark";
  const hasOrganisations = organisations.length > 0;

  return (
    <div
      className={
        isDark
          ? "border-b border-white/10 px-5 py-4"
          : "mt-4 rounded-md border border-earth-200 bg-white p-3"
      }
    >
      <label
        className={`block text-xs font-semibold uppercase ${
          isDark ? "text-sand-200" : "text-charcoal-600"
        }`}
        htmlFor={`organisation-switcher-${tone}`}
      >
        Organisation
      </label>
      <select
        className={`mt-2 w-full rounded-md border px-3 py-2 text-sm font-medium outline-none ${
          isDark
            ? "border-white/10 bg-charcoal-900 text-sand-50"
            : "border-earth-200 bg-sand-50 text-charcoal-900"
        }`}
        disabled={!hasOrganisations}
        id={`organisation-switcher-${tone}`}
        onChange={(event) => onChange(event.target.value)}
        value={selectedOrganisationSlug}
      >
        {hasOrganisations ? null : (
          <option value="">No active organisations</option>
        )}
        {organisations.map((organisation) => (
          <option key={organisation.slug} value={organisation.slug}>
            {organisation.name}
          </option>
        ))}
      </select>
      <p
        className={`mt-2 text-xs leading-5 ${
          isDark ? "text-sand-200" : "text-charcoal-600"
        }`}
      >
        {getOrganisationSwitcherNote(authContext)}
      </p>
    </div>
  );
}

function BrandBlock() {
  return (
    <div className="border-b border-white/10 p-5">
      <BrandMark />
      <p className="mt-4 text-sm leading-6 text-sand-200">
        Ranger Operations Platform for Enarah Services.
      </p>
    </div>
  );
}

function BrandMark() {
  return (
    <Link className="flex items-center gap-3" href="/">
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ochre-600 text-base font-bold text-white shadow-sm">
        R
      </span>
      <span>
        <span className="block text-lg font-semibold leading-5 text-current">
          ROPES
        </span>
        <span className="block text-sm text-current/70">Enarah Services</span>
      </span>
    </Link>
  );
}

function NavItem({
  active,
  href,
  label,
  slug,
}: {
  active: boolean;
  href: string;
  label: string;
  slug: ModuleSlug;
}) {
  const Icon = navIcons[slug];

  return (
    <Link
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-ochre-600 text-white shadow-sm"
          : "text-sand-100 hover:bg-white/10 hover:text-white"
      }`}
      href={href}
    >
      <Icon aria-hidden="true" size={18} />
      <span>{label}</span>
    </Link>
  );
}

function withOrganisation(href: string, organisationSlug?: string) {
  if (!organisationSlug) {
    return href;
  }

  return `${href}?org=${organisationSlug}`;
}

function getActiveSlug(pathname: string): ModuleSlug {
  const slug = pathname === "/" ? "overview" : pathname.split("/")[1];
  const match = navigationItems.find((item) => item.slug === slug);

  return match?.slug ?? "overview";
}

function getSessionLabel(authContext: DashboardAuthContext) {
  if (authContext.source === "authenticated") {
    return "Signed in";
  }

  if (authContext.source === "unauthenticated") {
    return "Authentication required";
  }

  return "Local demo fallback";
}

function getOrganisationSwitcherNote(authContext: DashboardAuthContext) {
  if (authContext.source === "authenticated") {
    return "Only active memberships for the signed-in user are listed.";
  }

  if (authContext.source === "unauthenticated") {
    return "Sign in to load active organisation memberships.";
  }

  return authContext.isAuthConfigured
    ? "Using demo fallback because the app database is not available."
    : "Using local demo memberships until auth providers are configured.";
}
