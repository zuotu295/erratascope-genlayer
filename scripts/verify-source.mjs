import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const manifest = JSON.parse(
  readFileSync(new URL("../deployment.json", import.meta.url), "utf8"),
);
const source = readFileSync(
  new URL("../contracts/errata_scope.py", import.meta.url),
);
const actual = createHash("sha256").update(source).digest("hex");
if (manifest.source_sha256 !== actual)
  throw Error("Bundled source differs from deployment manifest");
if (manifest.chain_id !== 61999 || manifest.protocol !== "erratascope-1")
  throw Error("Unexpected network or protocol");
console.log("Contract source and network manifest verified.");
