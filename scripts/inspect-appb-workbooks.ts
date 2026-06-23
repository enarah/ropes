import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ExcelJS from "exceljs";
import type { Cell, Worksheet } from "exceljs";

type OutputFormat = "json" | "markdown";

type CliOptions = {
  files: string[];
  format: OutputFormat;
  includeValues: boolean;
  outDir?: string;
};

type WorkbookInspection = {
  inspectedAt: string;
  fileName: string;
  filePath: string;
  sha256: string;
  warnings: string[];
  sheets: SheetInspection[];
  suggestedMappingFollowUps: string[];
};

type SheetInspection = {
  name: string;
  state: string;
  dimensions: {
    actualColumnCount: number;
    actualRowCount: number;
    columnCount: number;
    rowCount: number;
  };
  nonEmptyCellCount: number;
  likelyHeadingCells: LabelCell[];
  formulaCells: FormulaCell[];
  mergedRanges: string[];
  protection: {
    detected: boolean;
    note: string;
  };
  repeatableTableCandidates: RepeatableTableCandidate[];
  manualAreaCandidates: LabelCell[];
  warnings: string[];
};

type LabelCell = {
  address: string;
  text: string;
};

type FormulaCell = {
  address: string;
  formula: string;
};

type RepeatableTableCandidate = {
  headerCells: LabelCell[];
  note: string;
  rowNumber: number;
};

type WorksheetModelWithProtection = Worksheet["model"] & {
  sheetProtection?: unknown;
};

const MAX_LABEL_LENGTH = 80;
const MAX_FORMULA_LENGTH = 160;
const MAX_LABELS_PER_SHEET = 40;
const MAX_FORMULAS_PER_SHEET = 80;
const MAX_MERGES_PER_SHEET = 80;
const MAX_TABLES_PER_SHEET = 20;
const MAX_MANUAL_AREAS_PER_SHEET = 30;

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.files.length === 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const inspections: WorkbookInspection[] = [];

  for (const file of options.files) {
    inspections.push(await inspectWorkbook(file, options.includeValues));
  }

  const output =
    options.format === "json"
      ? `${JSON.stringify(inspections, null, 2)}\n`
      : renderMarkdown(inspections);

  if (options.outDir) {
    await mkdir(options.outDir, { recursive: true });
    const extension = options.format === "json" ? "json" : "md";
    const outputPath = path.join(
      options.outDir,
      `appb-workbook-inspection.${extension}`,
    );
    await writeFile(outputPath, output, "utf8");
    console.log(`Wrote ${outputPath}`);
    return;
  }

  process.stdout.write(output);
}

function parseArgs(args: string[]): CliOptions {
  let format: OutputFormat = "markdown";
  let includeValues = false;
  let outDir: string | undefined;
  const files: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--json") {
      format = "json";
      continue;
    }

    if (arg === "--markdown") {
      format = "markdown";
      continue;
    }

    if (arg === "--include-values") {
      includeValues = true;
      continue;
    }

    if (arg === "--include-values=false") {
      includeValues = false;
      continue;
    }

    if (arg === "--out") {
      const nextArg = args[index + 1];
      if (!nextArg) {
        throw new Error("--out requires a directory path.");
      }
      outDir = nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith("--out=")) {
      outDir = arg.slice("--out=".length);
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    files.push(arg);
  }

  return {
    files,
    format,
    includeValues,
    outDir,
  };
}

async function inspectWorkbook(
  filePath: string,
  includeValues: boolean,
): Promise<WorkbookInspection> {
  const absolutePath = path.resolve(filePath);
  const fileStat = await stat(absolutePath).catch(() => undefined);

  if (!fileStat?.isFile()) {
    throw new Error(`Workbook not found or not a file: ${filePath}`);
  }

  if (!absolutePath.toLowerCase().endsWith(".xlsx")) {
    throw new Error(`Only .xlsx files are supported: ${filePath}`);
  }

  const buffer = await readFile(absolutePath);
  const workbook = new ExcelJS.Workbook();
  const workbookBuffer = Buffer.from(buffer) as unknown as Parameters<
    typeof workbook.xlsx.load
  >[0];
  await workbook.xlsx.load(workbookBuffer);

  const warnings: string[] = [
    "Review this inspection output before committing it; source workbook contents may still be sensitive.",
    "This tool does not generate XLSX files and does not verify export safety.",
  ];

  const sheets = workbook.worksheets.map((worksheet) =>
    inspectWorksheet(worksheet, includeValues),
  );

  return {
    fileName: path.basename(absolutePath),
    filePath: absolutePath,
    inspectedAt: new Date().toISOString(),
    sha256: createHash("sha256").update(buffer).digest("hex"),
    sheets,
    suggestedMappingFollowUps: buildFollowUps(sheets),
    warnings,
  };
}

