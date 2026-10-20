import inventory from "../../data/pdf-library.json" with { type: "json" };
import vocabulary from "../../data/pdf-vocabulary.json" with { type: "json" };
export const PDF_DOCUMENTS = [...inventory.documents, ...vocabulary];
export const READABLE_PDFS = PDF_DOCUMENTS.filter(
  (doc) => doc.status !== "oversize",
);
export const PDF_FOLDER_URL = inventory.folderUrl;
export function pdfTitle(doc) {
  return doc.title || doc.filename.replace(/\.pdf$/, "").replaceAll("-", " ");
}
export function pdfSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}
