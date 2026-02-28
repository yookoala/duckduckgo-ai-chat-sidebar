// Dev-helper content script injected into the Playwright bridge page (localhost).
// Exposes window.devHelper(message) in the page realm via exportFunction so
// Playwright's page.evaluate() can call it and await the result.

const port = browser.runtime.connect({ name: "bridge-cs" });

// Map of in-flight requests: correlationId → { resolve, reject }
const pending = new Map();

port.onMessage.addListener((msg) => {
  const handler = pending.get(msg.id);
  if (!handler) return;
  pending.delete(msg.id);
  if (msg.error) {
    handler.reject(msg.error);
  } else {
    // Primitives (boolean, number, string, null) cross realms safely.
    // Objects/arrays from the content-script sandbox must be cloned into the
    // page realm first, otherwise Firefox's XPCNativeWrapper swallows them.
    const result = msg.result;
    const safe = (result !== null && typeof result === "object")
      ? cloneInto(result, window)
      : result;
    handler.resolve(safe);
  }
});

port.onDisconnect.addListener(() => {
  for (const [, h] of pending) h.reject("dev-helper background disconnected");
  pending.clear();
});

function devHelper(message) {
  // Return a page-realm Promise so Playwright can natively await it.
  return new window.Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    pending.set(id, { resolve, reject });
    port.postMessage({ id, ...message });
  });
}

exportFunction(devHelper, window, { defineAs: "devHelper" });
