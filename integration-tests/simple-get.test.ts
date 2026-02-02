/** Make simple requests (GET, POST, PUT, etc.) to actual Canvas */
import { CanvasApi, CanvasApiResponseError } from "@kth/canvas-api";
import { z } from "zod";

const accountSchema = z.object({
  id: z.number(),
  name: z.string(),
  workflow_state: z.string(),
});

const enrollmentsSchema = z.array(
  z.object({
    role_id: z.number(),
  }),
);

describe("GET requests without parameters", () => {
  it("Should fail if no token is given", async () => {
    const client = new CanvasApi(process.env.CANVAS_API_URL!, "");

    expect(() => client.get("accounts/1")).rejects.toThrowError(
      CanvasApiResponseError,
    );
  }, 10000);

  it("Should not fail if token is given", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );
    const { json, statusCode } = await client.get("accounts/1");
    expect(statusCode).toBe(200);
    expect(accountSchema.parse(json)).toMatchInlineSnapshot(`
      {
        "id": 1,
        "name": "KTH Royal Institute of Technology",
        "workflow_state": "active",
      }
    `);
  }, 10000);
});

describe("GET requests with query parameters", () => {
  it("should return right results", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    const enrollments = await client
      .get("courses/1/enrollments", { role_id: [3, 6], per_page: 50 })
      .then((r) => enrollmentsSchema.parse(r.json));

    const uniqueRoles = new Set(enrollments.map((e) => e.role_id));

    expect(uniqueRoles.size).toBe(2);
    expect(uniqueRoles.has(3)).toBeTruthy();
    expect(uniqueRoles.has(6)).toBeTruthy();
  }, 10000);
});

const courseSchema = z.object({
  id: z.number(),
  name: z.string(),
});

describe("Pagination with listItems()", () => {
  it("should return items from multiple pages", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Use per_page=2 to force pagination, then collect items
    const items = await client
      .listItems("accounts/1/courses", { per_page: 2 })
      .take(5)
      .toArray();

    // Should have collected items (up to 5)
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(5);

    // Validate each item matches expected schema
    for (const item of items) {
      expect(courseSchema.safeParse(item).success).toBe(true);
    }
  }, 30000);

  it("should work with filter and map", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Get course IDs only, filtering for those with id > 0
    const courseIds = await client
      .listItems("accounts/1/courses", { per_page: 5 })
      .filter((course: { id: number }) => course.id > 0)
      .map((course: { id: number }) => course.id)
      .take(3)
      .toArray();

    expect(courseIds.length).toBeGreaterThan(0);
    expect(courseIds.length).toBeLessThanOrEqual(3);

    // All IDs should be positive numbers
    for (const id of courseIds) {
      expect(typeof id).toBe("number");
      expect(id).toBeGreaterThan(0);
    }
  }, 30000);
});

describe("take() method", () => {
  it("should limit the number of results returned", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    const items = await client
      .listItems("accounts/1/courses", { per_page: 10 })
      .take(3)
      .toArray();

    // Should have exactly 3 items (or less if fewer exist)
    expect(items.length).toBeLessThanOrEqual(3);
  }, 20000);

  it("should stop pagination early when limit is reached", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Request only 1 item with small page size
    const items = await client
      .listItems("accounts/1/courses", { per_page: 1 })
      .take(1)
      .toArray();

    expect(items.length).toBe(1);
    expect(courseSchema.safeParse(items[0]).success).toBe(true);
  }, 20000);
});

describe("Error handling for 404 responses", () => {
  it("should throw CanvasApiResponseError for non-existent resource", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    await expect(client.get("accounts/999999999")).rejects.toThrow(
      CanvasApiResponseError,
    );
  }, 10000);

  it("should include status code in error response", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    try {
      await client.get("courses/999999999");
      fail("Expected CanvasApiResponseError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CanvasApiResponseError);
      if (error instanceof CanvasApiResponseError) {
        expect(error.response.statusCode).toBe(404);
      }
    }
  }, 10000);
});
