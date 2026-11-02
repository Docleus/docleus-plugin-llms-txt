import {
  definePlugin,
  type BlockNode,
  type SiteFile,
  type SiteFileInput,
  type SitePage,
} from "@docleus/sdk";
import {
  LLMS_FULL_TXT_PATH,
  LLMS_TXT_PATH,
  LLMS_TXT_TYPE,
  PLUGIN_NAME,
} from "../shared/index.ts";

/** Prints a page body as Markdown; `ctx.markdown.serialize` in the plugin. */
export type SerializeBody = (body: BlockNode) => string;

interface Section {
  readonly name: string;
  readonly pages: SitePage[];
}

function oneLine(text: string): string {
  return text.replaceAll(/\s+/g, " ").trim();
}

function linkText(text: string): string {
  return oneLine(text).replaceAll(/[\\[\]]/g, (char) => `\\${char}`);
}

/**
 * A page's URL relative to the site root, where both files are served.
 * Characters that would end a Markdown link destination are encoded.
 */
export function pageUrl(page: SitePage): string {
  return `.${page.path}`.replaceAll(
    /[\s()<>]/g,
    (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );
}

function contentPages(input: SiteFileInput): SitePage[] {
  return input.pages.filter((page) => page.kind === "page");
}

/** Consecutive pages of the same space, in site order. */
function sectionsOf(pages: readonly SitePage[]): Section[] {
  const sections: { id: string; name: string; pages: SitePage[] }[] = [];
  for (const page of pages) {
    const last = sections.at(-1);
    if (last?.id === page.space.id) last.pages.push(page);
    else
      sections.push({
        id: page.space.id,
        name: page.space.name,
        pages: [page],
      });
  }
  return sections;
}

/**
 * The site's `/llms.txt` (https://llmstxt.org): the site name as the
 * title, then one section per space listing its pages in site order.
 */
export function llmsTxt(input: SiteFileInput): SiteFile {
  const blocks = [`# ${oneLine(input.site.name)}`];
  for (const section of sectionsOf(contentPages(input))) {
    blocks.push(
      [
        `## ${oneLine(section.name)}`,
        "",
        ...section.pages.map(
          (page) => `- [${linkText(page.title)}](${pageUrl(page)})`,
        ),
      ].join("\n"),
    );
  }
  return { body: `${blocks.join("\n\n")}\n`, type: LLMS_TXT_TYPE };
}

/**
 * The site's `/llms-full.txt`: the site name as the title, then every page
 * in site order as a level-one heading with its URL and its Markdown body.
 */
export function llmsFullTxt(
  input: SiteFileInput,
  serialize: SerializeBody,
): SiteFile {
  const blocks = [`# ${oneLine(input.site.name)}`];
  for (const page of contentPages(input)) {
    const body = page.entry?.body;
    const markdown = body === undefined ? "" : serialize(body).trim();
    blocks.push(
      [`# ${oneLine(page.title)}`, `URL: ${pageUrl(page)}`, markdown]
        .filter((part) => part !== "")
        .join("\n\n"),
    );
  }
  return { body: `${blocks.join("\n\n")}\n`, type: LLMS_TXT_TYPE };
}

/** Adds `/llms.txt` and `/llms-full.txt` to every site it is enabled for. */
export const plugin = definePlugin({
  name: PLUGIN_NAME,
  inject: ["render", "markdown"],
  apply(ctx) {
    ctx.render.registerFile(LLMS_TXT_PATH, llmsTxt);
    ctx.render.registerFile(LLMS_FULL_TXT_PATH, (input) =>
      llmsFullTxt(input, (body) => ctx.markdown.serialize({ body })),
    );
  },
});
