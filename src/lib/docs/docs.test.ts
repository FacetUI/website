import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { renderMarkdown } from "./markdown";
import { DocumentValidationError, getDocumentBySlug, loadDocuments } from "./source";

const temporaryDirectories: string[] = [];

async function createContentDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "facetui-docs-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("documentation source", () => {
  it("loads, sorts, and resolves Markdown documents", async () => {
    const contentRoot = await createContentDirectory();
    await mkdir(path.join(contentRoot, "components"), { recursive: true });
    await writeFile(
      path.join(contentRoot, "index.md"),
      "---\ntitle: Overview\norder: 1\n---\n# Overview\n",
    );
    await writeFile(
      path.join(contentRoot, "components", "button.md"),
      "---\ntitle: Button\nsection: Components\n---\n# Button\n",
    );

    const documents = await loadDocuments({ contentRoot });
    const button = await getDocumentBySlug("components/button", { contentRoot });

    expect(documents.map((document) => document.metadata.slug)).toEqual([
      "index",
      "components/button",
    ]);
    expect(button?.metadata.title).toBe("Button");
  });

  it("rejects documents without valid frontmatter", async () => {
    const contentRoot = await createContentDirectory();
    await writeFile(path.join(contentRoot, "invalid.md"), "# Missing metadata\n");

    await expect(loadDocuments({ contentRoot })).rejects.toBeInstanceOf(DocumentValidationError);
  });
});

describe("Markdown rendering", () => {
  it("supports GFM while discarding raw HTML", async () => {
    const html = await renderMarkdown("# Heading\n\n- [x] Done\n\n<script>alert('x')</script>");

    expect(html).toContain('id="heading"');
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain("<script>");
  });
});