function inspectWorksheet(
  worksheet: Worksheet,
  includeValues: boolean,
): SheetInspection {
  const likelyHeadingCells: LabelCell[] = [];
  const formulaCells: FormulaCell[] = [];
  const manualAreaCandidates: LabelCell[] = [];
  const rowLabels = new Map<number, LabelCell[]>();
  let nonEmptyCellCount = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const labelsInRow: LabelCell[] = [];

    row.eachCell({ includeEmpty: false }, (cell) => {
      const text = safeCellText(cell, includeValues);
      nonEmptyCellCount += 1;

      const formula = safeFormula(cell);
      if (formula && formulaCells.length < MAX_FORMULAS_PER_SHEET) {
        formulaCells.push({
          address: cell.address,
          formula,
        });
      }

      if (text && (includeValues || isLikelyLabel(text))) {
        const labelCell = {
          address: cell.address,
          text,
        };
        labelsInRow.push(labelCell);

        if (likelyHeadingCells.length < MAX_LABELS_PER_SHEET) {
          likelyHeadingCells.push(labelCell);
        }

        if (
          manualAreaCandidates.length < MAX_MANUAL_AREAS_PER_SHEET &&
          isLikelyManualArea(text)
        ) {
          manualAreaCandidates.push(labelCell);
        }
      }
    });

    if (labelsInRow.length >= 2) {
      rowLabels.set(rowNumber, labelsInRow);
    }
  });

  const mergedRanges = worksheet.model.merges.slice(0, MAX_MERGES_PER_SHEET);
  const worksheetModel = worksheet.model as WorksheetModelWithProtection;
  const hasSheetProtection = Boolean(worksheetModel.sheetProtection);
  const warnings = buildSheetWarnings({
    formulaCellCount: formulaCells.length,
    mergedRangeCount: worksheet.model.merges.length,
    worksheet,
  });

  return {
    dimensions: {
      actualColumnCount: worksheet.actualColumnCount,
      actualRowCount: worksheet.actualRowCount,
      columnCount: worksheet.columnCount,
      rowCount: worksheet.rowCount,
    },
    formulaCells,
    likelyHeadingCells,
    manualAreaCandidates,
    mergedRanges,
    name: worksheet.name,
    nonEmptyCellCount,
    protection: {
      detected: hasSheetProtection,
      note: hasSheetProtection
        ? "Sheet protection metadata detected by ExcelJS."
        : "No sheet protection metadata detected by ExcelJS; cell-level locking may still need manual review.",
    },
    repeatableTableCandidates: findRepeatableTableCandidates(rowLabels),
    state: worksheet.state,
    warnings,
  };
}

function safeCellText(cell: Cell, includeValues: boolean) {
  const rawText = cell.text?.trim();

  if (!rawText) {
    return "";
  }

  if (!includeValues && !isLikelyLabel(rawText)) {
    return "";
  }

  return truncate(normaliseWhitespace(rawText), MAX_LABEL_LENGTH);
}

function safeFormula(cell: Cell) {
  const formula = cell.formula?.trim();

  if (!formula) {
    return "";
  }

  return truncate(formula, MAX_FORMULA_LENGTH);
}

function isLikelyLabel(text: string) {
  const normalised = normaliseWhitespace(text);

  if (normalised.length < 2 || normalised.length > MAX_LABEL_LENGTH) {
    return false;
  }

  if (looksSensitiveOrValueLike(normalised)) {
    return false;
  }

  const letterCount = (normalised.match(/[A-Za-z]/g) ?? []).length;
  const digitCount = (normalised.match(/\d/g) ?? []).length;

  return letterCount >= 2 && digitCount <= letterCount;
}

function isLikelyManualArea(text: string) {
  return /\b(manual|comment|note|narrative|budget|actual|variance|acquittal|explain|description)\b/i.test(
    text,
  );
}

function looksSensitiveOrValueLike(text: string) {
  if (/@/.test(text)) {
    return true;
  }

  if (/\b\d{3,}[-\s]?\d{3,}\b/.test(text)) {
    return true;
  }

  if (/\$[\d,]+/.test(text)) {
    return true;
  }

  if (/^\d+([.,]\d+)?%?$/.test(text)) {
    return true;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(text)) {
    return true;
  }

  return false;
}

function findRepeatableTableCandidates(
  rowLabels: Map<number, LabelCell[]>,
): RepeatableTableCandidate[] {
  const candidates: RepeatableTableCandidate[] = [];

  for (const [rowNumber, labels] of rowLabels) {
    if (candidates.length >= MAX_TABLES_PER_SHEET) {
      break;
    }

    const joined = labels.map((label) => label.text).join(" ");
    const looksLikeTable =
      labels.length >= 3 ||
      /\b(activity|output|milestone|budget|actual|date|status|evidence|progress)\b/i.test(
        joined,
      );

    if (looksLikeTable) {
      candidates.push({
        headerCells: labels.slice(0, 8),
        note:
          "Candidate only; confirm the table range and row identity in the workbook before mapping.",
        rowNumber,
      });
    }
  }

  return candidates;
}

