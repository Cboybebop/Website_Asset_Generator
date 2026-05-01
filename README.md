# FavIcon Generator

A browser-based React tool for creating website favicons and Open Graph preview images from uploaded artwork.

## Features

- Upload PNG, JPG, WebP, or SVG source artwork.
- Crop and reposition artwork in a square favicon safe area.
- Adjust zoom and choose transparent or solid backgrounds.
- Generate `favicon.ico`, common PNG favicon sizes, `apple-touch-icon.png`, and `site.webmanifest`.
- Copy implementation steps for adding the generated files to a website.
- Switch to an `OG:image` generator tab.
- Compose and download a 1200 x 630 `og-image.png`.
- Copy Open Graph and Twitter card implementation tags.
- Use `Just image` mode when the uploaded artwork should become the OG image directly.
- Select from bundled free web fonts for composed OG cards.
- Set a custom accent color and adjust overlay transparency.
- Test a live page URL for favicon tags, Open Graph metadata, or both.
- Review implemented tags and suggested fixes for missing or incomplete setup.
- Ships with its own favicon, manifest, and OG tags so the local app can validate itself.

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```
