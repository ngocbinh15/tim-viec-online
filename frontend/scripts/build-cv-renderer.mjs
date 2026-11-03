import { build } from "esbuild";
await build({
  entryPoints: ["scripts/render-cv.tsx"],
  outfile: "dist/cv-renderer/render-cv.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  target: "node22",
});
