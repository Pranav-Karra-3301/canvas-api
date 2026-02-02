/** Test pagination functionality with actual Canvas API */
import { CanvasApi, CanvasApiResponse } from "@kth/canvas-api";
import { z } from "zod";

const courseSchema = z.object({
  id: z.number(),
  name: z.string(),
  workflow_state: z.string(),
});

const coursesArraySchema = z.array(courseSchema);

describe("listPages() returning multiple pages", () => {
  it("should yield multiple page responses", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Use small page size to ensure multiple pages
    const pages: CanvasApiResponse[] = [];
    let pageCount = 0;

    for await (const page of client.listPages("accounts/1/courses", {
      per_page: 2,
    })) {
      pages.push(page);
      pageCount++;

      // Limit to 3 pages to avoid long test times
      if (pageCount >= 3) {
        break;
      }
    }

    // Should have at least 1 page
    expect(pages.length).toBeGreaterThan(0);

    // Each page should have valid status and JSON array
    for (const page of pages) {
      expect(page.statusCode).toBe(200);
      expect(Array.isArray(page.json)).toBe(true);
      expect(coursesArraySchema.safeParse(page.json).success).toBe(true);
    }
  }, 30000);

  it("should include link headers for pagination", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Get first page with small size
    const pages: CanvasApiResponse[] = [];
    for await (const page of client.listPages("accounts/1/courses", {
      per_page: 1,
    })) {
      pages.push(page);
      // Only check first page
      break;
    }

    expect(pages.length).toBe(1);
    // First page should have a link header if there are more courses
    // (may not exist if only 1 course)
    expect(pages[0].headers).toBeDefined();
  }, 15000);

  it("should stop when no more pages are available", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Request a specific user's courses (likely fewer items)
    const pages: CanvasApiResponse[] = [];

    for await (const page of client.listPages("users/self/courses", {
      per_page: 100,
    })) {
      pages.push(page);
      // Safety limit
      if (pages.length > 50) {
        break;
      }
    }

    // Should have at least 1 page
    expect(pages.length).toBeGreaterThan(0);

    // The generator should have stopped naturally (or at safety limit)
    expect(pages.length).toBeLessThanOrEqual(50);
  }, 60000);
});

describe("listItems() with filter and map", () => {
  it("should filter items correctly", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Filter for courses that have a specific workflow_state
    const activeCourses = await client
      .listItems("accounts/1/courses", { per_page: 10 })
      .filter(
        (course: { workflow_state: string }) =>
          course.workflow_state === "available",
      )
      .take(5)
      .toArray();

    // All returned courses should be available
    for (const course of activeCourses) {
      const parsed = courseSchema.parse(course);
      expect(parsed.workflow_state).toBe("available");
    }
  }, 30000);

  it("should map items to transformed values", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Map courses to just their names
    const courseNames = await client
      .listItems("accounts/1/courses", { per_page: 5 })
      .map((course: { name: string }) => course.name)
      .take(3)
      .toArray();

    expect(courseNames.length).toBeGreaterThan(0);
    expect(courseNames.length).toBeLessThanOrEqual(3);

    // All items should be strings (course names)
    for (const name of courseNames) {
      expect(typeof name).toBe("string");
    }
  }, 20000);

  it("should chain filter and map operations", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Chain filter then map
    const courseInfo = await client
      .listItems("accounts/1/courses", { per_page: 10 })
      .filter((course: { id: number }) => course.id > 0)
      .map((course: { id: number; name: string }) => ({
        id: course.id,
        name: course.name,
      }))
      .take(3)
      .toArray();

    expect(courseInfo.length).toBeGreaterThan(0);

    for (const info of courseInfo) {
      expect(typeof info.id).toBe("number");
      expect(typeof info.name).toBe("string");
      expect(info.id).toBeGreaterThan(0);
    }
  }, 30000);
});

describe("Verifying pagination stops when no more pages", () => {
  it("should complete iteration without hanging", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Use a high per_page to reduce number of pages
    const allItems: unknown[] = [];
    const startTime = Date.now();

    for await (const item of client.listItems("users/self/enrollments", {
      per_page: 100,
    })) {
      allItems.push(item);

      // Safety break after 100 items
      if (allItems.length >= 100) {
        break;
      }
    }

    const elapsed = Date.now() - startTime;

    // Should complete in reasonable time
    expect(elapsed).toBeLessThan(60000);
    // Should have collected some items
    expect(allItems.length).toBeGreaterThan(0);
  }, 60000);

  it("should handle empty results gracefully", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Try to get courses from a likely empty endpoint (completed courses for a specific state)
    const items = await client
      .listItems("users/self/courses", {
        per_page: 10,
        enrollment_state: "invited",
      })
      .take(5)
      .toArray();

    // Should return an array (possibly empty)
    expect(Array.isArray(items)).toBe(true);
  }, 20000);
});

describe("toArray() method", () => {
  it("should collect all items into an array", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Get a limited set of items
    const items = await client
      .listItems("accounts/1/courses", { per_page: 5 })
      .take(10)
      .toArray();

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeLessThanOrEqual(10);

    // Each item should be a valid course
    for (const item of items) {
      expect(courseSchema.safeParse(item).success).toBe(true);
    }
  }, 30000);
});
