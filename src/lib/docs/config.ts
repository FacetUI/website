import path from "node:path";

const DEFAULT_DOCS_CONTENT_DIRECTORY = "content";

export const docsRepositoryUrl =
  process.env.FACETUI_DOCS_REPOSITORY_URL ?? "https://github.com/FacetUI/docs.git";

export const docsRepositoryRef = process.env.FACETUI_DOCS_REF ?? "main";

export function getDocsCheckoutRoot(): string {
  return path.resolve(process.cwd(), ".content", "docs");
}

export function getDocsContentRoot(): string {
  const checkoutRoot = getDocsCheckoutRoot();
  const configuredDirectory =
    process.env.FACETUI_DOCS_CONTENT_DIR?.trim() || DEFAULT_DOCS_CONTENT_DIRECTORY;

  if (path.isAbsolute(configuredDirectory)) {
    throw new Error("FACETUI_DOCS_CONTENT_DIR must be relative to the docs checkout.");
  }

  const contentRoot = path.resolve(checkoutRoot, configuredDirectory);
  const relativePath = path.relative(checkoutRoot, contentRoot);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("FACETUI_DOCS_CONTENT_DIR cannot leave the docs checkout.");
  }

  return contentRoot;
}
