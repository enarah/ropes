import assert from "node:assert/strict";
import test from "node:test";
import {
  appbReviewNoteSafetyPolicy,
  validateAppbReviewNoteSafety,
  type AppbReviewNoteUnsafePattern,
} from "../lib/appb-review-note-safety";

const allowedNotes = [
  "Range reviewed against template structure",
  "Header row checked",
  "Confirmed as metadata only",
  "Keep blocked until export writer exists",
  "Repeatable range needs workbook review",
  "Reviewed against annual planning workbook",
  "Manual-only section confirmed",
];

const rejectedNotes: Array<{
  note: string;
  reasonCode: AppbReviewNoteUnsafePattern;
}> = [
  {
    note: "Fake budget total $123.45",
    reasonCode: "currency-or-financial-value",
  },
  {
    note: "Fake phone 0400 111 222",
    reasonCode: "phone-number",
  },
  {
    note: "Fake email reviewer@example.test",
    reasonCode: "email-address",
  },
  {
    note: "Fake token sk-testvaluesecret",
    reasonCode: "secret-or-token",
  },
  {
    note: "Fake private URL https://private.example.test/appb-template",
    reasonCode: "private-url",
  },
  {
    note: "Fake formula =SUM(A1:A3)",
    reasonCode: "workbook-cell-or-formula",
  },
  {
    note: "Fake payroll wording only",
    reasonCode: "medical-personnel-or-wage-term",
  },
  {
    note:
      "This is clearly fake copied narrative text.\nIt spans multiple lines and should not be stored as a mapping review metadata note.",
    reasonCode: "copied-text",
  },
  {
    note: "Fake staff Jane Citizen",
    reasonCode: "likely-person-name",
  },
];

test("APP&B review note safety allows short metadata-only notes", () => {
  for (const note of allowedNotes) {
    const result = validateAppbReviewNoteSafety(note);

    assert.equal(result.isSafe, true, note);
    assert.equal(result.noteLength, note.length, note);
  }
});

test("APP&B review note safety allows blank notes", () => {
  assert.deepEqual(validateAppbReviewNoteSafety(null), {
    isSafe: true,
    noteLength: 0,
  });
  assert.deepEqual(validateAppbReviewNoteSafety(undefined), {
    isSafe: true,
    noteLength: 0,
  });
  assert.deepEqual(validateAppbReviewNoteSafety(""), {
    isSafe: true,
    noteLength: 0,
  });
});

test("APP&B review note safety rejects deterministic unsafe patterns", () => {
  for (const { note, reasonCode } of rejectedNotes) {
    const result = validateAppbReviewNoteSafety(note);

    assert.equal(result.isSafe, false, note);

    if (!result.isSafe) {
      assert.equal(result.reasonCode, reasonCode, note);
      assert.equal(result.noteLength, note.length, note);
    }
  }
});

test("APP&B review note safety rejects overly long notes", () => {
  const note = "metadata ".repeat(40).trim();
  const result = validateAppbReviewNoteSafety(note);

  assert.equal(note.length > appbReviewNoteSafetyPolicy.maxLength, true);
  assert.equal(result.isSafe, false);

  if (!result.isSafe) {
    assert.equal(result.reasonCode, "too-long");
    assert.equal(result.noteLength, note.length);
  }
});
