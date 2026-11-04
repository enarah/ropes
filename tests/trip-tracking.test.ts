import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { persistTrip, type StructuredTripRows } from "../lib/trip-save";
import { createTripTrackingDataLayer } from "../lib/tracking/trip-data";
import { authorizeTrackingOrganisation } from "../lib/tracking/access";
import { TenantGuardError, type TenantGuardSession } from "../lib/tenant-guards";
import { OrganisationCapabilityError } from "../lib/organisation-capabilities";
import { normaliseTripTrackingInputs, parseTripTrackingForm, unallocatedTrackingVehicleWarning } from "../lib/tracking/trip-assignment-input";
import { TripsDetail } from "../components/trips/trips-detail";
import { TripRiskAssessmentForm } from "../components/trips/trip-risk-assessment-form";
import { TripForm } from "../components/trips/trip-form";
import { TripTrackingPanel, TripTrackingSummary } from "../components/tracking/trip-tracking-panel";
import { getTripFormDefaults } from "../lib/trips-data";
import {
  syntheticTrackingAssets, syntheticTrackingAssignment, syntheticTrackingIntegrations,
  syntheticTrackingMessages, syntheticTrackingNow, syntheticTrackingOrganisations,
  syntheticTrackingTrips, syntheticTrackingVehicles,
} from "../lib/tracking/fixtures";
import type { TripTrackingInput } from "../lib/tracking/types";
import { createTrackingDataLayer } from "../lib/tracking/data";

const orgA = "synthetic-org-a", orgB = "synthetic-org-b";
const tracker = "synthetic-tracker-track", tripId = "synthetic-trip-a";
const tripData = { title: "Synthetic assignment trip", destination: "Synthetic destination", purpose: "Local test",
  startsAt: new Date("2030-01-01T10:00:00Z"), endsAt: new Date("2030-01-01T14:00:00Z") };
const row = (changes: Partial<TripTrackingInput> = {}): TripTrackingInput => ({ assetId: tracker,
  role: "PRIMARY", vehicleId: null, assignedFrom: null, assignedUntil: null, notes: null, ...changes });
const structuredRows: StructuredTripRows = { participants: [{ name: "Synthetic participant", role: "Lead", status: "Confirmed", rowOrder: 0, userId: null }],
  vehicleAllocations: [], itineraryItems: [{ day: "Day 1", description: "Synthetic itinerary", title: "Travel", rowOrder: 0, startsAt: null, endsAt: null, location: null }] };

test("Trip tracking form parsing, date validation and plain-text notes", () => {
  const form = new FormData();
  assert.equal(parseTripTrackingForm(form), undefined);
  form.set("trackingAssignmentCount", "0");
  assert.deepEqual(parseTripTrackingForm(form), []);
  for (const bad of ["", "-1", "101", "1.5", "NaN"]) {
    form.set("trackingAssignmentCount", bad); assert.throws(() => parseTripTrackingForm(form));
  }
  form.set("trackingAssignmentCount", "1");
  form.set("tracking[0][assetId]", tracker); form.set("tracking[0][role]", "SUPPORT");
  assert.deepEqual(parseTripTrackingForm(form), [row({ role: "SUPPORT" })]);
  const normalise = (rows: TripTrackingInput[]) => normaliseTripTrackingInputs(rows, tripData.startsAt, tripData.endsAt);
  assert.equal(normalise([row({ notes: " <b>Plain</b>\u0000 notes " })])[0].notes, "Plain notes");
  assert.equal(normalise([row({ notes: "a".repeat(500) })])[0].notes?.length, 500);
  assert.throws(() => normalise([row({ notes: "a".repeat(501) })]));
  assert.throws(() => normalise([row(), row()]));
  assert.throws(() => normalise([row({ role: "INVALID" as never })]));
  for (const dates of [
    { assignedFrom: "not-a-date" }, { assignedUntil: "2030-02-30T12:00" },
    { assignedFrom: "2030-01-01T13:00", assignedUntil: "2030-01-01T11:00" },
    { assignedFrom: "2030-01-01T15:00" }, { assignedUntil: "2030-01-01T09:00" },

  ]) assert.throws(() => normalise([row(dates)]));
  assert.equal(normalise([row({ assignedFrom: "2030-01-01T09:00" })])[0].assignedFrom?.toISOString(), "2030-01-01T09:00:00.000Z");
  assert.equal(normalise([row()])[0].assignedFrom, null);
});

