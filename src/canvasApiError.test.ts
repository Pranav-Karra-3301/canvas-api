import { describe, it, expect } from "@jest/globals";
import {
  CanvasApiError,
  CanvasApiResponseError,
  CanvasApiRequestError,
  CanvasApiTimeoutError,
  CanvasApiPaginationError,
  getSlimStackTrace,
  canvasApiErrorDecorator,
} from "./canvasApiError";
import { CanvasApiResponse } from "./canvasApi";

describe("CanvasApiError classes", () => {
  describe("CanvasApiError", () => {
    it("should be an instance of Error", () => {
      const error = new CanvasApiError("test message");
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("test message");
      expect(error.name).toBe("CanvasApiError");
    });
  });

  describe("CanvasApiResponseError", () => {
    it("should include response object", () => {
      const response = new CanvasApiResponse();
      response.statusCode = 404;
      const error = new CanvasApiResponseError(response);
      expect(error).toBeInstanceOf(CanvasApiError);
      expect(error.response).toBe(response);
      expect(error.name).toBe("CanvasApiResponseError");
    });
  });

  describe("CanvasApiRequestError", () => {
    it("should format message correctly", () => {
      const error = new CanvasApiRequestError("invalid body");
      expect(error.message).toContain("invalid body");
      expect(error.name).toBe("CanvasApiRequestError");
    });

    it("should use default message when none provided", () => {
      const error = new CanvasApiRequestError();
      expect(error.message).toContain("something wrong with your request");
    });
  });

  describe("CanvasApiTimeoutError", () => {
    it("should have correct name and message", () => {
      const error = new CanvasApiTimeoutError();
      expect(error.name).toBe("CanvasApiTimeoutError");
      expect(error.message).toContain("timeout");
    });
  });

  describe("CanvasApiPaginationError", () => {
    it("should include response and explain non-array issue", () => {
      const response = new CanvasApiResponse();
      response.json = { id: 1 };
      const error = new CanvasApiPaginationError(response);
      expect(error.response).toBe(response);
      expect(error.message).toContain("list");
      expect(error.name).toBe("CanvasApiPaginationError");
    });
  });
});

describe("getSlimStackTrace", () => {
  it("should capture stack trace excluding the caller function", () => {
    function testCaller() {
      return getSlimStackTrace(testCaller);
    }
    const stack = testCaller();
    expect(stack).toBeDefined();
    expect(stack).not.toContain("testCaller");
  });
});

describe("canvasApiErrorDecorator", () => {
  it("should replace stack trace with provided one", () => {
    const error = new CanvasApiTimeoutError();
    const customStack = "Error\n    at customLocation (file.ts:10:5)";
    const decorated = canvasApiErrorDecorator(error, customStack);
    expect(decorated.stack).toContain("CanvasApiTimeoutError");
    expect(decorated.stack).toContain("customLocation");
  });

  it("should not modify stack if undefined provided", () => {
    const error = new CanvasApiTimeoutError();
    const originalStack = error.stack;
    canvasApiErrorDecorator(error, undefined);
    expect(error.stack).toBe(originalStack);
  });
});
