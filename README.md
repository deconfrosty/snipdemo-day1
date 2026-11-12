# Snip frontend

Angular 19 client for the Snip URL shortener. The app expects the API at
`http://localhost:3000`, with CORS enabled by the backend.

```sh
npm install
npx ng serve
```

Create and list links in the browser at `http://localhost:4200`. To build the
static app:

```sh
npx ng build
```

The production files are written to `dist/snip-frontend/browser`, which is the
path used by the generated bundle.
