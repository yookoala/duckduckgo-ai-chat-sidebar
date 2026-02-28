// Background service worker for the main Duck.ai Chat Sidebar extension.
// Responds to cross-extension isOpen queries from the dev-helper during testing.
browser.runtime.onMessageExternal.addListener((message, _sender) => {
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
