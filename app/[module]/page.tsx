import { notFound } from "next/navigation";
import { DashboardContent } from "@/components/dashboard-content";
import { isModuleSlug, moduleSlugs } from "@/lib/dashboard-data";

type ModulePageProps = {
  params: Promise<{
    module: string;
  }>;
};

export function generateStaticParams() {
  return moduleSlugs
    .filter((moduleSlug) => moduleSlug !== "overview")
    .map((moduleSlug) => ({ module: moduleSlug }));
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { module } = await params;

  if (!isModuleSlug(module)) {
    notFound();
  }

  return <DashboardContent moduleSlug={module} />;
}
