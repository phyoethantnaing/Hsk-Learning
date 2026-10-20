import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PDF_DOCUMENTS } from "../src/lib/pdf-library.mjs";
const ids = new Set(),
  hashes = new Set();
let total = 0,
  count = 0;
for (const doc of PDF_DOCUMENTS) {
  if (ids.has(doc.id)) throw new Error(`Duplicate PDF id: ${doc.id}`);
  ids.add(doc.id);
  if (doc.status === "oversize") {
    if (doc.bytes <= 100 * 1024 * 1024)
      throw new Error(`Invalid oversize status: ${doc.id}`);
    continue;
  }
  const path = doc.sourcePath || `public/pdfs/${doc.filename}`;
  const data = await readFile(path);
  const hash = createHash("sha256").update(data).digest("hex");
  if (
    data.length !== doc.bytes ||
    hash !== doc.sha256 ||
    data.subarray(0, 5).toString() !== "%PDF-" ||
    data.length > 100 * 1024 * 1024
  )
    throw new Error(`PDF integrity/hosting check failed: ${path}`);
  if (hashes.has(hash)) throw new Error(`Duplicate PDF content: ${path}`);
  hashes.add(hash);
  total += data.length;
  count++;
}
const expected = new Set(
  PDF_DOCUMENTS.filter((d) => d.status === "imported").map((d) => d.filename),
);
for (const file of await readdir("public/pdfs")) {
  if (
    !file.startsWith("vocabulary-") &&
    file.endsWith(".pdf") &&
    !expected.has(file)
  )
    throw new Error(`Uncatalogued PDF: ${file}`);
}
try {
  async function size(dir) {
    let sum = 0;
    for (const file of await readdir(dir, { withFileTypes: true }))
      sum += file.isDirectory()
        ? await size(`${dir}/${file.name}`)
        : (await stat(`${dir}/${file.name}`)).size;
    return sum;
  }
  const bytes = await size("dist");
  if (bytes > 1000000000) throw new Error(`Pages exceeds 1 GB: ${bytes}`);
  console.log(`Published site: ${bytes.toLocaleString()} bytes (under 1 GB).`);
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}
console.log(
  `Verified ${count} unique original PDFs, ${total.toLocaleString()} bytes; 2 oversized sources remain external.`,
);
