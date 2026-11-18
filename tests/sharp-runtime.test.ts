import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

test("patched sharp loads its native runtime and decodes/resizes a synthetic SVG into PNG", async () => {
  // Trusted in-memory input only; no file, URL or attacker-supplied SVG.
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#22aa44"/></svg>');
  const { data, info } = await sharp(svg).resize(4, 4).png().toBuffer({ resolveWithObject: true });
  assert.equal(info.format, "png");
  assert.equal(info.width, 4);
  assert.equal(info.height, 4);
  const decoded = await sharp(data).removeAlpha().raw().toBuffer();
  assert.equal(decoded.length, 4 * 4 * 3);
  assert.deepEqual([...decoded.subarray(0, 3)], [34, 170, 68]);
});
