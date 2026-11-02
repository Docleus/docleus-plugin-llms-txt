import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInstance, type Instance } from "@docleus/server";
import { testStorageLocation } from "@docleus/testing";
import { PAGE_ENTRY_TYPE, type BlockNode } from "@docleus/sdk";
import { afterEach, describe, expect, it } from "vitest";
import {
  LLMS_FULL_TXT_PATH,
  LLMS_TXT_PATH,
  LLMS_TXT_TYPE,
  PLUGIN_NAME,
} from "../src/shared/index.ts";
import { plugin } from "../src/server/index.ts";

const ORIGIN = "http://docleus.test";
const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).toReversed()) await cleanup();
});

/** The smallest site runtime a publication accepts. */
async function siteRuntime(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "docleus-llms-runtime-"));
  cleanups.push(() => rm(dir, { recursive: true, force: true }));
  await writeFile(join(dir, "runtime.js"), "export {};\n");
  await writeFile(join(dir, "importmap.json"), '{ "imports": {} }\n');
  return dir;
}

async function boot(): Promise<Instance> {
  const instance = await createInstance({
    database: await testStorageLocation(),
    siteRuntimeDir: await siteRuntime(),
    isDev: true,
  });
  cleanups.push(() => instance.dispose());
  const fiber = await instance.ctx.plugin(plugin);
  cleanups.push(() => fiber.dispose());
  await instance.ctx.installations.install(PLUGIN_NAME);
  return instance;
}

async function client(instance: Instance) {
  const login = await instance.fetch(
    new Request(`${ORIGIN}/api/auth/dev-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ada@example.com" }),
    }),
  );
  const { token } = (await login.json()) as { token: string };
  return async function json<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await instance.fetch(
      new Request(`${ORIGIN}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          ...(body !== undefined && { "content-type": "application/json" }),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      }),
    );
    if (!response.ok) {
      throw new Error(
        `${method} ${path}: ${response.status} ${await response.text()}`,
      );
    }
    return (await response.json()) as T;
  };
}

function page(title: string, order: number, body: BlockNode, parent?: string) {
  return { type: PAGE_ENTRY_TYPE, title, parent, order, fields: {}, body };
}

/** Publishes a site with three pages; resolves to its URL path. */
async function publishSite(instance: Instance, isEnabled = true) {
  const json = await client(instance);
  const { org } = await json<{ org: { id: string } }>("POST", "/api/orgs", {
    slug: "acme",
    name: "Acme",
  });
  const { space } = await json<{ space: { id: string } }>(
    "POST",
    `/api/orgs/${org.id}/spaces`,
    { slug: "docs", name: "Docs" },
  );
  // The plugin is mounted directly rather than from a manifest, so the
  // org plugin API does not know it; it is enabled through the service.
  await instance.ctx.installations.setEnabled(
    PLUGIN_NAME,
    { kind: "org", orgId: org.id },
    isEnabled,
  );
  const { markdown } = instance.ctx;
  await instance.ctx.content.commit({
    spaceId: space.id,
    parent: undefined,
    put: {
      intro: page(
        "Introduction",
        0,
        markdown.parse("Welcome to *Acme*.\n").body,
      ),
      guide: page(
        "Guide",
        1,
        markdown.parse("Read this first.\n\nThen <kbd>continue</kbd>.\n").body,
      ),
      advanced: page(
        "Advanced",
        0,
        markdown.parse("Only for experts.\n").body,
        "guide",
      ),
    },
    message: "Initial",
  });
  const sites = `/api/orgs/${org.id}/sites`;
  const { site } = await json<{ site: { id: string; url: string } }>(
    "POST",
    sites,
    {
      slug: "handbook",
      name: "Handbook",
      spaces: [{ spaceId: space.id, path: "" }],
    },
  );
  await json("POST", `${sites}/${site.id}/publications`);
  return {
    url: site.url,
    publish: () => json("POST", `${sites}/${site.id}/publications`),
  };
}

async function get(instance: Instance, path: string) {
  const response = await instance.fetch(new Request(`${ORIGIN}${path}`));
  return {
    status: response.status,
    type: response.headers.get("content-type"),
    text: await response.text(),
  };
}

describe("published sites", () => {
  it("serve /llms.txt with a link to every page", async () => {
    const instance = await boot();
    const { url } = await publishSite(instance);
    const file = await get(instance, `${url}${LLMS_TXT_PATH.slice(1)}`);
    expect(file.status).toBe(200);
    expect(file.type).toBe(LLMS_TXT_TYPE);
    expect(file.text).toMatchSnapshot();
  });

  it("serve /llms-full.txt with every page as Markdown", async () => {
    const instance = await boot();
    const { url } = await publishSite(instance);
    const file = await get(instance, `${url}${LLMS_FULL_TXT_PATH.slice(1)}`);
    expect(file.status).toBe(200);
    expect(file.type).toBe(LLMS_TXT_TYPE);
    expect(file.text).toMatchSnapshot();
  });

  it("serve the same files after publishing the same content again", async () => {
    const instance = await boot();
    const { url, publish } = await publishSite(instance);
    const before = await get(instance, `${url}llms-full.txt`);
    await publish();
    expect(await get(instance, `${url}llms-full.txt`)).toEqual(before);
  });

  it("do not have the files while the plugin is disabled", async () => {
    const instance = await boot();
    const { url } = await publishSite(instance, false);
    expect((await get(instance, `${url}llms.txt`)).status).toBe(404);
  });
});
