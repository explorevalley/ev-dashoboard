#!/usr/bin/env node
/**
 * Rebuilds the dashboard bundle from src/admin-ui and stamps index.html with a
 * hash of the result.
 *
 * The stamp is not cosmetic: app.js and styles.css keep the same URL on every
 * build, so without a changing query string an admin's browser happily serves
 * the copy it cached weeks ago - the dashboard then runs old code against the
 * current API and looks broken in ways nobody can reproduce.
 */
const { existsSync, copyFileSync, readFileSync, writeFileSync } = require("fs");
const crypto = require("crypto");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const esbuildBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "esbuild.cmd" : "esbuild");
const entryFile = path.join(root, "src", "admin-ui", "app.jsx");
const outputFile = path.join(root, "public", "app.js");
const srcStyles = path.join(root, "src", "admin-ui", "styles.css");
const distStyles = path.join(root, "public", "styles.css");
const indexHtml = path.join(root, "public", "index.html");

const args = [
  entryFile,
  "--bundle",
  "--platform=browser",
  "--format=iife",
  "--target=es2018",
  `--outfile=${outputFile}`,
  "--loader:.js=jsx",
  "--loader:.jsx=jsx",
  // The dashboard pulls the shared taxi-fare helpers from the workspace
  // package, which does not exist outside the monorepo. Point both spellings
  // at the copy vendored into this package.
  "--alias:@explorevalley/shared/dist/taxiFares=./vendor/shared/src/taxiFares.ts",
  "--alias:@explorevalley/shared=./vendor/shared/src/index.ts"
];

// Prefer esbuild's own JS entry point over the node_modules/.bin shim.
//
// On Windows that shim is esbuild.cmd, and Node 20 and newer refuse to spawn a
// .cmd directly - it fails with EINVAL. Passing `shell: true` gets around that
// but then breaks on any space in the path, which this package has as soon as
// it lives in a folder like "admin panel". Running the script through the
// current node binary avoids both problems and needs no shell at all.
const esbuildScript = path.join(root, "node_modules", "esbuild", "bin", "esbuild");

let command;
let commandArgs;
if (existsSync(esbuildScript)) {
  command = process.execPath;
  commandArgs = [esbuildScript, ...args];
} else if (existsSync(esbuildBin)) {
  command = esbuildBin;
  commandArgs = args;
} else {
  command = "npx";
  commandArgs = ["--yes", "esbuild", ...args];
}

const result = spawnSync(command, commandArgs, {
  cwd: root,
  stdio: "inherit",
  shell: command === "npx" && process.platform === "win32"
});

if (result.error) {
  console.error("[build-ui] failed to start bundler:", result.error.message);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status || 1);

if (existsSync(srcStyles)) {
  copyFileSync(srcStyles, distStyles);
  console.log("[build-ui] copied styles.css -> public/styles.css");
}

if (existsSync(indexHtml)) {
  const hash = crypto.createHash("sha1");
  [outputFile, distStyles].forEach((file) => {
    if (existsSync(file)) hash.update(readFileSync(file));
  });
  const version = hash.digest("hex").slice(0, 12);
  const html = readFileSync(indexHtml, "utf8");
  const next = html.replace(/(\.\/(?:app\.js|styles\.css))\?v=[^"']*/g, `$1?v=${version}`);
  if (next !== html) {
    writeFileSync(indexHtml, next);
    console.log(`[build-ui] stamped index.html with ?v=${version}`);
  }
}
