import { readFile } from "node:fs/promises";
import path from "node:path";

const characterFiles = new Set([
  "dinosaur.png",
  "otter.png",
  "owl.png",
  "penguin.png",
  "rabbit.png",
  "red-panda.png",
  "sheep.png",
]);

export async function GET(
  _request: Request,
  context: RouteContext<"/assets/characters/[file]">,
) {
  const { file } = await context.params;

  if (!characterFiles.has(file)) {
    return new Response("Not found", { status: 404 });
  }

  const imagePath = path.join(
    process.cwd(),
    "design-prototypes",
    "landing-static",
    "assets",
    "characters",
    file,
  );
  const image = await readFile(imagePath);

  return new Response(image, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/png",
    },
  });
}
