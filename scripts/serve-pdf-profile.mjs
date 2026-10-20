// Development-only, loopback static server. GitHub Pages, unlike Astro preview,
// advertises byte ranges; use this to reproduce that capability in lab profiles.
import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};
http
  .createServer(async (request, response) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) {
        response.writeHead(405);
        response.end();
        return;
      }
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      if (!pathname.startsWith("/Hsk-Learning/")) {
        response.writeHead(404);
        response.end();
        return;
      }
      let filename = path.resolve(
        root,
        "." + pathname.slice("/Hsk-Learning".length),
      );
      if (!filename.startsWith(root + path.sep)) {
        response.writeHead(404);
        response.end();
        return;
      }
      if ((await stat(filename)).isDirectory())
        filename = path.join(filename, "index.html");
      const size = (await stat(filename)).size;
      let start = 0,
        end = size - 1;
      response.setHeader(
        "Content-Type",
        types[path.extname(filename)] || "application/octet-stream",
      );
      response.setHeader("Accept-Ranges", "bytes");
      response.setHeader("Cache-Control", "no-store");
      if (request.headers.range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range);
        if (match) {
          start = Number(match[1]);
          end = match[2] ? Math.min(size - 1, Number(match[2])) : end;
        }
        if (!match || start >= size || start > end) {
          response.writeHead(416, { "Content-Range": `bytes */${size}` });
          response.end();
          return;
        }
        response.statusCode = 206;
        response.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
      }
      response.setHeader("Content-Length", end - start + 1);
      if (request.method === "HEAD") {
        response.end();
        return;
      }
      const stream = createReadStream(filename, { start, end });
      stream.on("error", () => response.destroy());
      response.on("close", () => stream.destroy());
      stream.pipe(response);
    } catch {
      if (!response.headersSent) response.writeHead(404);
      response.end();
    }
  })
  .listen(4326, "127.0.0.1", () =>
    console.log(
      "Range-capable lab preview: http://127.0.0.1:4326/Hsk-Learning/",
    ),
  );
