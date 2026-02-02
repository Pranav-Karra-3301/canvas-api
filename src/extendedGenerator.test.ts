import { ExtendedGenerator } from "./extendedGenerator";

describe("constructor", () => {
  it("implements the iterator protocol", async () => {
    async function* gen() {
      yield 1;
    }

    const g2 = new ExtendedGenerator(gen());

    for await (const v of g2) {
      expect(v).toBe(1);
    }
  });
});

describe(".toArray()", () => {
  it("works without arguments", async () => {
    async function* gen() {
      yield 1;
      yield 2;
      yield 3;
    }
    const gen2 = new ExtendedGenerator(gen());

    await expect(gen2.toArray()).resolves.toEqual([1, 2, 3]);
  });

  it("does not restart the iteration", async () => {
    async function* gen() {
      yield 1;
      yield 2;
      yield 3;
    }
    const gen2 = new ExtendedGenerator(gen());

    await gen2.next();
    await expect(gen2.toArray()).resolves.toEqual([2, 3]);
  });
});

describe("lazy behavior (does not call generator if not needed)", () => {
  it("with simple `take(0)`", async () => {
    // eslint-disable-next-line require-yield
    async function* gen() {
      throw new Error();
    }

    const gen2 = new ExtendedGenerator(gen());

    expect(await gen2.take(0).toArray()).toEqual([]);
  });

  it("with filter and take", async () => {
    // eslint-disable-next-line require-yield
    async function* gen() {
      throw new Error();
    }

    const gen2 = new ExtendedGenerator(gen());

    expect(
      await gen2
        .filter(() => true)
        .take(0)
        .toArray(),
    ).toEqual([]);
  });
});

describe("filter method", () => {
  it("should filter items based on predicate", async () => {
    async function* gen() {
      yield 1;
      yield 2;
      yield 3;
      yield 4;
      yield 5;
    }
    const extended = new ExtendedGenerator(gen());
    const evens = await extended.filter((n) => n % 2 === 0).toArray();
    expect(evens).toEqual([2, 4]);
  });

  it("should handle empty results after filtering", async () => {
    async function* gen() {
      yield 1;
      yield 3;
      yield 5;
    }
    const extended = new ExtendedGenerator(gen());
    const evens = await extended.filter((n) => n % 2 === 0).toArray();
    expect(evens).toEqual([]);
  });
});

describe("map method", () => {
  it("should transform items", async () => {
    async function* gen() {
      yield 1;
      yield 2;
      yield 3;
    }
    const extended = new ExtendedGenerator(gen());
    const doubled = await extended.map((n) => n * 2).toArray();
    expect(doubled).toEqual([2, 4, 6]);
  });

  it("should change item type", async () => {
    async function* gen() {
      yield 1;
      yield 2;
    }
    const extended = new ExtendedGenerator(gen());
    const strings = await extended.map((n) => `item-${n}`).toArray();
    expect(strings).toEqual(["item-1", "item-2"]);
  });
});

describe("take method", () => {
  it("should take first n items", async () => {
    async function* gen() {
      yield 1;
      yield 2;
      yield 3;
      yield 4;
      yield 5;
    }
    const extended = new ExtendedGenerator(gen());
    const first3 = await extended.take(3).toArray();
    expect(first3).toEqual([1, 2, 3]);
  });

  it("should handle taking more than available", async () => {
    async function* gen() {
      yield 1;
      yield 2;
    }
    const extended = new ExtendedGenerator(gen());
    const items = await extended.take(10).toArray();
    expect(items).toEqual([1, 2]);
  });

  it("should handle take(0)", async () => {
    async function* gen() {
      yield 1;
      yield 2;
    }
    const extended = new ExtendedGenerator(gen());
    const items = await extended.take(0).toArray();
    expect(items).toEqual([]);
  });
});

describe("method chaining", () => {
  it("should chain filter and map", async () => {
    async function* gen() {
      yield 1;
      yield 2;
      yield 3;
      yield 4;
    }
    const extended = new ExtendedGenerator(gen());
    const result = await extended
      .filter((n) => n > 1)
      .map((n) => n * 10)
      .toArray();
    expect(result).toEqual([20, 30, 40]);
  });

  it("should chain filter, map, and take", async () => {
    async function* gen() {
      yield 1;
      yield 2;
      yield 3;
      yield 4;
      yield 5;
    }
    const extended = new ExtendedGenerator(gen());
    const result = await extended
      .filter((n) => n % 2 === 1)
      .map((n) => `odd-${n}`)
      .take(2)
      .toArray();
    expect(result).toEqual(["odd-1", "odd-3"]);
  });
});

describe("AsyncGenerator protocol", () => {
  it("should support for-await-of iteration", async () => {
    async function* gen() {
      yield "a";
      yield "b";
      yield "c";
    }
    const extended = new ExtendedGenerator(gen());
    const items: string[] = [];
    for await (const item of extended) {
      items.push(item);
    }
    expect(items).toEqual(["a", "b", "c"]);
  });

  it("should support next() method", async () => {
    async function* gen() {
      yield 1;
      yield 2;
    }
    const extended = new ExtendedGenerator(gen());
    const first = await extended.next();
    expect(first).toEqual({ value: 1, done: false });
    const second = await extended.next();
    expect(second).toEqual({ value: 2, done: false });
    const third = await extended.next();
    expect(third.done).toBe(true);
  });
});
