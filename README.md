# Snip backend

A zero-dependency Bun URL shortener API. Links are stored in memory and are
cleared when the server restarts.

## Run

```sh
bun start
```

The server listens on port `3000` by default. Set `PORT` to change it and
`BASE_URL` to choose the origin used in generated short URLs. If `BASE_URL` is
unset, `RAILWAY_PUBLIC_DOMAIN` is used when available; otherwise the origin is
`http://localhost:<PORT>`.

Set `PUBLIC_DIR` to serve static files from a directory. `/` serves
`index.html`, and existing files take precedence over short codes.

## API

- `POST /api/links` with `{"url":"https://example.com"}` creates a link.
- `GET /api/links` lists links.
- `GET /:code` redirects to the original URL and increments its hit count.
