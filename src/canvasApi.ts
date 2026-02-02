/* eslint-disable @typescript-eslint/no-this-alias */
import { FormData, request as undiciRequest } from "undici";
import type { Dispatcher } from "undici";
import {
  CanvasApiPaginationError,
  CanvasApiRequestError,
  CanvasApiResponseError,
  CanvasApiTimeoutError,
  getSlimStackTrace,
  canvasApiErrorDecorator,
} from "./canvasApiError";
import { ExtendedGenerator } from "./extendedGenerator";
import { rateLimitedRequestFactory } from "./rateLimiter";
import { CanvasApiResponse } from "./canvasApiResponse";

export { CanvasApiResponse } from "./canvasApiResponse";

export type RequestOptions = {
  timeout?: number;
};

export type QueryParams = Record<string, string | number | (string | number)[]>;

/** Converts an object to something that can be passed as body in a request */
export function normalizeBody(stackTrace: string | undefined, obj: unknown) {
  if (typeof obj === "undefined") {
    return undefined;
  }

  if (obj instanceof FormData) {
    return obj;
  }

  try {
    return JSON.stringify(obj);
  } catch (err) {
    if (err instanceof Error) {
      throw canvasApiErrorDecorator(
        new CanvasApiRequestError(err.message),
        stackTrace,
      );
    }
    throw err;
  }
}

/** Get the "next" value in a link header */
export function getNextUrl(linkHeader: string | string[]) {
  // Handle array headers by joining them
  const headerStr = Array.isArray(linkHeader)
    ? linkHeader.join(", ")
    : linkHeader;

  const next =
    headerStr.split(",").find((l) => l.search(/rel="next"$/) !== -1) || null;

  const url = next && next.match(/<(.*?)>/);
  return url && url[1];
}

/**
 * Return query parameters in Canvas accepted format (i.e. "bracket" format)
 *
 * Example:
 *
 * ```
 * stringifyQueryParameters({ role: [3, 10] }); // returns "role[]=3&role[]=10"
 *
 * ```
 */
export function stringifyQueryParameters(parameters: QueryParams) {
  const keyValues: string[] = [];

  for (const key in parameters) {
    const value = parameters[key];

    if (Array.isArray(value)) {
      for (const v of value) {
        keyValues.push(
          `${encodeURIComponent(key)}[]=${encodeURIComponent(String(v))}`,
        );
      }
    } else {
      keyValues.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
      );
    }
  }

  return keyValues.length === 0 ? "" : "?" + keyValues.join("&");
}

let requestWithRateLimitThrottling:
  | ReturnType<typeof rateLimitedRequestFactory>
  | undefined = undefined;
export class CanvasApi {
  /**
   * Internal request function. Uses double underscore to indicate
   * this is an implementation detail that should not be accessed directly.
   * @internal
   */
  __request__: ReturnType<typeof rateLimitedRequestFactory>;

  apiUrl: URL;
  token: string;
  options: RequestOptions;

  /**
   * Creates a new Canvas API client instance.
   * @param apiUrl - The Canvas instance API URL (e.g., "https://canvas.example.com/api/v1")
   * @param token - Bearer token for authentication (from Canvas profile settings)
   * @param options - Optional configuration
   * @param options.timeout - Request timeout in milliseconds
   * @param options.rateLimitIntervalMs - Rate limit check interval (default: 1000ms)
   * @param options.disableThrottling - Disable global rate limiting for this instance
   */
  constructor(
    apiUrl: string,
    token: string,
    options: RequestOptions & {
      rateLimitIntervalMs?: number;
      disableThrottling?: boolean;
    } = {},
  ) {
    // For correct parsing, check that `apiUrl` contains a trailing slash
    if (!apiUrl.endsWith("/")) {
      this.apiUrl = new URL(apiUrl + "/");
    } else {
      this.apiUrl = new URL(apiUrl);
    }
    const { rateLimitIntervalMs, disableThrottling, ...opts } = options;

    this.token = token;
    this.options = opts;

    // We can disable the rate limit support for individual instances if required
    if (disableThrottling) {
      this.__request__ = undiciRequest;
    } else {
      requestWithRateLimitThrottling ??= rateLimitedRequestFactory({
        limitIntervalMs: rateLimitIntervalMs ?? 1000,
      });
      this.__request__ = requestWithRateLimitThrottling;
    }
  }

  /** Internal function. Low-level function to perform requests to Canvas API */
  private async _request<T = unknown>(
    stackTrace: string | undefined,
    endpoint: string,
    method: Dispatcher.HttpMethod,
    params?: QueryParams,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<CanvasApiResponse<T>> {
    let url = new URL(endpoint, this.apiUrl).toString();
    const mergedOptions = { ...this.options, ...options };

    if (params) {
      url += stringifyQueryParameters(params);
    }
    const header = {
      authorization: `Bearer ${this.token}`,
      "User-Agent": "@kth/canvas-api",
      "content-type":
        body instanceof FormData
          ? undefined
          : typeof body === "string"
            ? "text/plain; charset=utf-8"
            : "application/json",
    };

    // The request function is created in the constructor
    const response = await this.__request__(url, {
      method,
      headers: header,
      body: normalizeBody(stackTrace, body),
      signal: mergedOptions.timeout
        ? AbortSignal.timeout(mergedOptions.timeout)
        : null,
    })
      .then((undiciResponse) =>
        new CanvasApiResponse<T>().parseBody(undiciResponse),
      )
      .catch((err) => {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw canvasApiErrorDecorator(
            new CanvasApiTimeoutError(),
            stackTrace,
          );
        }

        throw canvasApiErrorDecorator(
          new CanvasApiRequestError(err.message),
          stackTrace,
        );
      });

    if (response.statusCode >= 400) {
      throw canvasApiErrorDecorator(
        new CanvasApiResponseError(response),
        stackTrace,
      );
    }

    return response;
  }