function buildSheetWarnings({
  formulaCellCount,
  mergedRangeCount,
  worksheet,
}: {
  formulaCellCount: number;
  mergedRangeCount: number;
  worksheet: Worksheet;
}) {
  const warnings: string[] = [];

  if (worksheet.state !== "visible") {
    warnings.push(`Sheet is ${worksheet.state}; review before mapping/export.`);
  }

  if (formulaCellCount > 0) {
    warnings.push("Formula cells detected; protect them from future overwrites.");
  }

  if (mergedRangeCount > MAX_MERGES_PER_SHEET) {
    warnings.push(
      `Merged ranges truncated to ${MAX_MERGES_PER_SHEET} in this safe summary.`,
    );
  }

  return warnings;
}

function buildFollowUps(sheets: SheetInspection[]) {
  const followUps = [
    "Confirm sheet names, dimensions and hidden/protected states against the workbook.",
    "Review likely labels and table candidates for sensitive content before committing any inspection output.",
    "Map verified fields into lib/appb-reporting.ts only after workbook inspection is reviewed.",
    "Keep workbook export blocked until formulas, merged ranges and manual finance areas are reviewed.",
  ];

  if (sheets.some((sheet) => sheet.formulaCells.length > 0)) {
    followUps.push("Add formula-protected mappings for detected formula cells.");
  }

  if (sheets.some((sheet) => sheet.mergedRanges.length > 0)) {
    followUps.push("Review merged ranges before selecting write targets.");
  }

  return followUps;
}

function renderMarkdown(inspections: WorkbookInspection[]) {
  return `${inspections.map(renderWorkbookMarkdown).join("\n\n")}\n`;
}

function renderWorkbookMarkdown(inspection: WorkbookInspection) {
  const lines = [
    `# APP&B Workbook Inspection: ${inspection.fileName}`,
    "",
    `- Inspected at: ${inspection.inspectedAt}`,
    `- SHA-256: \`${inspection.sha256}\``,
    `- Source path: \`${inspection.filePath}\``,
    "",
    "## Safety Notes",
    "",
    ...inspection.warnings.map((warning) => `- ${warning}`),
    "",
    "## Sheets",
    "",
  ];

  for (const sheet of inspection.sheets) {
    lines.push(...renderSheetMarkdown(sheet), "");
  }

  lines.push("## Suggested Mapping Follow-ups", "");
  lines.push(...inspection.suggestedMappingFollowUps.map((note) => `- ${note}`));

  return lines.join("\n");
}

function renderSheetMarkdown(sheet: SheetInspection) {
  const lines = [
    `### ${sheet.name}`,
    "",
    `- State: ${sheet.state}`,
    `- Dimensions: ${sheet.dimensions.actualRowCount} rows x ${sheet.dimensions.actualColumnCount} columns (${sheet.nonEmptyCellCount} non-empty cells)`,
    `- Protection: ${sheet.protection.note}`,
    `- Merged ranges: ${sheet.mergedRanges.length}`,
    `- Formula cells listed: ${sheet.formulaCells.length}`,
    "",
  ];

  if (sheet.warnings.length > 0) {
    lines.push("Warnings:", "");
    lines.push(...sheet.warnings.map((warning) => `- ${warning}`), "");
  }

  lines.push("Likely heading/label cells:", "");
  lines.push(...renderLabelList(sheet.likelyHeadingCells));
  lines.push("");

  lines.push("Formula cells:", "");
  lines.push(...renderFormulaList(sheet.formulaCells));
  lines.push("");

  lines.push("Merged ranges:", "");
  lines.push(...renderStringList(sheet.mergedRanges));
  lines.push("");

  lines.push("Repeatable table candidates:", "");
  lines.push(...renderTableCandidates(sheet.repeatableTableCandidates));
  lines.push("");

  lines.push("Manual-only area candidates:", "");
  lines.push(...renderLabelList(sheet.manualAreaCandidates));

  return lines;
}

function renderLabelList(labels: LabelCell[]) {
  if (labels.length === 0) {
    return ["- None detected in the safe summary."];
  }

  return labels.map((label) => `- \`${label.address}\`: ${label.text}`);
}

function renderFormulaList(formulas: FormulaCell[]) {
  if (formulas.length === 0) {
    return ["- None detected."];
  }

  return formulas.map(
    (formula) => `- \`${formula.address}\`: \`${formula.formula}\``,
  );
}

function renderStringList(values: string[]) {
  if (values.length === 0) {
    return ["- None detected."];
  }

  return values.map((value) => `- \`${value}\``);
}

function renderTableCandidates(candidates: RepeatableTableCandidate[]) {
  if (candidates.length === 0) {
    return ["- None detected in the safe summary."];
  }

  return candidates.map((candidate) => {
    const labels = candidate.headerCells
      .map((cell) => `${cell.address}: ${cell.text}`)
      .join("; ");
    return `- Row ${candidate.rowNumber}: ${labels}`;
  });
}

function printUsage() {
  console.error(`Usage:
  npm run appb:inspect -- [--markdown|--json] [--out DIR] [--include-values=false] file.xlsx [...more.xlsx]

Defaults:
  - Markdown output to stdout
  - Short likely labels/headings only
  - No full worksheet dumps
  - No workbook generation`);
}

function normaliseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`APP&B workbook inspection failed: ${message}`);
  process.exitCode = 1;
});
