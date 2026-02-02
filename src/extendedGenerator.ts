/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Wrapper around AsyncGenerator that provides utility methods for
 * processing paginated Canvas API results.
 *
 * @template T - The type of items yielded by the generator
 * @example
 * const courses = canvas.listItems("accounts/1/courses");
 * const activeCourses = await courses
 *   .filter(c => c.workflow_state === 'available')
 *   .take(10)
 *   .toArray();
 */
export class ExtendedGenerator<T> implements AsyncGenerator<T, void, unknown> {
  private generator: AsyncGenerator<T, void, unknown>;

  /**
   * Creates a new ExtendedGenerator wrapping an existing AsyncGenerator.
   *
   * @param generator - The underlying AsyncGenerator to wrap
   */
  constructor(generator: AsyncGenerator<T, void, unknown>) {
    this.generator = generator;
  }

  /**
   * Converts the iterator into an array that contains all the elements of the iterator.
   * The iterator is exhausted after calling this method.
   *
   * @returns A promise that resolves to an array containing all yielded elements
   * @example
   * const allCourses = await canvas.listItems("accounts/1/courses").toArray();
   */
  async toArray(): Promise<T[]> {
    const result: T[] = [];

    for await (const v of this.generator) {
      result.push(v);
    }

    return result;
  }

  /**
   * Creates a new iterator with elements that satisfy the predicate function.
   *
   * @param predicate - A function that returns true to keep the element, false otherwise
   * @returns A new ExtendedGenerator containing only elements that pass the predicate
   * @example
   * const activeCourses = canvas.listItems("accounts/1/courses")
   *   .filter(c => c.workflow_state === 'available');
   */
  filter(predicate: (v: T) => boolean): ExtendedGenerator<T> {
    const g = this.generator;

    async function* newGenerator() {
      for await (const v of g) {
        if (predicate(v)) {
          yield v;
        }
      }
    }

    return new ExtendedGenerator(newGenerator());
  }

  /**
   * Creates a new iterator with the results of calling the callback function
   * on every element in the calling iterator.
   *
   * @template V - The type of the transformed elements
   * @param callback - A function that transforms each element
   * @returns A new ExtendedGenerator containing the transformed elements
   * @example
   * const courseNames = canvas.listItems("accounts/1/courses")
   *   .map(c => c.name);
   */
  map<V>(callback: (v: T) => V): ExtendedGenerator<V> {
    const gen = this.generator;

    async function* newGenerator() {
      for await (const v of gen) {
        yield callback(v);
      }
    }
    return new ExtendedGenerator(newGenerator());
  }

  /**
   * Creates an iterator that yields only the first n elements from the calling iterator.
   * Useful for limiting results from paginated API calls.
   *
   * @param n - The maximum number of elements to yield
   * @returns A new ExtendedGenerator that yields at most n elements
   * @example
   * const firstTenCourses = canvas.listItems("accounts/1/courses").take(10);
   */
  take(n: number): ExtendedGenerator<T> {
    const gen = this.generator;

    async function* newGenerator() {
      while (n > 0) {
        const next = await gen.next();
        if (next.done) {
          return next.value;
        }
        yield next.value;
        n--;
      }
    }

    return new ExtendedGenerator(newGenerator());
  }

  // The following methods are required by the `AsyncGenerator` definition:

  /**
   * Implements the AsyncGenerator protocol.
   * Advances the iterator and returns the next value.
   *
   * @returns A promise resolving to the next iterator result
   */
  next(): Promise<IteratorResult<T, any>> {
    return this.generator.next();
  }

  /**
   * Implements the AsyncGenerator protocol.
   * Returns the given value and finishes the generator.
   *
   * @param value - The value to return
   * @returns A promise resolving to the final iterator result
   */
  return(value: any): Promise<IteratorResult<T, any>> {
    return this.generator.return(value);
  }

  /**
   * Implements the AsyncGenerator protocol.
   * Throws an error into the generator.
   *
   * @param e - The error to throw
   * @returns A promise resolving to the next iterator result
   */
  throw(e: any): Promise<IteratorResult<T, any>> {
    return this.generator.throw(e);
  }

  /**
   * Enables for-await-of iteration over this generator.
   *
   * @returns The underlying AsyncGenerator iterator
   * @example
   * for await (const course of canvas.listItems("accounts/1/courses")) {
   *   console.log(course.name);
   * }
   */
  [Symbol.asyncIterator](): AsyncGenerator<T, any, unknown> {
    return this.generator[Symbol.asyncIterator]();
  }
}
