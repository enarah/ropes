export type TripRiskLevelValue = "LOW" | "MEDIUM" | "HIGH";
export type TripTypeCode = "1A" | "1B" | "2A" | "2B" | "3A" | "3B";
export type ActivityRiskCode = "4A" | "4B" | "4C";

export type TripRiskAssessmentSummary = {
  activityRiskCodes: ActivityRiskCode[];
  baseRiskLevel: TripRiskLevelValue;
  finalRiskLevel: TripRiskLevelValue;
  readyForManagerReview: boolean;
  tripSpecificControls?: string | null;
  tripTypeCode: TripTypeCode;
};

export type TripRiskAssessmentDetails = TripRiskAssessmentSummary & {
  dailyItinerary: TripRiskAssessmentItineraryRow[];
  defibDetails?: string | null;
  dpfDetails?: string | null;
  emergencyContacts?: string | null;
  epirbDetails?: string | null;
  escalationNotes?: string | null;
  firstAidDetails?: string | null;
  leadDrivers?: string | null;
  medicalAllergyNotes?: string | null;
  mobilePhone?: string | null;
  otherEquipment?: string | null;
  partners?: string | null;
  rangers?: string | null;
  relevantContacts?: string | null;
  satellitePhone?: string | null;
  spotGarminDetails?: string | null;
};

export type TripRiskAssessmentItineraryRow = {
  amSchedule: string;
  checkInRequired: boolean;
  date: string;
  day: string;
  pmSchedule: string;
};

export type TripRiskDefinition = {
  associatedRisks: string[];
  code: TripTypeCode | ActivityRiskCode;
  description: string;
  label: string;
  referenceDocuments: string[];
  riskLevel: TripRiskLevelValue;
  standardMitigations: string[];
};

export const tripTypeDefinitions: TripRiskDefinition[] = [
  {
    associatedRisks: ["Road travel", "fatigue", "regional communications"],
    code: "1A",
    description:
      "Travel to or from a regional town, short trip and/or multiple drivers, sealed roads.",
    label: "1A - Regional sealed road travel",
    referenceDocuments: ["Enarah TMP Part A", "Enarah TMP Part C"],
    riskLevel: "LOW",
    standardMitigations: [
      "Confirm trip details and vehicle allocation before departure.",
      "Use normal check-in arrangements and carry mobile phone where coverage exists.",
      "Confirm driver fitness and sealed-road route conditions.",
    ],
  },
  {
    associatedRisks: ["Fatigue", "long sealed-road travel", "driver workload"],
    code: "1B",
    description:
      "Travel to or from a regional town, long trip with one driver, sealed roads.",
    label: "1B - Long sealed road travel",
    referenceDocuments: ["Enarah TMP Part B", "Enarah fatigue controls"],
    riskLevel: "LOW",
    standardMitigations: [
      "Plan rest stops and confirm the single-driver fatigue controls.",
      "Confirm expected arrival and check-in arrangements.",
      "Carry suitable communications for the planned route.",
    ],
  },
  {
    associatedRisks: [
      "Remote travel",
      "unsealed roads",
      "fatigue",
      "limited services",
    ],
    code: "2A",
    description:
      "Travel to or from remote communities, unsealed roads and longer trips.",
    label: "2A - Remote community travel",
    referenceDocuments: ["Enarah TMP Part B", "Enarah TMP Part D"],
    riskLevel: "MEDIUM",
    standardMitigations: [
      "Check road conditions and weather before departure.",
      "Carry remote communications and confirm check-in schedule.",
      "Confirm recovery equipment, first aid and emergency contacts.",
    ],
  },
  {
    associatedRisks: ["Field activity", "ranger participation", "mixed road conditions"],
    code: "2B",
    description:
      "Field trip with Rangers, day trips, sealed or unsealed roads, usually within 100 km of base.",
    label: "2B - Ranger day field trip",
    referenceDocuments: ["Enarah TMP Part B", "Enarah TMP Part C"],
    riskLevel: "MEDIUM",
    standardMitigations: [
      "Confirm ranger participants, lead driver and field equipment.",
      "Record check-in needs for any out-of-coverage travel.",
      "Confirm vehicle suitability for sealed or unsealed roads.",
    ],
  },
  {
    associatedRisks: [
      "Remote camping",
      "variable road conditions",
      "fatigue",
      "communications gaps",
    ],
    code: "3A",
    description:
      "Field trip with Rangers, overnight or multi-day trip, remote or variable road conditions and camping.",
    label: "3A - Remote overnight ranger trip",
    referenceDocuments: ["Enarah TMP Part B", "Enarah TMP Part D", "Emergency contacts"],
    riskLevel: "HIGH",
    standardMitigations: [
      "Complete remote communications, check-in and emergency escalation details.",
      "Confirm vehicle, recovery, medical, camping and first aid equipment.",
      "Review itinerary, known hazards and participant needs before departure.",
    ],
  },
  {
    associatedRisks: [
      "Remote or off-road travel",
      "larger groups",
      "private vehicles",
      "health considerations",
    ],
    code: "3B",
    description:
      "Big or particularly remote field trip with Rangers, often including Elders, tracks/off-road, many people/private vehicles or health issues.",
    label: "3B - Complex remote field trip",
    referenceDocuments: [
      "Enarah TMP Part B",
      "Enarah TMP Part D",
      "Emergency contacts",
      "Relevant activity procedures",
    ],
    riskLevel: "HIGH",
    standardMitigations: [
      "Confirm manager review readiness before travel bookings and departure.",
      "Record participant health considerations only in the TMP/JMP detail view.",
      "Confirm robust communications, check-ins, emergency contacts and field equipment.",
    ],
  },
];