test("Trip save and tracking read models on isolated PostgreSQL", async (t) => {
  const database = new PGlite();
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(database) });
  t.after(async () => { await prisma.$disconnect(); await database.close(); });
  const migrations = new URL("../prisma/migrations/", import.meta.url);
  for (const name of readdirSync(migrations).filter((name) => /^\d/.test(name)).sort()) {
    await database.exec(readFileSync(new URL(`${name}/migration.sql`, migrations), "utf8"));
  }
  await prisma.organisation.createMany({ data: syntheticTrackingOrganisations });
  await prisma.organisationCapability.createMany({ data: [orgA, orgB].map((organisationId) => ({
    organisationId, key: "integrations.spotTracker", moduleKey: "integrations",
  })) });
  await prisma.user.create({ data: { id: "synthetic-trip-user", email: "synthetic-trip-user@example.invalid", name: "Synthetic test user" } });
  await prisma.vehicle.createMany({ data: syntheticTrackingVehicles });
  await prisma.trip.createMany({ data: syntheticTrackingTrips });
  await prisma.trackingIntegration.createMany({ data: syntheticTrackingIntegrations });
  await prisma.trackingAsset.createMany({ data: syntheticTrackingAssets });
  await prisma.tripTrackingAssignment.create({ data: syntheticTrackingAssignment });
  const session: TenantGuardSession = { userId: "synthetic-trip-user", memberships: [{ organisationId: orgA, status: "ACTIVE" }] };
  const authorize = (organisationId: string) => authorizeTrackingOrganisation(prisma, organisationId, session);
  const reads = createTripTrackingDataLayer({ prisma, authorize });
  const writes = (trackingInputs: TripTrackingInput[] | undefined, other = {}) => persistTrip({ prisma, organisationId: orgA, session,
    tripId, tripData, structuredRows, trackingInputs, ...other });

  await t.test("option lists and assignment/status reads cannot cross tenants", async () => {
    const options = await reads.getTripTrackingForm(orgA, tripId);
    assert.ok(options.assets.length > 0);
    assert.ok(options.assets.every((asset) => asset.assetId !== "synthetic-tracker-b"));
    assert.deepEqual(options.vehicles.map((vehicle) => vehicle.id), ["synthetic-vehicle-a"]);
    await assert.rejects(reads.getTripTrackingForm(orgB), TenantGuardError);
    await assert.rejects(reads.getTripTrackingAssignments(orgB, "synthetic-trip-b"), TenantGuardError);
    await assert.rejects(reads.getTripTrackingForm(orgA, "synthetic-trip-b"), TenantGuardError);
    await assert.rejects(reads.getTripTrackingAssignments(orgA, "synthetic-trip-b"), TenantGuardError);
  });
  await t.test("new Trip saves tracker in the first atomic save; optional vehicle; date fallback", async () => {
    const saved = await writes([row({ notes: "Synthetic notes" })], { tripId: undefined });
    const [assignment] = await reads.getTripTrackingAssignments(orgA, saved.id, syntheticTrackingNow);
    assert.equal(assignment.assetId, tracker); assert.equal(assignment.vehicle, null);
    assert.equal(assignment.assignedFrom, null); assert.equal(assignment.assignedUntil, null);
    assert.equal(assignment.effectiveFrom, tripData.startsAt.toISOString());
    assert.equal(assignment.effectiveUntil, tripData.endsAt.toISOString());
    assert.equal(assignment.notes, "Synthetic notes");
    assert.equal(assignment.windowOutsideTrip, false);
    await writes([row({ assignedFrom: "2030-01-02T10:00", assignedUntil: "2030-01-02T14:00" })], { tripId: saved.id });
    assert.equal((await reads.getTripTrackingAssignments(orgA, saved.id))[0].windowOutsideTrip, true);
    assert.equal(await prisma.tripParticipant.count({ where: { tripId: saved.id } }), 1);
  });
  await t.test("update retains assignment identity and stable Vehicle when allocation rows are recreated", async () => {
    const before = await prisma.tripTrackingAssignment.findUniqueOrThrow({ where: { tripId_trackingAssetId: { tripId, trackingAssetId: tracker } } });
    await writes([row({ role: "SUPPORT", vehicleId: "synthetic-vehicle-a", notes: "<b>Changed</b>",
      assignedFrom: "2030-01-01T09:00", assignedUntil: "2030-01-01T13:00" })]);
    const after = await prisma.tripTrackingAssignment.findUniqueOrThrow({ where: { id: before.id } });
    assert.equal(after.vehicleId, "synthetic-vehicle-a"); assert.equal(after.role, "SUPPORT"); assert.equal(after.notes, "Changed");
    const [assignment] = await reads.getTripTrackingAssignments(orgA, tripId);
    assert.equal(assignment.vehicleNotAllocated, true);
    await writes([row({ vehicleId: "synthetic-vehicle-a" })], { structuredRows: { ...structuredRows,
      vehicleAllocations: [{ name: "Synthetic vehicle", registration: "SYN-A", status: "Allocated", rowOrder: 0, vehicleId: "synthetic-vehicle-a" }] } });
    const allocation = await prisma.tripVehicleAllocation.findFirstOrThrow({ where: { tripId } });
    await writes([row({ vehicleId: "synthetic-vehicle-a" })], { structuredRows: { ...structuredRows,
      vehicleAllocations: [{ name: "Synthetic vehicle", registration: "SYN-A", status: "Allocated", rowOrder: 0, vehicleId: "synthetic-vehicle-a" }] } });
    assert.equal(await prisma.tripVehicleAllocation.count({ where: { id: allocation.id } }), 0);
    assert.equal((await reads.getTripTrackingAssignments(orgA, tripId))[0].vehicleNotAllocated, false);
    assert.equal((await prisma.tripTrackingAssignment.findUniqueOrThrow({ where: { id: before.id } })).vehicleId, "synthetic-vehicle-a");
  });
  await t.test("multiple assignments persist and one can be removed without recreating the other", async () => {
    const before = await prisma.tripTrackingAssignment.findFirstOrThrow({ where: { tripId, trackingAssetId: tracker } });
    await writes([row(), row({ assetId: "synthetic-tracker-no-fix", role: "PERSON" })]);
    assert.equal((await reads.getTripTrackingAssignments(orgA, tripId)).length, 2);
    assert.equal((await reads.getTripTrackingAssignments(orgA, tripId)).find((assignment) => assignment.assetId === "synthetic-tracker-no-fix")?.role, "PERSON");
    await writes([row()]);
    assert.equal((await reads.getTripTrackingAssignments(orgA, tripId)).length, 1);
    assert.equal(await prisma.tripTrackingAssignment.count({ where: { id: before.id } }), 1);
  });
  await t.test("cross-org assets, vehicles, Trip IDs, sessions and duplicate rows reject without partial save", async () => {
    const before = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
    const assignmentsBefore = await prisma.tripTrackingAssignment.findMany({ where: { tripId } });
    const participantsBefore = await prisma.tripParticipant.findMany({ where: { tripId } });
    for (const input of [[row({ assetId: "synthetic-tracker-b" })], [row({ vehicleId: "synthetic-vehicle-b" })],
      [row(), row()], [row(), row({ assetId: "missing" })], [row({ assignedFrom: "bad" })]]) {
      await assert.rejects(writes(input, { tripData: { ...tripData, title: "Must roll back" } }));
    }
    await assert.rejects(writes([], { tripId: "synthetic-trip-b" }), TenantGuardError);
    await assert.rejects(writes([], { organisationId: orgB }), TenantGuardError);
    assert.deepEqual(await prisma.trip.findUniqueOrThrow({ where: { id: tripId } }), before);
    assert.deepEqual(await prisma.tripTrackingAssignment.findMany({ where: { tripId } }), assignmentsBefore);
    assert.deepEqual(await prisma.tripParticipant.findMany({ where: { tripId } }), participantsBefore);
    const count = await prisma.trip.count();
    await assert.rejects(writes([row({ assetId: "synthetic-tracker-b" })], { tripId: undefined }));
    assert.equal(await prisma.trip.count(), count);
  });
  await t.test("new inactive/retired trackers rejected; existing retired assignment can be retained or removed", async () => {
    await prisma.trackingAsset.update({ where: { id: "synthetic-tracker-stale" }, data: { status: "RETIRED" } });
    await assert.rejects(writes([row({ assetId: "synthetic-tracker-stale" })]), /active trackers/);
    await prisma.trackingAsset.update({ where: { id: "synthetic-tracker-stale" }, data: { status: "INACTIVE" } });
    await assert.rejects(writes([row({ assetId: "synthetic-tracker-stale" })]), /active trackers/);
    await prisma.trackingAsset.update({ where: { id: tracker }, data: { status: "RETIRED" } });
    await writes([row()]);
    assert.equal((await reads.getTripTrackingForm(orgA, tripId)).assets.find((asset) => asset.assetId === tracker)?.status, "RETIRED");
    await writes([]);
    await assert.rejects(writes([row()]), /active trackers/);
    await prisma.trackingAsset.update({ where: { id: tracker }, data: { status: "ACTIVE" } });
    await writes([row()]);
  });
  await t.test("latest event is independent from last fix and client DTOs contain no provider secrets", async () => {
    const data = createTrackingDataLayer({ prisma, authorize });
    for (const fixture of syntheticTrackingMessages.filter((message) => message.assetId === tracker)) {
      await data.storeTrackingMessage(orgA, "synthetic-integration-0", tracker, fixture.message);
    }
    const [assignment] = await reads.getTripTrackingAssignments(orgA, tripId, syntheticTrackingNow);
    assert.equal(assignment.latestMessageKind, "HELP_CANCEL");
    assert.equal(assignment.latestMessageAt, "2030-01-01T11:59:00.000Z");
    assert.equal(assignment.latestPositionAt, "2030-01-01T11:55:00.000Z");
    assert.equal(assignment.freshness, "CURRENT");
    const json = JSON.stringify(await reads.getTripTrackingForm(orgA, tripId));
    for (const forbidden of ["credentialKey", "externalAssetId", "externalMessageId", "trackingIntegrationId", "providerMessageType", "password", "feedId", "providerUrl", "latitude", "longitude", "synthetic-opaque-key"]) {
      assert.equal(json.includes(forbidden), false, forbidden);
    }
    assert.deepEqual(JSON.parse(JSON.stringify(assignment)), assignment);
    const html = renderToStaticMarkup(createElement(TripTrackingPanel, { assignments: [assignment], organisationSlug: "synthetic-org" }));
    assert.match(html, /Assistance request cancelled/);
    assert.doesNotMatch(html, /SOS|emergency dispatch/);
    assert.match(renderToStaticMarkup(createElement(TripTrackingPanel, { assignments: [{ ...assignment, latestMessageKind: "HELP", vehicleNotAllocated: true }], organisationSlug: "synthetic-org" })), /Assistance requested/);
    assert.match(renderToStaticMarkup(createElement(TripTrackingPanel, { assignments: [{ ...assignment, vehicleNotAllocated: true }], organisationSlug: "synthetic-org" })), new RegExp(unallocatedTrackingVehicleWarning));
  });
  await t.test("authoritative removal affects only current Trip/current organisation; omitted set preserves", async () => {
    await prisma.tripTrackingAssignment.create({ data: { organisationId: orgB, tripId: "synthetic-trip-b", trackingAssetId: "synthetic-tracker-b" } });
    const otherTrip = await prisma.trip.findFirstOrThrow({ where: { organisationId: orgA, id: { not: tripId } } });
    const before = await prisma.tripTrackingAssignment.findMany({ where: { tripId: { not: tripId } }, orderBy: { id: "asc" } });
    await writes(undefined);
    assert.equal(await prisma.tripTrackingAssignment.count({ where: { tripId } }), 1);
    await writes([]);
    assert.equal(await prisma.tripTrackingAssignment.count({ where: { tripId } }), 0);
    assert.deepEqual(await prisma.tripTrackingAssignment.findMany({ where: { tripId: { not: tripId } }, orderBy: { id: "asc" } }), before);
    assert.equal(await prisma.tripTrackingAssignment.count({ where: { tripId: otherTrip.id } }), 1);
  });
  await t.test("disabled capability performs no tracking reads and rejects submitted writes atomically", async () => {
    await prisma.organisationCapability.delete({ where: { organisationId_key: { organisationId: orgA, key: "integrations.spotTracker" } } });
    let queriedTracking = false;
    const instrumented = createTripTrackingDataLayer({ prisma: new Proxy(prisma, { get(target, key) {
      if (["trackingAsset", "tripTrackingAssignment", "trackingMessage", "$transaction"].includes(String(key))) queriedTracking = true;
      return Reflect.get(target, key);
    } }), authorize });
    await assert.rejects(instrumented.getTripTrackingForm(orgA), OrganisationCapabilityError);
    await assert.rejects(instrumented.getTripTrackingAssignments(orgA, tripId), OrganisationCapabilityError);
    assert.equal(queriedTracking, false);
    const before = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
    await assert.rejects(writes([row()], { tripData: { ...tripData, title: "Must not save" } }), OrganisationCapabilityError);
    assert.deepEqual(await prisma.trip.findUniqueOrThrow({ where: { id: tripId } }), before);
    await writes(undefined); // Existing Trip workflow remains available without tracking.
  });
});

