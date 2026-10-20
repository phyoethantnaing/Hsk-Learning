// Optional repeatable import of the inspected public files. No credentials,
// cookies, permission workarounds, conversion, or compression are used.
import { readFile, mkdir, rename, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import inventory from "../data/pdf-library.json" with { type: "json" };
await mkdir("public/pdfs", { recursive: true });
for (const doc of inventory.documents) {
  if (doc.status !== "imported") {
    console.log(`Source only: ${doc.filename}`);
    continue;
  }
  if (
    !/^[\w-]+$/.test(doc.driveId) ||
    !/^HSK-[1-6][AB]?-(Textbook|Workbook)\.pdf$/.test(doc.filename) ||
    doc.bytes > 100 * 1024 * 1024
  )
    throw new Error("Invalid import manifest");
  const path = `public/pdfs/${doc.filename}`;
  function valid(data) {
    return (
      data.length === doc.bytes &&
      createHash("sha256").update(data).digest("hex") === doc.sha256
    );
  }
  try {
    if (valid(await readFile(path))) {
      console.log(`Verified existing: ${doc.filename}`);
      continue;
    }
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  const temporary = `${path}.part`;
  const result = spawnSync(
    "curl",
    [
      "--fail",
      "--location",
      "--silent",
      "--show-error",
      "--max-time",
      "900",
      `https://drive.google.com/uc?export=download&id=${doc.driveId}`,
      "-o",
      temporary,
    ],
    { stdio: "inherit" },
  );
  try {
    if (result.status !== 0 || !valid(await readFile(temporary)))
      throw new Error(
        `Access denied, incomplete, or changed source: ${doc.filename}. Existing files were not replaced.`,
      );
    await rename(temporary, path);
    console.log(`Imported original: ${doc.filename}`);
  } finally {
    await rm(temporary, { force: true });
  }
}
