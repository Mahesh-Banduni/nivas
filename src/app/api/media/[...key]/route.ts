import { getObject, isSafeKey } from "@/infrastructure/media-storage";

export async function GET(_request: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const objectKey = key.join("/");
  if (!isSafeKey(objectKey)) return new Response("Not found", { status: 404 });

  const object = await getObject(objectKey);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body as unknown as BodyInit, {
    headers: {
      "content-type": object.contentType,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
