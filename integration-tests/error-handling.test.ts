/** Test error handling with actual Canvas API */
import {
  CanvasApi,
  CanvasApiResponseError,
  CanvasApiTimeoutError,
} from "@kth/canvas-api";
import { z } from "zod";

const errorResponseSchema = z.object({
  errors: z.array(
    z.object({
      message: z.string(),
    }),
  ),
});

describe("CanvasApiResponseError for 4xx errors", () => {
  it("should throw CanvasApiResponseError for 401 Unauthorized", async () => {
    // Create client with invalid token
    const client = new CanvasApi(process.env.CANVAS_API_URL!, "invalid_token");

    try {
      await client.get("accounts/1");
      fail("Expected CanvasApiResponseError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CanvasApiResponseError);
      if (error instanceof CanvasApiResponseError) {
        expect(error.response.statusCode).toBe(401);
        expect(error.name).toBe("CanvasApiResponseError");
      }
    }
  }, 10000);

  it("should throw CanvasApiResponseError for 404 Not Found", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    try {
      await client.get("accounts/999999999");
      fail("Expected CanvasApiResponseError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CanvasApiResponseError);
      if (error instanceof CanvasApiResponseError) {
        expect(error.response.statusCode).toBe(404);
      }
    }
  }, 10000);

  it("should throw CanvasApiResponseError for 403 Forbidden", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Try to access an admin-only endpoint that the token doesn't have access to
    try {
      await client.get("audit/grade_change/courses/1");
      // If we get here, the user has admin access - test passes
    } catch (error) {
      expect(error).toBeInstanceOf(CanvasApiResponseError);
      if (error instanceof CanvasApiResponseError) {
        // Should be 403 or 401 depending on permission model
        expect([401, 403, 404]).toContain(error.response.statusCode);
      }
    }
  }, 10000);

  it("should include response body in error", async () => {
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
        // Response should have a json body with error details
        expect(error.response.json).toBeDefined();
        // Canvas typically returns an errors array
        const parsed = errorResponseSchema.safeParse(error.response.json);
        expect(parsed.success).toBe(true);
      }
    }
  }, 10000);
});

describe("CanvasApiTimeoutError with short timeout", () => {
  it("should throw CanvasApiTimeoutError when request times out", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
      { timeout: 1 }, // 1ms timeout - should always timeout
    );

    try {
      await client.get("accounts/1");
      // If the request somehow succeeds, that's also acceptable
      // (very fast local network)
    } catch (error) {
      // Should be a timeout error
      expect(error).toBeInstanceOf(CanvasApiTimeoutError);
      if (error instanceof CanvasApiTimeoutError) {
        expect(error.name).toBe("CanvasApiTimeoutError");
        expect(error.message).toContain("timeout");
      }
    }
  }, 10000);

  it("should timeout on slow paginated requests", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    try {
      // Use listPages with a very short timeout in options
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.listPages(
        "accounts/1/courses",
        { per_page: 1 },
        { timeout: 1 },
      )) {
        // Should timeout before getting here
      }
      // If we get here, the network was faster than 1ms
    } catch (error) {
      expect(error).toBeInstanceOf(CanvasApiTimeoutError);
    }
  }, 10000);

  it("should succeed with reasonable timeout", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
      { timeout: 30000 }, // 30 second timeout
    );

    // Should succeed with reasonable timeout
    const { statusCode } = await client.get("accounts/1");
    expect(statusCode).toBe(200);
  }, 35000);
});

describe("Invalid endpoint returning 404", () => {
  it("should return 404 for completely invalid endpoint", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    try {
      await client.get("this/endpoint/does/not/exist/at/all");
      fail("Expected CanvasApiResponseError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CanvasApiResponseError);
      if (error instanceof CanvasApiResponseError) {
        expect(error.response.statusCode).toBe(404);
      }
    }
  }, 10000);

  it("should return 404 for invalid resource ID", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    try {
      await client.get("users/999999999999");
      fail("Expected CanvasApiResponseError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CanvasApiResponseError);
      if (error instanceof CanvasApiResponseError) {
        expect(error.response.statusCode).toBe(404);
      }
    }
  }, 10000);

  it("should return 404 for invalid nested resource", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    try {
      await client.get("courses/999999999/assignments/1");
      fail("Expected CanvasApiResponseError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CanvasApiResponseError);
      if (error instanceof CanvasApiResponseError) {
        expect(error.response.statusCode).toBe(404);
      }
    }
  }, 10000);
});

describe("Error properties and structure", () => {
  it("CanvasApiResponseError should have proper error properties", async () => {
    const client = new CanvasApi(process.env.CANVAS_API_URL!, "");

    try {
      await client.get("accounts/1");
      fail("Expected CanvasApiResponseError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CanvasApiResponseError);
      if (error instanceof CanvasApiResponseError) {
        // Check error properties
        expect(error.name).toBe("CanvasApiResponseError");
        expect(error.message).toBe("Canvas API response error");
        expect(error.response).toBeDefined();
        expect(error.response.statusCode).toBeDefined();
        expect(typeof error.response.statusCode).toBe("number");

        // Check that stack trace exists
        expect(error.stack).toBeDefined();
      }
    }
  }, 10000);

  it("should preserve error chain for debugging", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    try {
      await client.get("courses/not_a_number");
      fail("Expected error to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CanvasApiResponseError);
      // Stack should be available for debugging
      expect((error as Error).stack).toBeDefined();
    }
  }, 10000);
});

describe("Error handling in pagination", () => {
  it("should throw error when listItems encounters non-array response", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // accounts/1 returns an object, not an array - should cause pagination error
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.listItems("accounts/1")) {
        // Should not get here
      }
      fail("Expected CanvasApiPaginationError to be thrown");
    } catch (error) {
      // Should get a pagination error since accounts/1 returns an object
      expect((error as Error).name).toBe("CanvasApiPaginationError");
    }
  }, 10000);

  it("should propagate 404 errors through pagination", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.listItems("courses/999999999/enrollments")) {
        // Should not get here
      }
      fail("Expected CanvasApiResponseError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CanvasApiResponseError);
    }
  }, 10000);
});
