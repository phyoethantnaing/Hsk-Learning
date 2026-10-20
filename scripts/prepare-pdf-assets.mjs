import { cp, mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const target = resolve(root, "public/pdfjs");
await mkdir(target, { recursive: true });
// Ship the pinned open-source runtime assets locally; no CDN or third-party API.
for (const folder of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  await cp(
    resolve(root, "node_modules/pdfjs-dist", folder),
    resolve(target, folder),
    { recursive: true },
  );
}
await copyFile(
  resolve(root, "node_modules/pdfjs-dist/LICENSE"),
  resolve(target, "LICENSE"),
);
await mkdir(resolve(root, "public/pdfs"), { recursive: true });
for (const level of ["1", "2", "3", "4", "5", "6", "7-9"]) {
  // Single committed original; this deploy copy never changes the parser inputs.
  await copyFile(
    resolve(root, `source/pdfs/hsk-${level}.pdf`),
    resolve(root, `public/pdfs/vocabulary-hsk-${level}.pdf`),
  );
}
