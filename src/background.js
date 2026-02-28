// Background service worker for the main Duck.ai Chat Sidebar extension.
// Responds to cross-extension queries from the dev-helper during testing.
// The listener is restricted to the known dev-helper extension ID — Firefox
// populates sender.id from its own extension registry and it cannot be spoofed.
const DEV_HELPER_ID = "dev-helper@duck-ai-sidebar.test";

browser.runtime.onMessageExternal.addListener((message, sender) => {
  if (sender.id !== DEV_HELPER_ID) return;
  if (message?.action === "isOpen") {
    return browser.sidebarAction.isOpen({});
  }
  if (message?.action === "open") {
    return browser.sidebarAction.open()
      .then(() => ({ ok: true }))
      .catch((err) => ({ ok: false, error: String(err?.message ?? err) }));
  }
  if (message?.action === "close") {
    return browser.sidebarAction.close()
      .then(() => ({ ok: true }))
      .catch((err) => ({ ok: false, error: String(err?.message ?? err) }));
  }
});
