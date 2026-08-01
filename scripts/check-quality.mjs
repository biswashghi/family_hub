import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const assetsDir = path.resolve("public/app/assets");
const assets = readdirSync(assetsDir);
const jsFiles = assets.filter((name) => name.endsWith(".js"));
const cssFiles = assets.filter((name) => name.endsWith(".css"));
if (!jsFiles.length || !cssFiles.length) throw new Error("production assets are missing; run npm run build first");

const gzipTotal = (files) => files.reduce((total, file) => total + gzipSync(readFileSync(path.join(assetsDir, file))).byteLength, 0);
const jsGzipBytes = gzipTotal(jsFiles);
const cssGzipBytes = gzipTotal(cssFiles);
const limits = { js: 120 * 1024, css: 10 * 1024 };

if (jsGzipBytes > limits.js) throw new Error(`JavaScript gzip budget exceeded: ${jsGzipBytes} > ${limits.js}`);
if (cssGzipBytes > limits.css) throw new Error(`CSS gzip budget exceeded: ${cssGzipBytes} > ${limits.css}`);

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ? [target] : [];
  });
}

const clientSource = sourceFiles(path.resolve("client/src")).map((file) => readFileSync(file, "utf8")).join("\n");
if (clientSource.includes('api<Dashboard>("/api/dashboard")')) throw new Error("Client still loads the legacy dashboard endpoint");

console.log(`Quality budgets passed: JS ${(jsGzipBytes / 1024).toFixed(1)} KB gzip, CSS ${(cssGzipBytes / 1024).toFixed(1)} KB gzip`);
