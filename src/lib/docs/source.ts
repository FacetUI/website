import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import { getDocsContentRoot } from "./config";
import {
  documentFrontmatterSchema,
  type DocumentMetadata,
  type DocumentRecord,
  type LoadDocumentsOptions,
} from "./types";

const MARKDOWN_EXTENSION = /\.md$/i;
const HIDDEN_DIRECTORY = /^\./;

export class DocumentValidationError extends Error {
  constructor(sourcePath: string, details: string) {
    super(`Invalid document ${sourcePath}: ${details}`);
    this.name = "DocumentValidationError";
  }
}

async function findMarkdownFiles(directory: string): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory() && !HIDDEN_DIRECTORY.test(entry.name)) {
      files.push(...(await findMarkdownFiles(entryPath)));
    } else if (entry.isFile() && MARKDOWN_EXTENSION.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function createSlug(relativePath: string): string {
  const segments = relativePath
    .replace(/\\/g, "/")
    .replace(MARKDOWN_EXTENSION, "")
    .split("/")
    .filter(Boolean);

  if (segments.at(-1)?.toLowerCase() === "index") {
    segments.pop();
  }

  return segments.join("/") || "index";
}

function normalizeRequestedSlug(slug: string): string | null {
  const segments = slug.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "index";
  }

  if (segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }

  return segments.join("/");
}

function compareDocuments(left: DocumentRecord, right: DocumentRecord): number {
  const sectionComparison = (left.metadata.section ?? "").localeCompare(
    right.metadata.section ?? "",
  );

  if (sectionComparison !== 0) {
    return sectionComparison;
  }

  const orderComparison =
    (left.metadata.order ?? Number.MAX_SAFE_INTEGER) -
    (right.metadata.order ?? Number.MAX_SAFE_INTEGER);

  if (orderComparison !== 0) {
    return orderComparison;
  }

  return left.metadata.title.localeCompare(right.metadata.title);
}

export async function loadDocuments(options: LoadDocumentsOptions = {}): Promise<DocumentRecord[]> {
  const contentRoot = path.resolve(options.contentRoot ?? getDocsContentRoot());
  const sourceFiles = await findMarkdownFiles(contentRoot);
  const documents: DocumentRecord[] = [];
  const knownSlugs = new Set<string>();

  for (const sourceFile of sourceFiles) {
    const sourcePath = path.relative(contentRoot, sourceFile).replace(/\\/g, "/");
    const rawDocument = await readFile(sourceFile, "utf8");
    const parsedDocument = matter(rawDocument);
    const parsedFrontmatter = documentFrontmatterSchema.safeParse(parsedDocument.data);

    if (!parsedFrontmatter.success) {
      throw new DocumentValidationError(
        sourcePath,
        parsedFrontmatter.error.issues
          .map((issue) => `${issue.path.join(".") || "frontmatter"}: ${issue.message}`)
          .join("; "),
      );
    }

    if (parsedFrontmatter.data.draft && !options.includeDrafts) {
      continue;
    }

    const slug = createSlug(sourcePath);

    if (knownSlugs.has(slug)) {
      throw new DocumentValidationError(sourcePath, `duplicate slug \"${slug}\"`);
    }

    knownSlugs.add(slug);
    documents.push({
      markdown: parsedDocument.content,
      metadata: {
        ...parsedFrontmatter.data,
        slug,
        sourcePath,
      },
    });
  }

  return documents.sort(compareDocuments);
}

export async function listDocuments(
  options: LoadDocumentsOptions = {},
): Promise<DocumentMetadata[]> {
  const documents = await loadDocuments(options);
  return documents.map((document) => document.metadata);
}

export async function getDocumentBySlug(
  slug: string,
  options: LoadDocumentsOptions = {},
): Promise<DocumentRecord | null> {
  const normalizedSlug = normalizeRequestedSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const documents = await loadDocuments(options);
  return documents.find((document) => document.metadata.slug === normalizedSlug) ?? null;
}
