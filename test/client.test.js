import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { MAX_ENVELOPE_BYTES } from "../web/js/vault-format.js";

const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
const source = readFileSync(new URL("../web/js/app.js", import.meta.url), "utf8");

test("locking clears all fields and ignores work that finishes after lock", async () => {
  const nodes = new Map();
  const createNode = (id) => ({
    id, value: "", textContent: "", hidden: false, dataset: {}, listeners: new Map(),
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    cloneNode() { return createNode(id); },
    replaceWith(next) { nodes.set(id, next); },
    replaceChildren(...children) { this.children = children; },
    focus() {},
  });
  for (const [, id] of html.matchAll(/\sid="([^"]+)"/g)) nodes.set(id, createNode(id));
  const document = {
    hidden: false,
    querySelectorAll: () => nodes.values(),
    addEventListener(type, listener) { this[type] = listener; },
  };
  const window = { addEventListener(type, listener) { this[type] = listener; } };
  let completeRequest;
  let observedSignal;
  let locked = false;
  let finishDeriving;
  let decrypted = false;
  let fireIdleTimer;
  const token = `v1.1700000000.${"A".repeat(22)}.${"A".repeat(43)}`;
  const sessionResponse = () => Response.json({ token });
  runInNewContext(source.replace(/^import .+\r?\n/gm, ""), {
    document, window, location: { origin: "http://127.0.0.1:8765" }, isSecureContext: true,
    crypto, MAX_ENVELOPE_BYTES, URL, TextDecoder, AbortSignal, AbortController,
    setTimeout(callback, delay) {
      assert.equal(delay, 60_000);
      fireIdleTimer = callback;
      return 1;
    },
    clearTimeout() {},
    validateEnvelope: () => true,
    deriveKey: () => new Promise((resolve) => { finishDeriving = resolve; }),
    openVault() { decrypted = true; return []; },
    async fetch(url, options) {
      assert.equal(options.credentials, "omit");
      assert.equal(options.cache, "no-store");
      assert.equal(options.redirect, "error");
      assert.ok(!options.body?.includes("private master password"));
      if (url.endsWith("/api/session") && !locked) {
        observedSignal = options.signal;
        return new Promise((resolve) => { completeRequest = resolve; });
      }
      if (url.endsWith("/api/session")) return sessionResponse();
      return Response.json({ salt: "test-salt" }, { headers: { ETag: '"1"' } });
    },
  });

  function fillConnection() {
    nodes.get("worker-url").value = "https://notes.example.com";
    nodes.get("access-password").value = "test-only-access-password";
  }
  const click = (id) => nodes.get(id).listeners.get("click")();

  fillConnection();
  const staleRequest = click("connect");
  window.blur();
  assert.equal(observedSignal.aborted, true);
  completeRequest(sessionResponse());
  await staleRequest;
  assert.equal(nodes.get("unlock-fields").hidden, true);
  assert.equal(nodes.get("worker-url").value, "");
  assert.equal(nodes.get("access-password").value, "");

  locked = true;
  fillConnection();
  await click("connect");
  assert.equal(nodes.get("unlock-fields").hidden, false);
  nodes.get("password").value = "private master password";
  const staleDerivation = click("unlock");
  assert.equal(nodes.get("password").value, "");
  document.hidden = true;
  document.visibilitychange();
  finishDeriving({});
  await staleDerivation;
  assert.equal(decrypted, false);
  assert.equal(nodes.get("workspace").hidden, true);
  assert.equal(nodes.get("unlock-fields").hidden, true);
  assert.equal(nodes.get("note-body").value, "");

  document.hidden = false;
  fillConnection();
  document.input({ target: nodes.get("access-password") });
  fireIdleTimer();
  assert.equal(nodes.get("worker-url").value, "");
  assert.equal(nodes.get("access-password").value, "");
});
