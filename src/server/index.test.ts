import type { BlockNode, SiteFileInput, SitePage, Space } from "@docleus/sdk";
import { describe, expect, it } from "vitest";
import { LLMS_TXT_TYPE } from "../shared/index.ts";
import { llmsFullTxt, llmsTxt, pageUrl } from "./index.ts";

const SITE = { id: "site-1", name: "Acme Docs", settings: undefined };

const docs: Space = { id: "s1", orgId: "o1", slug: "docs", name: "Guides" };
const api: Space = { id: "s2", orgId: "o1", slug: "api", name: "API" };

function body(text: string): BlockNode {
  return {
    id: "root",
    type: "doc",
    v: 1,
    attrs: {},
    content: [{ id: "p", type: "raw", v: 1, attrs: { source: text } }],
  };
}

function sitePage(
  space: Space,
  path: string,
  title: string,
  text?: string,
): SitePage {
  return {
    kind: "page",
    site: SITE,
    space,
    revision: `rev-${space.id}`,
    entry: {
      id: path,
      type: "page",
      title,
      parent: undefined,
      order: 0,
      fields: {},
      ...(text !== undefined && { body: body(text) }),
    },
    path,
    title,
    nav: [],
    prev: undefined,
    next: undefined,
    url: (target) => `.${target}`,
    asset: (plugin, file) => `./_assets/${plugin}/${file}`,
  };
}

const serialize = (node: BlockNode): string =>
  (node.content ?? [])
    .map((block) => String(block.attrs.source))
    .join("\n\n")
    .concat("\n");

const input: SiteFileInput = {
  site: SITE,
  pages: [
    sitePage(docs, "/", "Introduction", "Welcome to *Acme*."),
    sitePage(docs, "/install/", "Install", "## Steps\n\nRun the installer."),
    sitePage(docs, "/install/linux/", "Linux [beta]", "Use the package."),
    sitePage(api, "/api/", "API reference"),
    { ...sitePage(api, "/", "Page not found"), kind: "not-found" },
  ],
};

describe("llmsTxt", () => {
  it("lists every page under a section per space", () => {
    const file = llmsTxt(input);
    expect(file.type).toBe(LLMS_TXT_TYPE);
    expect(file.body).toMatchSnapshot();
  });

  it("starts with the site name as the only level-one heading", () => {
    const text = String(llmsTxt(input).body);
    expect(text.startsWith("# Acme Docs\n\n")).toBe(true);
    expect(text.match(/^# /gm)).toHaveLength(1);
  });

  it("leaves out the not-found page", () => {
    expect(String(llmsTxt(input).body)).not.toContain("Page not found");
  });

  it("is only the title for a site without pages", () => {
    expect(llmsTxt({ site: SITE, pages: [] }).body).toBe("# Acme Docs\n");
  });

  it("is the same for the same input", () => {
    expect(llmsTxt(input).body).toBe(llmsTxt(input).body);
  });

  it("keeps link text and titles on one line", () => {
    const text = String(
      llmsTxt({
        site: { ...SITE, name: "Acme\nDocs" },
        pages: [sitePage(docs, "/a/", "One\n  two ] three")],
      }).body,
    );
    expect(text).toBe(
      "# Acme Docs\n\n## Guides\n\n- [One two \\] three](./a/)\n",
    );
  });
});

describe("pageUrl", () => {
  it("is the page path relative to the site root", () => {
    expect(pageUrl(sitePage(docs, "/", "Home"))).toBe("./");
    expect(pageUrl(sitePage(docs, "/a/b/", "B"))).toBe("./a/b/");
  });

  it("encodes characters that would end a link destination", () => {
    expect(pageUrl(sitePage(docs, "/a (b)/", "B"))).toBe("./a%20%28b%29/");
  });
});

describe("llmsFullTxt", () => {
  it("prints every page with its URL and Markdown body", () => {
    const file = llmsFullTxt(input, serialize);
    expect(file.type).toBe(LLMS_TXT_TYPE);
    expect(file.body).toMatchSnapshot();
  });

  it("prints pages in site order", () => {
    const text = String(llmsFullTxt(input, serialize).body);
    const titles = [...text.matchAll(/^# (.+)$/gm)].map((match) => match[1]);
    expect(titles).toEqual([
      "Acme Docs",
      "Introduction",
      "Install",
      "Linux [beta]",
      "API reference",
    ]);
  });

  it("is the same for the same input", () => {
    expect(llmsFullTxt(input, serialize).body).toBe(
      llmsFullTxt(input, serialize).body,
    );
  });
});
