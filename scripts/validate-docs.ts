import { loadDocuments, renderMarkdown } from "../src/lib/docs";

async function validateDocumentation(): Promise<void> {
  const documents = await loadDocuments({ includeDrafts: true });

  await Promise.all(documents.map((document) => renderMarkdown(document.markdown)));

  if (documents.length === 0) {
    console.log(
      "Documentation source is reachable; no Markdown files exist in its content directory yet.",
    );
    return;
  }

  console.log(`Validated ${documents.length} Markdown document(s).`);
}

validateDocumentation().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
