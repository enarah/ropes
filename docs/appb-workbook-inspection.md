# APP&B Workbook Inspection

ROPES includes a local developer-only inspection script for APP&B XLSX reference workbooks:

```bash
npm run appb:inspect -- --markdown --out docs/appb-inspections /path/to/workbook.xlsx
```

The script lives in `scripts/inspect-appb-workbooks.ts`. It is not imported by the app runtime and does not generate XLSX workbooks.

The script uses `exceljs` as a dev-only dependency because it can read local workbook structure, sheet visibility, merges and formulas without adding XLSX parsing to the production app runtime.

## Inputs

Pass one or more local `.xlsx` file paths:

```bash
npm run appb:inspect -- --json /path/to/appb-annual.xlsx /path/to/appb-mid-year.xlsx
```

Source APP&B workbooks must stay local unless explicitly approved. Do not commit uploaded funder templates or organisation workbooks to the repository.

## Output

By default the tool writes Markdown to stdout. Supported options:

- `--markdown`: write Markdown output.
- `--json`: write JSON output.
- `--out DIR`: write `appb-workbook-inspection.md` or `.json` into a local directory.
- `--include-values=false`: default; include only short likely labels/headings and structural details.
- `--include-values`: allow short non-label cell text in the inspection output. Review carefully before committing.

The safe summary includes:

- workbook filename and SHA-256 checksum
- sheet names and visible/hidden state
- sheet dimensions and non-empty cell counts
- likely heading/label cells, capped and filtered
- formula cell references and capped formulas
- merged ranges
- sheet protection metadata when ExcelJS exposes it
- repeatable table candidates
- manual-only area candidates
- warnings and mapping follow-up notes

The tool does not dump full worksheet contents and does not include formula results.

## Review Rules

Generated inspection reports are not assumed safe for publication. Review them before committing because even short labels can contain sensitive names, financial context or report-specific text.

Prefer committing reviewed structural summaries only. Keep raw workbooks and unreviewed outputs local. The repository ignores common workbook extensions and local inspection output directories.

## Mapping Follow-up

Reviewed inspection output can inform future updates to `lib/appb-reporting.ts`:

- replace `needs-workbook-inspection` references with verified sheet/cell/range mappings
- add `AppbWorkbookRangeMapping` records for exact cell/range targets once reviewed
- keep uncertain target cells as `needs-review` or `unmapped`
- block formula-protected, hidden lookup/reference and unsupported targets
- mark formula-protected fields
- confirm repeatable table anchors and row identity
- identify manual-only fields that ROPES should not populate
- keep export blocked until mappings are reviewed

Merged cells should only be mapped through explicit anchor targets. Repeatable
tables should remain review-required until start/end ranges and expansion rules
are known.

Workbook inspection remains separate from export. The script does not parse files in app runtime, does not store uploaded templates and does not generate workbooks.
