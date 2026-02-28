// Dev-helper content script injected into duck.ai pages.
// Guards on window.name so it only activates when loaded inside the extension's
// sidebar (where sidebar.html sets window.name = "duck_ai_sidebar" before redirect).
// Normal duck.ai tabs opened by the user are silently ignored.

if (window.name !== "duck_ai_sidebar") {
  // Not the sidebar context — do nothing.
} else {
  const port = browser.runtime.connect({ name: "sidebar-duck-cs" });

  port.onMessage.addListener((msg) => {
    const { id, action } = msg;

    if (action === "ping") {
      port.postMessage({
        id,
        result: {
          alive: true,
          location: window.location.href,
          windowName: window.name,
        },
      });
      return;
    }

    if (action === "uiReady") {
      // Check if duck.ai's chat input is present in the DOM.
      const input =
        document.querySelector("textarea") ||
        document.querySelector("[contenteditable='true']");
      port.postMessage({ id, result: !!input });
      return;
    }
  });
}
