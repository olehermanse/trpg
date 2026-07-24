import { describe, expect, test } from "vitest";
import { xp_reward, xp_threshold } from "../src/libtrpg/calculations.ts";

describe("xp_threshold", () => {
  test("gives positive integers", () => {
    for (let level = 1; level <= 100; level++) {
      expect(xp_threshold(level)).toBeTypeOf("number");
      expect(Number.isInteger(xp_threshold(level))).toBe(true);
      expect(xp_threshold(level)).toBeGreaterThan(0);
    }
  });
  test("grows between 100 and 99 999", () => {
    let previous = 0;
    for (let level = 1; level <= 100; level++) {
      const value = xp_threshold(level);
      expect(value).toBeLessThanOrEqual(99_999);
      if (level <= 5) {
        expect(value).toBe(100);
      } else if (previous < 99_999) {
        expect(value).toBeGreaterThan(previous);
        expect(value).toBeLessThanOrEqual(99_999);
      } else {
        expect(value).toBe(99_999);
      }
      previous = value;
    }
    expect(xp_threshold(98)).toBe(99_999);
    expect(xp_threshold(99)).toBe(99_999);
    expect(xp_threshold(100)).toBe(99_999);
  });
});

describe("xp_reward", () => {
  test("gives positive integers", () => {
    for (let level = 1; level <= 100; level++) {
      expect(xp_reward(level)).toBeTypeOf("number");
      expect(Number.isInteger(xp_reward(level))).toBe(true);
      expect(xp_reward(level)).toBeGreaterThan(0);
    }
  });
  test("always grows", () => {
    let previous = 0;
    for (let level = 1; level <= 100; level++) {
      const value = xp_reward(level);
      expect(value).toBeLessThanOrEqual(99_999);
      expect(value).toBeGreaterThan(previous);
      if (previous === 99_999) {
        expect(value).toBe(previous);
      } else {
        expect(value).toBeGreaterThan(previous);
      }
      previous = value;
    }
  });
});
