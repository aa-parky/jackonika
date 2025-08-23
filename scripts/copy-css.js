import { copyFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
(async () => {
  const src = `${__dirname}/../src/jackonika.css`;
  const dir = `${__dirname}/../dist`;
  await mkdir(dir, { recursive: true });
  await copyFile(src, `${dir}/jackonika_style.css`);
  console.log("Copied CSS -> dist/jackonika_style.css");
})();
