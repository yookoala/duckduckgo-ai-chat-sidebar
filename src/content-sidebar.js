// Content script injected into duck.ai.
// When running inside the sidebar (window.name is "duck_ai_sidebar"),
// focus the chat textarea as soon as it appears so the user can type immediately.

if (window.name === "duck_ai_sidebar") {
  const focusTextarea = () => {
    const textarea = document.querySelector("textarea");
    if (textarea) {
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
