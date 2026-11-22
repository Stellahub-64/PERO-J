import { test, expect } from "@playwright/test";
import { setup } from "./helpers/deploy.js";

const API_BASE = process.env.INDEXER_URL || "http://localhost:3001";

test.describe("Full pipeline: contract → indexer → API → frontend", () => {
  let contractId;
  let eventDescription;

  /* Before all tests: deploy the contract, submit an event, and wait for
   * the indexer to pick it up.  This runs once per worker. */
  test.beforeAll(async () => {
    const result = await setup({ apiBase: API_BASE });
    contractId = result.contractId;
    eventDescription = result.description;
  });

  test("API returns the indexed event", async () => {
    const res = await fetch(`${API_BASE}/api/events?limit=10`);
    expect(res.ok).toBeTruthy();
    const body = await res.json();
    expect(body.events).toBeDefined();
    expect(Array.isArray(body.events)).toBeTruthy();
    expect(body.events.length).toBeGreaterThanOrEqual(1);

    const ev = body.events[0];
    expect(ev.contract_id).toBe(contractId);
    expect(ev.function).toBeDefined();
    expect(ev.description).toBeDefined();
    expect(ev.ledger).toBeGreaterThan(0);

    /* The description should contain a meaningful human-readable string.
     * Since the explorer ABI was registered, the decoder should match the
     * "decoded" function and produce a formatted description. */
    expect(ev.description.length).toBeGreaterThan(10);
  });

  test("API single-event endpoint returns the event by seq", async () => {
    const listRes = await fetch(`${API_BASE}/api/events?limit=1`);
    const list = await listRes.json();
    const seq = list.events[0].seq;

    const res = await fetch(`${API_BASE}/api/events/${seq}`);
    expect(res.ok).toBeTruthy();
    const ev = await res.json();
    expect(ev.seq).toEqual(seq);
  });

  test("Frontend home page shows the event list", async ({ page }) => {
    await page.goto("/");

    /* Wait for the table to render rows */
    await page.waitForSelector("table tbody tr", { timeout: 30_000 });

    /* Verify the table contains at least one event row (seq links are #N) */
    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    /* Check that a seq link exists */
    const seqLink = page.locator("table tbody tr a[href^='/event/']").first();
    await expect(seqLink).toBeVisible();
    await expect(seqLink).toContainText(/#\d+/);
  });

  test("Frontend renders event description in the table", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("table tbody tr", { timeout: 30_000 });

    /* The exact seeded description proves decoding reached the UI. */
    await expect(page.locator("table tbody")).toContainText(eventDescription);
  });

  test("Frontend event detail page shows full event data", async ({ page }) => {
    /* Get a seq number from the API */
    const res = await fetch(`${API_BASE}/api/events?limit=1`);
    const body = await res.json();
    const seq = body.events[0].seq;
    const description = body.events[0].description;

    /* Navigate to the event detail page */
    await page.goto(`/event/${seq}`);

    /* Verify the page renders without error — look for the description text */
    await expect(page.locator(`text=${description}`).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Contract metadata is accessible from the frontend", async ({ page }) => {
    /* Find the contract ID from the event list */
    const res = await fetch(`${API_BASE}/api/events?limit=1`);
    const body = await res.json();
    const cid = body.events[0].contract_id;

    await page.goto(`/contract/${cid}`);

    /* The contract page should show the name we registered */
    const heading = page.locator("h1, h2", { hasText: /PERO-J Explorer|Explorer/i });
    await expect(heading.first()).toBeVisible({ timeout: 15_000 });
  });

  test("Frontend pagination controls are functional", async ({ page }) => {
    await page.goto("/");

    /* Wait for at least one row */
    await page.waitForSelector("table tbody tr a[href^='/event/']", { timeout: 30_000 });

    /* Pagination buttons exist */
    const prevButton = page.getByRole("button", { name: /prev/i });
    const nextButton = page.getByRole("button", { name: /next/i });

    /* Page 1 — prev should be disabled */
    await expect(prevButton).toBeDisabled();

    /* If we have more than one page, next should be enabled and clickable */
    const isNextEnabled = await nextButton.isEnabled();
    if (isNextEnabled) {
      await nextButton.click();
      /* After navigating, we should still see the table */
      await page.waitForSelector("table tbody tr", { timeout: 15_000 });
    }
  });
});
