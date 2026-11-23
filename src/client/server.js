import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { clientOrigin } from "../worker/http.js";

const address = new URL(clientOrigin);
const sources = [
  ["/", "index.html", "text/html; charset=utf-8"],
  ["/css/styles.css", "css/styles.css", "text/css; charset=utf-8"],
  ["/js/app.js", "js/app.js", "text/javascript; charset=utf-8"],
  ["/js/crypto.js", "js/crypto.js", "text/javascript; charset=utf-8"],
  ["/js/vault-format.js", "js/vault-format.js", "text/javascript; charset=utf-8"],
];
const files = new Map(await Promise.all(sources.map(async ([path, file, type]) =>
  [path, { type, body: await readFile(new URL(`../../web/${file}`, import.meta.url)) }]
)));

const headers = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src https: http://127.0.0.1:8787; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const server = createServer((request, response) => {
  if (request.headers.host !== address.host) {
    response.writeHead(421, headers).end();
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { ...headers, Allow: "GET, HEAD" }).end();
    return;
  }
  const file = files.get(request.url);
  if (!file) {
    response.writeHead(404, headers).end();
    return;
  }
  response.writeHead(200, { ...headers, "Content-Type": file.type });
  response.end(request.method === "HEAD" ? undefined : file.body);
});

server.listen(Number(address.port), address.hostname, () => {
  console.log(`密记本地客户端：${clientOrigin}/`);
});
