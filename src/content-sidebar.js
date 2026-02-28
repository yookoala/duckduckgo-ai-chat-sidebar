// Content script injected into duck.ai.
// When running inside the sidebar (window.name is "duck_ai_sidebar"),
// focus the chat textarea as soon as it appears so the user can type immediately.

if (window.name === "duck_ai_sidebar") {
  const focusTextarea = () => {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      // window.focus() requests OS-level keyboard focus for this browsing
      // context (the sidebar panel). Must be called from page script context
      // (not privileged moz-extension:// context) to have any effect.
      window.focus();
      // click() + focus() together give the strongest signal: click() is
      // treated as a user gesture which bypasses browser focus-stealing guards.
      textarea.click();
      textarea.focus();
      return true;
    }
    return false;
  };

  if (!focusTextarea()) {
    const observer = new MutationObserver(() => {
      if (focusTextarea()) {
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}
