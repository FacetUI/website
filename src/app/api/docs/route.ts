import { listDocuments } from "@/lib/docs";

export async function GET() {
  const documents = await listDocuments();

  return Response.json(
    { documents },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
}
