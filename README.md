<p align="center">
  <a href="https://docleus.io"><img src="./.github/assets/docleus.svg" width="88" alt="Docleus logo" /></a>
</p>

<h1 align="center">LLM Exports</h1>

<p align="center">
  <strong>Documentation, ready to read as text.</strong><br />
  Deterministic llms.txt and llms-full.txt exports for published sites.
</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" /></a>
  <img alt="Public preview in preparation" src="https://img.shields.io/badge/preview-0.0.6-cfcfcf?style=flat-square" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square" />
  <a href="https://docleus.io"><img alt="Online documentation" src="https://img.shields.io/badge/docs-docleus.io-111111?style=flat-square" /></a>
</p>

<p align="center">
  <a href="https://docleus.io">Documentation</a> &middot;
  <a href="#files">Generated files</a> &middot;
  <a href="https://github.com/Docleus/docleus">Run Docleus</a> &middot;
  <a href="https://github.com/Docleus/.github/blob/main/CONTRIBUTING.md">Contribute</a>
</p>

---

Generates `/llms.txt` and `/llms-full.txt` for published sites.

## Files

Both files are added to every site the plugin is enabled for, at the site root, through `ctx.render.registerFile`. They are served as `text/plain; charset=utf-8` and are deterministic: the same content gives the same bytes.

`/llms.txt` follows [llmstxt.org](https://llmstxt.org): the site name as the title, then one section per space with a link to each of its pages, in site order.

```markdown
# Handbook

## Docs

- [Introduction](./)
- [Guide](./guide/)
- [Advanced](./guide/advanced/)
```

`/llms-full.txt` has every page in site order: its title as a level-one heading, its URL, and its body as Markdown from `ctx.markdown`.

```markdown
# Handbook

# Introduction

URL: ./

Welcome to the handbook.
```

Links are relative to the site root, so they work under `/sites/<org>/<site>/`, on a custom domain, and from a static host. The site's 404 page is not listed.

## Development

Use Node.js 24 and pnpm 11.21.0. Keep this repository next to `docleus-core`
with its original directory name; the `link:` development dependencies need
that layout. Install core before this repository:

```sh
pnpm --dir ../docleus-core install --frozen-lockfile
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

`pnpm check` runs typecheck, lint, formatting, dependency boundaries, licenses,
and unit/in-process integration tests. Browser and external-service tests,
where provided, are separate and need the sibling repositories listed in
their setup files. The SDK is a host-provided peer dependency; packages remain
private and are not installed from npm. All extension points are experimental
before 1.0.

## Community

[Contributing](https://github.com/Docleus/.github/blob/main/CONTRIBUTING.md) &middot;
[Code of conduct](https://github.com/Docleus/.github/blob/main/CODE_OF_CONDUCT.md) &middot;
[Security](https://github.com/Docleus/.github/blob/main/SECURITY.md) &middot;
[Support](https://github.com/Docleus/.github/blob/main/SUPPORT.md)

## License

[MIT](LICENSE)

## Compatibility

Version `0.0.6` supports Docleus core and SDK `0.0.1`, `0.0.2`, `0.0.3`, `0.0.4`, `0.0.5` and `0.0.6` through
the matching `>=0.0.1 <0.0.7` manifest and SDK peer ranges.
