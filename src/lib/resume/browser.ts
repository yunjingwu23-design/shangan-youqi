import { chromium as playwright } from "playwright-core";
import { existsSync } from "node:fs";
export async function launchResumeBrowser() {
  if (!process.env.VERCEL) {
    const executable =
      process.env.RESUME_CHROMIUM_EXECUTABLE_PATH ||
      [
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/google-chrome",
      ].find((p) => existsSync(p));
    if (executable)
      return playwright.launch({
        executablePath: executable,
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      });
  }
  const { default: serverChromium } = await import("@sparticuz/chromium");
  return playwright.launch({
    executablePath: await serverChromium.executablePath(),
    args: serverChromium.args,
    headless: true,
  });
}