export const activityRiskDefinitions: TripRiskDefinition[] = [
  {
    associatedRisks: ["Aircraft operations", "fire operations", "remote coordination"],
    code: "4A",
    description: "Aerial burning operations.",
    label: "4A - Aerial burning",
    referenceDocuments: ["Aerial burning procedure", "Enarah TMP Part B"],
    riskLevel: "HIGH",
    standardMitigations: [
      "Confirm operation-specific approvals and briefing requirements.",
      "Record aircraft, fire and communications controls for the trip.",
      "Coordinate roles, exclusion areas and emergency response arrangements.",
    ],
  },
  {
    associatedRisks: ["Fire operations", "smoke exposure", "burn control"],
    code: "4B",
    description: "Ground burning operations.",
    label: "4B - Ground burning",
    referenceDocuments: ["Ground burning procedure", "Enarah TMP Part B"],
    riskLevel: "HIGH",
    standardMitigations: [
      "Confirm burn plan, weather, crew roles and communications.",
      "Record fire equipment and emergency response controls.",
      "Brief travellers on smoke, heat and exclusion controls.",
    ],
  },
  {
    associatedRisks: ["Chemical handling", "spray drift", "PPE and storage"],
    code: "4C",
    description: "Weed spraying or other chemical handling operations.",
    label: "4C - Chemical handling",
    referenceDocuments: ["Chemical handling procedure", "SDS/register", "Enarah TMP Part B"],
    riskLevel: "HIGH",
    standardMitigations: [
      "Confirm chemical register, SDS and PPE controls.",
      "Record handling, storage, transport and spill response controls.",
      "Brief workers on weather, exclusion zones and hygiene requirements.",
    ],
  },
];

export const checkInEscalationGuidance = [
  "SPOT/GARMIN check-ins are required whenever travelling out of mobile coverage.",
  "Enter Level 1 response if no check-in occurs by 90 minutes past the due time.",
  "Logistics notifies the staff member's manager or a senior manager.",
  "Manager checks scheduled check-in arrangements, last known contact, travel details, weather and safety concerns.",
  "Manager tries to determine last recorded location from SPOT/GARMIN.",
  "Team attempts alternative contact through mobile, satellite phone or other travellers.",
  "Team contacts relevant communities, neighbours or homestead caretakers.",
  "If no check-in occurs by four hours past due time, enter Level 3 SAR.",
  "Notify police closest to last known location and record actions under incident reporting procedures.",
];

const riskRank: Record<TripRiskLevelValue, number> = {
  HIGH: 3,
  LOW: 1,
  MEDIUM: 2,
};

export function getTripTypeDefinition(code: string) {
  return tripTypeDefinitions.find((definition) => definition.code === code);
}

export function getActivityRiskDefinition(code: string) {
  return activityRiskDefinitions.find((definition) => definition.code === code);
}

export function getActivityRiskDefinitions(codes: string[]) {
  return codes
    .map((code) => getActivityRiskDefinition(code))
    .filter((definition): definition is TripRiskDefinition => Boolean(definition));
}

export function calculateTripRiskLevels(
  tripTypeCode: string,
  activityRiskCodes: string[],
) {
  const tripType = getTripTypeDefinition(tripTypeCode);

  if (!tripType) {
    throw new Error("Trip type is not supported.");
  }

  const activityDefinitions = getActivityRiskDefinitions(activityRiskCodes);

  if (activityDefinitions.length !== activityRiskCodes.length) {
    throw new Error("Activity risk code is not supported.");
  }

  const finalRiskLevel = activityDefinitions.reduce<TripRiskLevelValue>(
    (highest, activity) =>
      riskRank[activity.riskLevel] > riskRank[highest]
        ? activity.riskLevel
        : highest,
    tripType.riskLevel,
  );

  return {
    baseRiskLevel: tripType.riskLevel,
    finalRiskLevel,
  };
}

export function formatRiskLevel(riskLevel: TripRiskLevelValue) {
  return riskLevel.charAt(0) + riskLevel.slice(1).toLowerCase();
}

export function isTripTypeCode(value: string): value is TripTypeCode {
  return tripTypeDefinitions.some((definition) => definition.code === value);
}

export function isActivityRiskCode(value: string): value is ActivityRiskCode {
  return activityRiskDefinitions.some((definition) => definition.code === value);
}
