import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workspaceRoot = path.resolve(process.cwd());
const cacheRoot = path.join(workspaceRoot, ".content");
const checkoutRoot = path.join(cacheRoot, "docs");
const markerName = ".facetui-docs-cache.json";
const markerPath = path.join(checkoutRoot, markerName);
const repositoryUrl =
  process.env.FACETUI_DOCS_REPOSITORY_URL ?? "https://github.com/FacetUI/docs.git";
const repositoryRef = process.env.FACETUI_DOCS_REF ?? "main";

function validateRepositoryUrl(value) {
  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.username ||
    url.password ||
    !url.pathname.endsWith(".git")
  ) {
    throw new Error(
      "FACETUI_DOCS_REPOSITORY_URL must be a credential-free HTTPS GitHub clone URL ending in .git.",
    );
  }

  return url.toString();
}

function validateRepositoryRef(value) {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/.test(value) ||
    value.includes("..") ||
    value.includes("//") ||
    value.includes("@{") ||
    value.endsWith("/") ||
    value.endsWith(".lock")
  ) {
    throw new Error("FACETUI_DOCS_REF is not a safe Git ref.");
  }

  return value;
}

function runGit(argumentsList, { captureOutput = false } = {}) {
  const result = spawnSync("git", argumentsList, {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      GCM_INTERACTIVE: "Never",
      GIT_TERMINAL_PROMPT: "0",
    },
    stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const details = captureOutput ? result.stderr.trim() : "See the Git output above.";
    throw new Error(`Git command failed: ${details}`);
  }

  return captureOutput ? result.stdout.trim() : "";
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function assertManagedCheckout() {
  if (!(await pathExists(checkoutRoot))) {
    return;
  }

  if (!(await pathExists(markerPath))) {
    throw new Error(
      `Refusing to replace ${checkoutRoot} because it is not marked as a managed docs cache.`,
    );
  }

  const marker = JSON.parse(await readFile(markerPath, "utf8"));

  if (marker.type !== "facetui-docs-cache") {
    throw new Error(`Refusing to replace ${checkoutRoot} because its cache marker is invalid.`);
  }
}

async function syncDocumentation() {
  const safeRepositoryUrl = validateRepositoryUrl(repositoryUrl);
  const safeRepositoryRef = validateRepositoryRef(repositoryRef);
  const temporaryCheckout = path.join(
    cacheRoot,
    `docs-tmp-${process.pid}-${Date.now().toString(36)}`,
  );

  await assertManagedCheckout();
  await mkdir(cacheRoot, { recursive: true });

  try {
    runGit(["init", "--quiet", temporaryCheckout]);
    runGit(["-C", temporaryCheckout, "remote", "add", "origin", safeRepositoryUrl]);
    runGit(["-C", temporaryCheckout, "fetch", "--depth=1", "origin", safeRepositoryRef]);
    runGit(["-C", temporaryCheckout, "checkout", "--quiet", "--detach", "FETCH_HEAD"]);

    const commit = runGit(["-C", temporaryCheckout, "rev-parse", "HEAD"], {
      captureOutput: true,
    });
    const source = {
      commit,
      repository: safeRepositoryUrl,
      requestedRef: safeRepositoryRef,
      syncedAt: new Date().toISOString(),
      type: "facetui-docs-cache",
    };

    await rm(path.join(temporaryCheckout, ".git"), { force: true, recursive: true });
    await writeFile(
      path.join(temporaryCheckout, markerName),
      `${JSON.stringify(source, null, 2)}\n`,
      "utf8",
    );

    if (await pathExists(checkoutRoot)) {
      await rm(checkoutRoot, { force: true, recursive: true });
    }

    await rename(temporaryCheckout, checkoutRoot);
    await writeFile(
      path.join(cacheRoot, "docs-source.json"),
      `${JSON.stringify(source, null, 2)}\n`,
      "utf8",
    );

    console.log(`Documentation synced at ${commit.slice(0, 12)}.`);
  } finally {
    await rm(temporaryCheckout, { force: true, recursive: true });
  }
}

await syncDocumentation();