test("Trip form hides tracking without persistence, and places enabled section between Vehicles and Itinerary", () => {
  const props = { mode: "create" as const, organisationName: "Synthetic org", organisationSlug: "synthetic-org",
    persistenceEnabled: true, organisationId: "synthetic-org", trip: getTripFormDefaults("ropes-demo-aboriginal-corporation") };
  const hidden = renderToStaticMarkup(createElement(TripForm, props));
  assert.doesNotMatch(hidden, /Tracking &amp; Communications|trackingAssignmentCount/);
  const tracking = { assets: [], vehicles: [], assignments: [] };
  assert.doesNotMatch(renderToStaticMarkup(createElement(TripForm, { ...props, persistenceEnabled: false, tracking })), /Tracking &amp; Communications/);
  assert.doesNotMatch(renderToStaticMarkup(createElement(TripForm, { ...props, organisationId: undefined, tracking })), /Tracking &amp; Communications/);
  const html = renderToStaticMarkup(createElement(TripForm, { ...props, tracking }));
  assert.ok(html.indexOf('>Vehicles</h2>') < html.indexOf('>Tracking &amp; Communications</h2>'));
  assert.ok(html.indexOf('>Tracking &amp; Communications</h2>') < html.indexOf('>Itinerary</h2>'));
  assert.match(html, /trackingAssignmentCount/);
  assert.match(renderToStaticMarkup(createElement(TripTrackingSummary, { assignments: [] })), /No structured tracking device assigned/);
  assert.match(renderToStaticMarkup(createElement(TripTrackingSummary, { assignments: [], warnIfUnassigned: true })), /No tracking device has been assigned/);
});

