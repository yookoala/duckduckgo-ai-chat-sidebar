// Dev-helper background service worker.
// Relays messages between the bridge content script (on the Playwright page)
// and the sidebar content script (on duck.ai inside the sidebar).

const MAIN_EXTENSION_ID = "{ddf262fb-721f-419f-85c2-4758156cbeb2}";
const PORT_BRIDGE  = "bridge-cs";
const PORT_SIDEBAR = "sidebar-duck-cs";

// Active ports keyed by name. One of each expected at a time.
const ports = new Map();

browser.runtime.onConnect.addListener((port) => {
  ports.set(port.name, port);
  port.onDisconnect.addListener(() => ports.delete(port.name));

  port.onMessage.addListener(async (msg) => {
    const { id, action } = msg;

    if (action === "isOpen") {
      try {
        const result = await browser.runtime.sendMessage(
          MAIN_EXTENSION_ID,
          { action: "isOpen" }
        );
        port.postMessage({ id, result });
      } catch (err) {
        port.postMessage({ id, error: String(err.message ?? err) });
      }
      return;
    }

    if (action === "open" || action === "close") {
      try {
        const result = await browser.runtime.sendMessage(
          MAIN_EXTENSION_ID,
          { action }
        );
        if (result && result.ok === false) {
          port.postMessage({ id, error: result.error ?? "sidebarAction failed" });
        } else {
          port.postMessage({ id, result: true });
        }
      } catch (err) {
        port.postMessage({ id, error: String(err?.message ?? err ?? "unknown") });
      }
      return;
    }

    if (action === "ping-sidebar" || action === "uiReady") {
      const sidebarPort = ports.get(PORT_SIDEBAR);
      if (!sidebarPort) {
        port.postMessage({ id, error: "sidebar-duck-cs not connected" });
        return;
      }
      // Map action to the command the sidebar CS understands
      const cmd = action === "ping-sidebar" ? "ping" : "uiReady";
      const bridgePort = port;
      const handler = (response) => {
        if (response.id === id) {
          sidebarPort.onMessage.removeListener(handler);
          bridgePort.postMessage({ id, result: response.result });
        }
      };
      sidebarPort.onMessage.addListener(handler);
      sidebarPort.postMessage({ id, action: cmd });
      return;
    }
  });
});
