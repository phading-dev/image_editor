import { setViewport } from "@selfage/puppeteer_test_executor_api";

export async function setDesktopViewPort(): Promise<void> {
  await setViewport(1600, 900);
}

export async function setTabletViewPort(): Promise<void> {
  await setViewport(800, 900);
}

export async function setMobileViewPort(): Promise<void> {
  await setViewport(400, 900);
}
