import path from "path";
import { test, expect } from "@playwright/test";
import { firefox } from "playwright";
// @ts-ignore — no types bundled with playwright-webextext 0.0.4
import { withExtension } from "playwright-webextext";
import type { Browser } from "playwright";

const MAIN_EXT   = path.resolve(__dirname, "../dist/firefox");
const DEV_HELPER = path.resolve(__dirname, "dev-helper");

// ── Shared browser instance ──────────────────────────────────────────────────
// We use launch() (not launchPersistentContext) to avoid a bug in
// playwright-webextext@0.0.4 that crashes when manifest.optional_permissions
// is absent. Temporary addons installed via Firefox RDP have all permissions
// granted by default, so content scripts work without the overridePermissions
// workaround.

let browser: Browser;

test.beforeAll(async () => {
  browser = await withExtension(firefox, [MAIN_EXT, DEV_HELPER])
    .launch({ headless: true });
});

test.afterAll(async () => {
  await browser.close();
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Open a new page that content-bridge.js is injected into.
 * We intercept http://localhost/ and serve a blank HTML page so there is no
 * dependency on a running server, while the URL still matches the content
 * script's "http://localhost/*" pattern.
 */
async function getBridgePage() {
  const page = await browser.newPage();
  await page.route("http://localhost/*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!DOCTYPE html><html><body></body></html>",
    })
  );
  await page.goto("http://localhost/bridge");
  // Wait for exportFunction to place window.devHelper on the real window.
  await page.waitForFunction(
    () => typeof (window as any).devHelper === "function",
    { timeout: 8_000 }
  );
  return page;
}

/**
 * Poll devHelper({ action: "isOpen" }) until it returns the expected value or
 * we time out.
 */
async function waitForIsOpen(
  page: import("playwright").Page,
  expected: boolean,
  timeout = 10_000
) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const open: boolean = await page.evaluate(
      () => (window as any).devHelper({ action: "isOpen" })
    );
    if (open === expected) return;
    await page.waitForTimeout(400);
  }
  throw new Error(`Timed out waiting for isOpen === ${expected}`);
}

// ── Tests ────────────────────────────────────────────────────────────────────

test("bridge content script is injected and devHelper is callable", async () => {
  const page = await getBridgePage();
  try {
    // devHelper was already awaited in getBridgePage — if we get here it works.
    const isOpen: boolean = await page.evaluate(
      () => (window as any).devHelper({ action: "isOpen" })
    );
    expect(typeof isOpen).toBe("boolean");
  } finally {
    await page.close();
  }
});

test("sidebar is closed by default", async () => {
  const page = await getBridgePage();
  try {
    const isOpen: boolean = await page.evaluate(
      () => (window as any).devHelper({ action: "isOpen" })
    );
    expect(isOpen).toBe(false);
  } finally {
    await page.close();
  }
});

test("duck.ai loads in simulated sidebar tab and sidebar CS responds to ping", async () => {
  // sidebarAction.open() requires a user gesture that cannot be synthesised
  // via Playwright's Juggler protocol (the user-gesture token does not propagate
  // through port.postMessage to the extension background). Instead we open
  // duck.ai in a plain tab with window.name pre-set via addInitScript — the
  // exact same code path the real sidebar uses (sidebar.html sets window.name
  // before the meta-refresh redirect), so the test covers all content-script
  // integration without touching browser chrome.
  //
  // Root-cause note: objects/arrays returned by the content-script must be
  // cloneInto()'d into the page realm before resolving the window.Promise;
  // otherwise Firefox's XPCNativeWrapper silently drops them. The fix lives in
  // content-bridge.js.
  test.slow();
  const bridgePage = await getBridgePage();
  const duckPage = await browser.newPage();
  try {
    // Pre-seed window.name so content-sidebar.js recognises this tab as the sidebar.
    await duckPage.addInitScript(() => { window.name = "duck_ai_sidebar"; });
    await duckPage.goto("https://duck.ai/", { waitUntil: "domcontentloaded" });

    // Poll until the sidebar CS connects its port and answers a ping.
    // duck.ai may do a brief SPA transition after domcontentloaded, so the
    // content script can connect slightly later than the page load signals.
    let response: { alive: boolean; location: string; windowName: string } | undefined;
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      try {
        const result = await bridgePage.evaluate(
          () => (window as any).devHelper({ action: "ping-sidebar" })
        );
        if (result?.alive) { response = result; break; }
      } catch (_) { /* sidebar CS not connected yet */ }
      await bridgePage.waitForTimeout(500);
    }

    expect(response?.alive).toBe(true);
    expect(response?.location).toContain("duck.ai");
    expect(response?.windowName).toBe("duck_ai_sidebar");
  } finally {
    await duckPage.close();
    await bridgePage.close();
  }
});

test("sidebar opens when keyboard shortcut is pressed", async () => {
  // FIXME: Playwright's Firefox (Juggler protocol) sends keyboard events to the
  // web page's DOM via nsIDOMWindowUtils.sendKeyEvent(), which runs in the
  // content process. Firefox extension keyboard commands (_execute_sidebar_action)
  // are processed at the browser process level before events reach web content.
  // Therefore page.keyboard.press() cannot trigger extension shortcuts.
  // This test documents the intended behaviour; promote it once a programmatic
  // mechanism to open the sidebar is found (e.g. via a future RDP command).
  test.fixme();
  const page = await getBridgePage();
  try {
    await page.keyboard.press("Control+Alt+c");
    await waitForIsOpen(page, true);
    const isOpen: boolean = await page.evaluate(
      () => (window as any).devHelper({ action: "isOpen" })
    );
    expect(isOpen).toBe(true);
  } finally {
    await page.keyboard.press("Control+Alt+c").catch(() => {/* ignore */});
    await page.close();
  }
});

test("duck.ai loads inside the sidebar and sidebar CS responds to ping", async () => {
  // FIXME: Depends on T3 being able to open the sidebar programmatically.
  // See T3 fixme comment for context.
  test.fixme();
  test.slow();
  const page = await getBridgePage();
  try {
    await page.keyboard.press("Control+Alt+c");
    await waitForIsOpen(page, true);
    await page.waitForTimeout(6_000);
    const response: { alive: boolean; location: string; windowName: string } =
      await page.evaluate(
        () => (window as any).devHelper({ action: "ping-sidebar" })
      );
    expect(response.alive).toBe(true);
    expect(response.location).toContain("duck.ai");
    expect(response.windowName).toBe("duck_ai_sidebar");
  } finally {
    await page.keyboard.press("Control+Alt+c").catch(() => {/* ignore */});
    await page.close();
  }
});

test("sidebar closes on second keyboard shortcut press", async () => {
  // FIXME: Depends on T3 being able to open the sidebar programmatically.
  // See T3 fixme comment for context.
  test.fixme();
  const page = await getBridgePage();
  try {
    await page.keyboard.press("Control+Alt+c");
    await waitForIsOpen(page, true);
    await page.keyboard.press("Control+Alt+c");
    await waitForIsOpen(page, false);
    const isOpen: boolean = await page.evaluate(
      () => (window as any).devHelper({ action: "isOpen" })
    );
    expect(isOpen).toBe(false);
  } finally {
    await page.close();
  }
});
