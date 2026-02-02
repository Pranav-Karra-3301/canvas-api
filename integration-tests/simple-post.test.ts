/** Make simple requests (GET, POST, PUT, etc.) to actual Canvas */
import { CanvasApi, CanvasApiResponseError } from "@kth/canvas-api";
import { z } from "zod";

const enrollmentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  course_id: z.number(),
  enrollment_state: z.string(),
});

describe("POST requests with body parameters", () => {
  it("should return right results", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    const enrollments = await client.request("courses/1/enrollments", "POST", {
      enrollment: {
        user_id: "27505",
        role_id: "3",
        enrollment_state: "active",
      },
    });
    expect(enrollments.statusCode).toEqual(200);
  }, 10000);
});

describe("PUT requests with body parameters", () => {
  it("should update a resource successfully", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // First, get the current user to have something to update
    const { json: currentUser, statusCode: getStatus } =
      await client.get("users/self");
    expect(getStatus).toBe(200);

    // Update the user's name (using current name to avoid actual changes)
    const currentName = (currentUser as { name?: string }).name || "Test User";
    const { statusCode } = await client.request("users/self", "PUT", {
      user: {
        name: currentName,
      },
    });

    expect(statusCode).toBe(200);
  }, 15000);

  it("should fail with 404 for non-existent resource", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    await expect(
      client.request("courses/999999999", "PUT", {
        course: { name: "Test" },
      }),
    ).rejects.toThrow(CanvasApiResponseError);
  }, 10000);
});

describe("DELETE requests", () => {
  // Note: This test creates and then deletes a resource to be safe
  // It tests the DELETE functionality without affecting real data
  it("should handle DELETE request properly", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    // Create a test enrollment first
    const { json: enrollment, statusCode: createStatus } = await client.request(
      "courses/1/enrollments",
      "POST",
      {
        enrollment: {
          user_id: "27505",
          role_id: "3",
          enrollment_state: "active",
        },
      },
    );
    expect(createStatus).toBe(200);

    const enrollmentData = enrollmentSchema.parse(enrollment);

    // Now conclude (soft delete) the enrollment
    // Canvas uses "conclude" task for enrollments instead of hard delete
    const { statusCode: deleteStatus } = await client.request(
      `courses/1/enrollments/${enrollmentData.id}`,
      "DELETE",
      { task: "conclude" },
    );

    // Canvas returns 200 for successful enrollment conclusion
    expect(deleteStatus).toBe(200);
  }, 20000);

  it("should fail with appropriate error for non-existent resource", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!,
    );

    await expect(
      client.request("courses/1/enrollments/999999999", "DELETE", {
        task: "conclude",
      }),
    ).rejects.toThrow(CanvasApiResponseError);
  }, 10000);
});
