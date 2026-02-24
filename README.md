# Rankmine Arena

A barebones proof-of-concept for the Rankmine Arena app. This Phase-1 minimal viable product establishes basic design patterns without feature bloat.

## Milestone 0: CSS Loads Proof
Here is the required screenshot proving that CSS variables, buttons, and card styling successfully apply to the initial Scaffold without Tailwind or PostCSS configuring.

![M0 CSS Proof Screenshot](screenshot.png)

## Architecture Limitations (Decisions)
Please see our [DECISIONS.md](DECISIONS.md) file directly for documented reasons regarding:
*   ID generation on Import
*   Persistence Guarantees
*   Garbage Collection behavior on Orphan Images

## Building Locally
*   `npm install`
*   `npm run dev` (Runs Vite server on port 5174)