  /** Performs a GET request to a given endpoint */
  async get<T = unknown>(
    endpoint: string,
    queryParams: QueryParams = {},
    options: RequestOptions = {},
  ): Promise<CanvasApiResponse<T>> {
    // We capture the stack trace here so we can hide the internals of this lib thus
    // making it point directly to the business logic for operational errors.
    const tmpErr = { stack: undefined };
    Error.captureStackTrace(tmpErr, this.get);

    return this._request<T>(
      tmpErr.stack,
      endpoint,
      "GET",
      queryParams,
      undefined,
      options,
    );
  }

  /**
   * Fetches paginated data from a Canvas API endpoint, yielding full response objects.
   * Automatically follows Link header pagination.
   * @param endpoint - API endpoint path (e.g., "courses/123/enrollments")
   * @param queryParams - Optional query parameters
   * @param options - Optional request options (e.g., timeout)
   * @returns AsyncGenerator yielding CanvasApiResponse objects for each page
   * @example
   * for await (const page of canvas.listPages("accounts/1/courses")) {
   *   console.log(page.json); // Array of courses for this page
   * }
   */
  listPages<T = unknown>(
    endpoint: string,
    queryParams: QueryParams = {},
    options: RequestOptions = {},
    stackTrace: string | undefined = undefined,
  ) {
    const t = this;

    stackTrace ??= getSlimStackTrace(this.listPages);

    async function* generator() {
      let url: string | null | undefined = endpoint;

      while (url) {
        const response: CanvasApiResponse<T[]> = await t._request<T[]>(
          stackTrace,
          url,
          "GET",
          queryParams,
          undefined,
          options,
        );
        yield response;
        url = response.headers.link && getNextUrl(response.headers.link);
        // Query params are only used in the first call with endpoint
        queryParams = {};
      }
    }

    return new ExtendedGenerator(generator());
  }

  /**
   * Fetches paginated data from a Canvas API endpoint, yielding individual items.
   * Automatically follows Link header pagination and flattens results.
   * @param endpoint - API endpoint path (e.g., "courses/123/enrollments")
   * @param queryParams - Optional query parameters
   * @param options - Optional request options (e.g., timeout)
   * @returns AsyncGenerator yielding individual items from all pages
   * @throws {CanvasApiPaginationError} If endpoint returns non-array response
   * @example
   * for await (const course of canvas.listItems("accounts/1/courses")) {
   *   console.log(course.name);
   * }
   */
  listItems<T = unknown>(
    endpoint: string,
    queryParams: QueryParams = {},
    options: RequestOptions = {},
  ) {
    const t = this;

    const stackTrace = getSlimStackTrace(this.listItems);

    async function* generator() {
      for await (const page of t.listPages<T>(
        endpoint,
        queryParams,
        options,
        stackTrace,
      )) {
        if (!Array.isArray(page.json)) {
          throw canvasApiErrorDecorator(
            new CanvasApiPaginationError(page),
            stackTrace,
          );
        }

        for (const element of page.json) {
          yield element;
        }
      }
    }
    return new ExtendedGenerator(generator());
  }

  /**
   * Makes a non-GET HTTP request to the Canvas API.
   * @param endpoint - API endpoint path
   * @param method - HTTP method (POST, PUT, DELETE, PATCH)
   * @param body - Request body (will be JSON stringified unless FormData)
   * @param options - Optional request options (e.g., timeout)
   * @returns Promise resolving to CanvasApiResponse
   * @throws {TypeError} If method is GET (use get(), listPages(), or listItems() instead)
   * @example
   * const response = await canvas.request("courses/123/enrollments", "POST", {
   *   enrollment: { user_id: 456, type: "StudentEnrollment" }
   * });
   */
  request<T = unknown>(
    endpoint: string,
    method: Dispatcher.HttpMethod,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<CanvasApiResponse<T>> {
    const stackTrace = getSlimStackTrace(this.request);

    if (method === "GET") {
      const err = new TypeError(
        "HTTP GET not allowed for this 'request' method. Use the methods 'get', 'listPages' or 'listItems' instead",
      );
      err.stack = stackTrace;
      throw err;
    }

    return this._request<T>(
      stackTrace,
      endpoint,
      method,
      undefined,
      body,
      options,
    );
  }

  /**
   * Uploads a SIS import file to Canvas.
   * @param attachment - File object or Blob containing CSV/ZIP data
   * @returns Promise resolving to CanvasApiResponse with import status
   * @example
   * const file = fs.readFileSync("users.csv");
   * const blob = new Blob([file], { type: "text/csv" });
   * const response = await canvas.sisImport(blob);
   */
  async sisImport<T = unknown>(
    attachment: File,
  ): Promise<CanvasApiResponse<T>> {
    const formData = new FormData();
    formData.set("attachment", attachment);

    const stackTrace = getSlimStackTrace(this.sisImport);

    return this._request<T>(
      stackTrace,
      "accounts/1/sis_imports",
      "POST",
      undefined,
      formData,
    );
  }
}
