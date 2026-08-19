import { docsRepositoryRef } from "@/lib/docs";

export async function GET() {
  return Response.json({
    application: "FacetUI website",
    docs: {
      ref: docsRepositoryRef,
      repository: "FacetUI/docs",
    },
    status: "ok",
    vueIslands: "available",
  });
}