test("TMP/JMP retains legacy field and uses conditional communications label; routes gate tracking loads", () => {
  const riskForm = readFileSync(new URL("../components/trips/trip-risk-assessment-form.tsx", import.meta.url), "utf8");
  assert.match(riskForm, /name="spotGarminDetails"/);
  assert.match(riskForm, /defaultValue=\{assessment\?\.spotGarminDetails\}/);
  assert.match(riskForm, /Other satellite \/ communications notes/);
  const riskAction = readFileSync(new URL("../app/trips/[tripId]/risk-assessment/actions.ts", import.meta.url), "utf8");
  assert.match(riskAction, /spotGarminDetails: getOptionalLimitedString/);
  for (const path of ["new/page.tsx", "[tripId]/edit/page.tsx", "[tripId]/page.tsx", "[tripId]/risk-assessment/page.tsx"]) {
    const source = readFileSync(new URL(`../app/trips/${path}`, import.meta.url), "utf8");
    assert.match(source, /organisationHasCapability\(selectedOrganisation.capabilityKeys, "integrations.spotTracker"\)/);
  }
});

test("Trip detail and TMP/JMP render capability-aware summaries, legacy values and non-blocking high-risk warning", () => {
  const trip = { ...getTripFormDefaults("ropes-demo-aboriginal-corporation"), id: "synthetic-trip", organisationId: orgA,
    startsAt: tripData.startsAt.toISOString(), endsAt: tripData.endsAt.toISOString(),
    title: "Synthetic high-risk trip", riskAssessment: { tripTypeCode: "2A" as const, activityRiskCodes: [],
      baseRiskLevel: "MEDIUM" as const, finalRiskLevel: "HIGH" as const, dailyItinerary: [],
      readyForManagerReview: false, spotGarminDetails: "Retain synthetic satellite notes" } };
  const props = { trip, organisationName: "Synthetic A", organisationSlug: "synthetic-org" };
  const disabled = renderToStaticMarkup(createElement(TripsDetail, { ...props, tracking: [], capabilityKeys: [] }));
  assert.doesNotMatch(disabled, /Tracking &amp; Communications|No tracking device has been assigned/);
  const enabled = renderToStaticMarkup(createElement(TripsDetail, { ...props, tracking: [], capabilityKeys: ["integrations.spotTracker", "trips.riskAssessment"] }));
  assert.match(enabled, /Tracking &amp; Communications/);
  assert.match(enabled, /No tracking device has been assigned to this trip/);
  assert.match(enabled, /Request review/); // Warning does not remove approval controls.
  const riskDisabled = renderToStaticMarkup(createElement(TripRiskAssessmentForm, { ...props, persistenceEnabled: true }));
  assert.match(riskDisabled, /SPOT\/GARMIN/);
  assert.doesNotMatch(riskDisabled, /Other satellite \/ communications notes/);
  const riskEnabled = renderToStaticMarkup(createElement(TripRiskAssessmentForm, { ...props, persistenceEnabled: true, tracking: [] }));
  assert.match(riskEnabled, /Other satellite \/ communications notes/);
  assert.match(riskEnabled, /Retain synthetic satellite notes/);
  assert.match(riskEnabled, /name="spotGarminDetails"/);
  assert.match(riskEnabled, /No tracking device has been assigned/);
});
