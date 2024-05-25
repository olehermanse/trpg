import { Game } from "../src/libtrpg/game.ts";

// example.test.js
import { describe, expect, test } from "vitest";

describe("Game", () => {
  test("can be created with columns and rows", () => {
    let game = new Game(4, 3);
    expect(game.rows).toBe(3);
    expect(game.columns).toBe(4);
  });
});
