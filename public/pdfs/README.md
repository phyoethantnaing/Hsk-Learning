# Original HSK study PDFs

Sixteen PDFs were imported unchanged on 2026-10-20 from the publicly shared folder:
https://drive.google.com/drive/folders/1vK0IFnJ_LMZriPrFmsHzlskQ8c_fN6fV

`data/pdf-library.json` records original filenames, exact byte sizes, Google Drive
file IDs, page counts and SHA-256 hashes. `npm run check-pdfs` verifies integrity,
deduplication and hosting limits. No images, fonts or pages were recompressed.
Copyright remains with the respective document owners; these documents are not
relicensed under the repository's MIT software license.

HSK-6A-Textbook.pdf (105,148,446 bytes) and HSK-6B-Textbook.pdf (114,026,280 bytes)
exceed GitHub's 100 MiB per-file limit and are **not imported**. The library labels
them as external sources and links to their original Google Drive viewer.

The seven `vocabulary-hsk-*.pdf` files are generated deploy copies of existing
`source/pdfs/` originals, not new imports or duplicate committed binaries. Their
original attribution is preserved. `npm run prebuild` prepares these copies and
the local PDF.js supporting assets.

All files served by GitHub Pages are public. Removing reader download, share,
print and export controls does not prevent access to PDF URLs or browser features.
