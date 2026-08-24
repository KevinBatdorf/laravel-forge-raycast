import { readFileSync } from "node:fs";

const SPEC = "https://forge.laravel.com/api/docs.openapi";

const forgeFields = JSON.parse(readFileSync(new URL("../src/tools/forge-fields.json", import.meta.url), "utf8"));

const response = await fetch(SPEC);
if (!response.ok) {
  console.error(`Could not read ${SPEC}: ${response.status}`);
  process.exit(1);
}
const spec = await response.json();

let drifted = false;

for (const [target, { schema, ours, fields }] of Object.entries(forgeFields)) {
  const attributes = spec.components?.schemas?.[schema]?.properties?.attributes?.properties;
  if (!attributes) {
    console.error(`${schema} has no attributes in the spec. Renamed?`);
    drifted = true;
    continue;
  }

  const inSpec = Object.keys(attributes);
  const named = Object.keys(fields).filter((name) => !ours.includes(name));

  const missing = inSpec.filter((name) => !named.includes(name));
  const stale = named.filter((name) => !inSpec.includes(name));

  if (missing.length) {
    console.error(`${target}: Forge has ${missing.length} field(s) probe-api does not name: ${missing.join(", ")}`);
    drifted = true;
  }
  if (stale.length) {
    console.error(`${target}: probe-api names ${stale.length} field(s) Forge no longer has: ${stale.join(", ")}`);
    drifted = true;
  }
  if (!missing.length && !stale.length) console.log(`${target}: ${named.length} fields match ${schema}`);
}

if (drifted) {
  console.error("\nUpdate src/tools/forge-fields.json, giving each new field a description.");
  process.exit(1);
}
