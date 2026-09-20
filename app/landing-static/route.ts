import { readFile } from "node:fs/promises";
import path from "node:path";

const landingPagePath = path.join(
  process.cwd(),
  "design-prototypes",
  "landing-static",
  "index.html",
);

export async function GET() {
  const html = await readFile(landingPagePath, "utf8");

  return new Response(html, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
