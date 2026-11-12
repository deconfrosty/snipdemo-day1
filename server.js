const { randomBytes } = require("node:crypto");
const { existsSync, realpathSync, statSync } = require("node:fs");
const { extname, isAbsolute, relative, resolve, sep } = require("node:path");

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
const configuredBaseUrl =
  process.env.BASE_URL ||
  (railwayDomain ? `https://${railwayDomain}` : `http://localhost:${port}`);
const baseUrl = new URL(configuredBaseUrl).origin;
if (!["http:", "https:"].includes(new URL(baseUrl).protocol)) {
  throw new Error("BASE_URL must use http or https");
}

const links = new Map();
const publicRoot = process.env.PUBLIC_DIR
  ? resolve(process.env.PUBLIC_DIR)
  : null;
const base62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function makeCode() {
  let code;
  do {
    code = "";
    while (code.length < 6) {
      for (const byte of randomBytes(16)) {
        if (byte < 248) code += base62[byte % base62.length];
        if (code.length === 6) break;
      }
    }
  } while (links.has(code));
  return code;
}

function staticFile(pathname) {
  if (!publicRoot) return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath =
    decodedPath === "/" ? "index.html" : decodedPath.replace(/^[/\\]+/, "");
  const candidate = resolve(publicRoot, relativePath);
  const pathFromRoot = relative(publicRoot, candidate);
  if (
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot) ||
    !existsSync(candidate)
  ) {
    return null;
  }

  let realPath;
  try {
    realPath = realpathSync(candidate);
    const realRelativePath = relative(realpathSync(publicRoot), realPath);
    if (
      realRelativePath === ".." ||
      realRelativePath.startsWith(`..${sep}`) ||
      isAbsolute(realRelativePath) ||
      !statSync(realPath).isFile()
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return { path: realPath, type: contentTypes[extname(realPath).toLowerCase()] };
}

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    let response;

    if (method === "OPTIONS") {
      response = new Response(null, { status: 204 });
    } else if (method === "POST" && url.pathname === "/api/links") {
      let body;
      try {
        body = await request.json();
      } catch {
        response = jsonResponse({ error: "Request body must be valid JSON" }, 400);
        return withCors(response);
      }

      let destination;
      try {
        if (typeof body?.url !== "string") throw new Error();
        destination = new URL(body.url);
        if (!["http:", "https:"].includes(destination.protocol)) throw new Error();
      } catch {
        response = jsonResponse(
          { error: "url must be a valid http or https URL" },
          400,
        );
        return withCors(response);
      }

      const code = makeCode();
      const link = {
        code,
        url: destination.href,
        shortUrl: `${baseUrl}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      links.set(code, link);
      response = jsonResponse(link, 201);
    } else if (method === "GET" && url.pathname === "/api/links") {
      response = jsonResponse([...links.values()].map((link) => ({ ...link })));
    } else if (method === "GET" || method === "HEAD") {
      const file = staticFile(url.pathname);
      if (file) {
        const headers = new Headers();
        if (file.type) headers.set("Content-Type", file.type);
        const body = method === "HEAD" ? null : Bun.file(file.path);
        response = new Response(body, { headers });
      } else {
        let code;
        try {
          code = decodeURIComponent(url.pathname.slice(1));
        } catch {
          code = null;
        }
        const link = code === null ? null : links.get(code);
        if (!link || code.includes("/")) {
          response = jsonResponse({ error: "Link not found" }, 404);
        } else {
          link.hits += 1;
          response = new Response(null, {
            status: 302,
            headers: { Location: link.url },
          });
        }
      }
    } else {
      response = jsonResponse({ error: "Not found" }, 404);
    }

    return withCors(response);
  },
});

console.log(`Snip backend listening on http://localhost:${port}`);
