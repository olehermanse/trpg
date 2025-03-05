import { describe, expect, test } from "vitest";
import { Game } from "../src/libtrpg/game.ts";
import { Grid } from "@olehermanse/utils/funcs.js";

describe("Game", () => {
  test("can be created", () => {
    const game = new Game(new Grid(800, 600, 8, 6));
    expect(game).not.toBe(null);
    expect(game).toBeInstanceOf(Game);
  });
  test("to have correct dimensions", () => {
    const game = new Game(new Grid(800, 600, 8, 6));
    expect(game.grid.columns).toBe(8);
    expect(game.grid.rows).toBe(6);
    expect(game.grid.cell_width).toBe(100);
    expect(game.grid.cell_height).toBe(100);
  });
});
