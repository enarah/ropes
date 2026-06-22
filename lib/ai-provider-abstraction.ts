import { organisationHasCapability } from "@/lib/capability-registry";
import type { OrganisationCapabilityKey } from "@/lib/capability-registry";

export type AiProviderKind = "none" | "local-llm" | "frontier-cloud";

export type AiProviderAvailability = {
  enabled: boolean;
  kind: AiProviderKind;
  reason:
    | "no-provider-configured"
    | "local-provider-capability"
    | "frontier-provider-capability";
};

export type AiProviderRequest = {
  capability: "ai.assistant";
  organisationId: string;
  purpose: string;
  safeContextSummary?: string;
};

export type AiProviderResult = {
  outputSummary: string;
  providerKind: Exclude<AiProviderKind, "none">;
  safeAuditMetadata: {
    contextSummaryLength: number;
    outputSummaryLength: number;
    providerKind: Exclude<AiProviderKind, "none">;
    purpose: string;
  };
};

export interface AiProviderAdapter {
  readonly kind: Exclude<AiProviderKind, "none">;
  complete(request: AiProviderRequest): Promise<AiProviderResult>;
}

export function getAiProviderAvailability(
  capabilityKeys: readonly OrganisationCapabilityKey[] | undefined,
): AiProviderAvailability {
  if (!organisationHasCapability(capabilityKeys, "ai.assistant")) {
    return {
      enabled: false,
      kind: "none",
      reason: "no-provider-configured",
    };
  }

  if (organisationHasCapability(capabilityKeys, "ai.localProvider")) {
    return {
      enabled: true,
      kind: "local-llm",
      reason: "local-provider-capability",
    };
  }

  if (organisationHasCapability(capabilityKeys, "ai.frontierProvider")) {
    return {
      enabled: true,
      kind: "frontier-cloud",
      reason: "frontier-provider-capability",
    };
  }

  return {
    enabled: false,
    kind: "none",
    reason: "no-provider-configured",
  };
}

export function createNoopAiProvider(): null {
  return null;
}
