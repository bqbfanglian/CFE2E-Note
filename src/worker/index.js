import { clientOrigin, error, headers } from "./http.js";
import { hasSession, isConfigured, isLoopback, logIn } from "./session.js";
import { handleVault } from "./vault.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname !== "/api/session" && pathname !== "/api/vault") {
      return error(404, "Ciphertext API only");
    }
    if (url.protocol !== "https:" && !isLoopback(url)) return error(403, "HTTPS is required");
    if (request.headers.get("Origin") !== clientOrigin) return error(403, "Origin denied");
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          "Access-Control-Allow-Methods": pathname === "/api/session" ? "POST" : "GET, PUT",
          "Access-Control-Allow-Headers": "Authorization, Content-Type, If-Match, If-None-Match",
        },
      });
    }
    if (!isConfigured(env.APP_PASSWORD)) return error(503, "Access password is not configured");

    try {
      if (pathname === "/api/session") {
        if (request.method !== "POST") return error(405, "Method not allowed", { Allow: "POST" });
        return await logIn(request, url, env);
      }
      if (!await hasSession(request, url, env.APP_PASSWORD)) return error(401, "Sign-in required");
      return await handleVault(request, env.DB);
    } catch {
      return error(500, "Worker request failed");
    }
  },
};
