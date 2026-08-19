import { getDocumentBySlug, renderMarkdown } from "@/lib/docs";

interface DocumentRouteContext {
  params: Promise<{ slug: string[] }>;
}

export async function GET(_request: Request, context: DocumentRouteContext) {
  const { slug } = await context.params;
  const document = await getDocumentBySlug(slug.join("/"));

  if (!document) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  const html = await renderMarkdown(document.markdown);

  return Response.json(
    {
      document: {
        ...document.metadata,
        html,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
}
