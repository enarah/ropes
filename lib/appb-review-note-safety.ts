export type AppbReviewNoteUnsafePattern =
  | "too-long"
  | "copied-text"
  | "currency-or-financial-value"
  | "phone-number"
  | "email-address"
  | "secret-or-token"
  | "private-url"
  | "medical-personnel-or-wage-term"
  | "workbook-cell-or-formula"
  | "likely-person-name";

export type AppbReviewNoteValidationResult =
  | {
      isSafe: true;
      noteLength: number;
    }
  | {
      isSafe: false;
      noteLength: number;
      reasonCode: AppbReviewNoteUnsafePattern;
    };

export const appbReviewNoteSafetyPolicy = {
  maxLength: 240,
  safeGuidance:
    "Use short metadata notes only. Do not enter workbook values, financial figures, personal details or report narrative.",
  unsafePatterns: [
    {
      code: "email-address",
      pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    },
    {
      code: "phone-number",
      pattern: /(?:\+?\d[\d\s().-]{7,}\d)/,
    },
    {
      code: "currency-or-financial-value",
      pattern:
        /(?:[$€£]\s?\d|\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b|\b\d+\.\d{2}\s?(?:aud|dollars?)?\b)/i,
    },
    {
      code: "secret-or-token",
      pattern:
        /\b(?:api[_ -]?key|token|secret|password|bearer|client[_ -]?secret)\b|sk-[A-Za-z0-9_-]{10,}|[A-Za-z0-9_-]{32,}/i,
    },
    {
      code: "private-url",
      pattern: /\b(?:https?:\/\/|www\.)\S+/i,
    },
    {
      code: "medical-personnel-or-wage-term",
      pattern:
        /\b(?:medical|allerg(?:y|ies)|diagnosis|medicare|wage|salary|payroll|employee|personnel|human resources|date of birth|dob)\b/i,
    },
    {
      code: "workbook-cell-or-formula",
      pattern: /(?:\b[A-Z]{1,3}\d{1,5}(?::[A-Z]{1,3}\d{1,5})?\b|=[A-Z])/,
    },
    {
      code: "likely-person-name",
      pattern:
        /\b(?:staff|employee|ranger|person|worker|participant)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/,
    },
  ] satisfies Array<{
    code: AppbReviewNoteUnsafePattern;
    pattern: RegExp;
  }>,
};

export function validateAppbReviewNoteSafety(
  note: string | null | undefined,
): AppbReviewNoteValidationResult {
  if (!note) {
    return {
      isSafe: true,
      noteLength: 0,
    };
  }

  if (note.length > appbReviewNoteSafetyPolicy.maxLength) {
    return {
      isSafe: false,
      noteLength: note.length,
      reasonCode: "too-long",
    };
  }

  if (looksLikeCopiedText(note)) {
    return {
      isSafe: false,
      noteLength: note.length,
      reasonCode: "copied-text",
    };
  }

  for (const unsafePattern of appbReviewNoteSafetyPolicy.unsafePatterns) {
    if (unsafePattern.pattern.test(note)) {
      return {
        isSafe: false,
        noteLength: note.length,
        reasonCode: unsafePattern.code,
      };
    }
  }

  return {
    isSafe: true,
    noteLength: note.length,
  };
}

function looksLikeCopiedText(note: string) {
  const sentenceBreaks = note.match(/[.!?]\s+/g)?.length ?? 0;
  const commaBreaks = note.match(/,/g)?.length ?? 0;

  return (
    note.includes("\n") ||
    (note.length > 160 && sentenceBreaks + commaBreaks > 2)
  );
}
