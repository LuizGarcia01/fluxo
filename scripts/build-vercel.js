/**
 * Vercel Build Output API v3 adapter for TanStack Start.
 * Runs AFTER `bun run build` to create .vercel/output/.
 * Uses Node.js 20.x runtime (50MB limit, no cold-start constraints).
 */
import { mkdirSync, rmSync, cpSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const vercelOut = join(root, ".vercel", "output");
const funcDir = join(vercelOut, "functions", "index.func");
const staticDir = join(vercelOut, "static");

// Clean previous output
if (existsSync(vercelOut)) rmSync(vercelOut, { recursive: true });
mkdirSync(funcDir, { recursive: true });
mkdirSync(staticDir, { recursive: true });

// 1. Create a Node.js-compatible wrapper
//    Converts between Node.js IncomingMessage/ServerResponse and Web Fetch API
const wrapperPath = join(root, ".vercel-entry-tmp.js");
writeFileSync(
  wrapperPath,
  `import { Buffer } from "node:buffer";
import handler from './dist/server/server.js';

export default async function vercelHandler(req, res) {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost";
  const url = new URL(req.url, \`\${proto}://\${host}\`);

  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val == null) continue;
    if (Array.isArray(val)) val.forEach((v) => headers.append(key, v));
    else headers.set(key, val);
  }

  let body = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length > 0) body = Buffer.concat(chunks);
  }

  const request = new Request(url.toString(), { method: req.method, headers, body });
  const response = await handler.fetch(request, {}, {});

  res.statusCode = response.status;
  for (const [key, val] of response.headers.entries()) {
    res.setHeader(key, val);
  }

  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}
`
);

// 2. Bundle into a single self-contained file
console.log("Bundling server for Vercel Node.js...");
execSync(
  [
    "bun build",
    wrapperPath,
    "--bundle",
    "--minify",
    "--format=cjs",
    "--target=node",
    `--outfile=${funcDir}/index.js`,
    "--external=node:*",
  ].join(" "),
  { stdio: "inherit" }
);

rmSync(wrapperPath);

const bundleKB = Math.round(readFileSync(`${funcDir}/index.js`).length / 1024);
console.log(`Bundle size: ${bundleKB} KB`);

// 3. Copy client assets to static
if (existsSync(join(root, "dist", "client"))) {
  cpSync(join(root, "dist", "client"), staticDir, { recursive: true });
  console.log("Copied dist/client → static/");
}

// 4. Node.js function config
writeFileSync(
  join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.js",
      launcherType: "Nodejs",
    },
    null,
    2
  )
);

// 5. Vercel routing config (Build Output API v3)
const config = {
  version: 3,
  routes: [
    // Immutable hashed assets
    {
      src: "^/assets/(.+\\.[0-9a-f]{8}\\.(js|css))$",
      headers: { "cache-control": "public, max-age=31536000, immutable" },
      continue: true,
    },
    // Serve static files first (icons, CSS, JS chunks)
    { handle: "filesystem" },
    // Catch-all → Node.js SSR function
    { src: "^/(.*)", dest: "/" },
  ],
};

writeFileSync(join(vercelOut, "config.json"), JSON.stringify(config, null, 2));

console.log(`\n✓ .vercel/output/ ready`);
console.log(`  Node.js function: ${bundleKB} KB`);
console.log(`  Static assets: dist/client/`);
