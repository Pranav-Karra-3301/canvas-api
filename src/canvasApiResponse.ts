import type { Dispatcher } from "undici";

/**
 * Response from a Canvas API request.
 * @template T - The expected type of the JSON response body
 */
export class CanvasApiResponse<T = unknown> {
  /** HTTP status code of the response */
  statusCode: number;

  /** HTTP headers from the response */
  headers: Record<string, string | string[] | undefined>;

  /** Parsed JSON body of the response */
  json: T | undefined;

  /**
   * Parsed JSON body of the response.
   * @deprecated Use `json` instead
   */
  body: T | undefined;

  /** Raw text body of the response */
  text: string;

  /**
   * Error that occurred during JSON parsing, if any.
   * Undefined if parsing succeeded or response was not JSON.
   */
  parseError?: Error;

  constructor() {
    this.statusCode = 0;
    this.headers = {};
    this.json = undefined;
    this.body = undefined;
    this.text = "";
    this.parseError = undefined;
  }

  async parseBody(
    response: Dispatcher.ResponseData,
  ): Promise<CanvasApiResponse<T>> {
    const text = await response.body.text();

    try {
      this.statusCode = response.statusCode;
      this.headers = response.headers;
      this.text = text;
      this.json = JSON.parse(text);
      this.body = this.json;
    } catch (err) {
      this.parseError = err instanceof Error ? err : new Error(String(err));
    }

    return this;
  }
}
