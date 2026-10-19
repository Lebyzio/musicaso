// Copies the static .woff files used by ImageResponse (OG image, PNG cards) from @fontsource
// into assets/fonts/, which is committed so rendering never needs the network.
// Satori can't read woff2 or variable fonts — hence static per-weight .woff files.
// Run after bumping the @fontsource packages: `pnpm fonts`
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "assets", "fonts");

const FILES = {
  fraunces: [
    "fraunces-latin-400-normal.woff",
    "fraunces-latin-600-normal.woff",
    "fraunces-latin-400-italic.woff",
  ],
  "ibm-plex-sans-thai": [
    "ibm-plex-sans-thai-thai-400-normal.woff",
    "ibm-plex-sans-thai-thai-600-normal.woff",
    "ibm-plex-sans-thai-latin-400-normal.woff",
    "ibm-plex-sans-thai-latin-600-normal.woff",
  ],
};

mkdirSync(out, { recursive: true });
for (const [pkg, files] of Object.entries(FILES)) {
  const dir = join(root, "node_modules", "@fontsource", pkg);
  for (const file of files) copyFileSync(join(dir, "files", file), join(out, file));
  const license = join(dir, "LICENSE");
  if (existsSync(license)) copyFileSync(license, join(out, `LICENSE-${pkg}.txt`));
  console.log(`✓ ${pkg}: ${files.length} files`);
}
