# AGENTS.md

## Project Context

This is the public Sardegna Trail Avventura website. It is a React/Vite application hosted
exclusively on Vercel.

Start with `README.md` for local setup, environment variables, validation, and deployment.

## Key Files

- `src/`: frontend application source.
- `src/config/site.js`: shared business, contact, and Web3Forms configuration.
- `src/data/`: static website content.
- `src/seo/seo-config.js`: route-specific SEO metadata and structured data.
- `scripts/build-seo.mjs`: static SEO page and sitemap generation.
- `vercel.json`: production rewrites and response headers.

## Working Notes

- Use `pnpm run dev` for local development.
- Keep the website frontend-only unless a separately approved Vercel service is required.
- Use static local data for public content and Web3Forms for contact delivery.
- Preserve the existing Vite and Vercel deployment workflow.
- Run typecheck, lint, and build before publishing.
