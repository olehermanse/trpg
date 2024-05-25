import { Game } from "../src/libtowers/libtowers";

// example.test.js
import { describe, expect, test } from "vitest";

describe("Game", () => {
  test("can be created with columns and rows", () => {
    let game = new Game(4, 3, null);
    expect(game.rows).toBe(3);
    expect(game.columns).toBe(4);
  });
  describe("is_empty()", () => {
    test("returns false for walls", () => {
      let game = new Game(5, 5, null);
      expect(game.is_empty(0, 0)).toBe(false);
    });
    test("Returns true for empty tiles", () => {
      let game = new Game(5, 5, null);
      expect(game.is_empty(1, 1)).toBe(true);
    });
    test("Returns false for goal", () => {
      let game = new Game(5, 5, null);
      let c = game.goal.c;
      let r = game.goal.r;
      expect(game.is_empty(c, r)).toBe(false);
    });
    test("Returns false for spawn", () => {
      let game = new Game(5, 5, null);
      let c = game.spawn.c;
      let r = game.spawn.r;
      expect(game.is_empty(c, r)).toBe(false);
    });
  });
  describe("is_outside()", () => {
    test("returns false for positions inside", () => {
      let game = new Game(10, 20, null);
      expect(game.is_outside(0, 0)).toBe(false);
      expect(game.is_outside(1, 1)).toBe(false);
      expect(game.is_outside(9, 19)).toBe(false);
      expect(game.is_outside(9, 1)).toBe(false);
      expect(game.is_outside(1, 19)).toBe(false);
    });
    test("returns true for positions outside", () => {
      let game = new Game(10, 20, null);
      expect(game.is_outside(-1, 0)).toBe(true);
      expect(game.is_outside(0, -1)).toBe(true);
      expect(game.is_outside(10, 20)).toBe(true);
      expect(game.is_outside(10, 0)).toBe(true);
      expect(game.is_outside(0, 20)).toBe(true);
    });
  });
  describe("place_tower()", () => {
    test("places a tower", () => {
      let game = new Game(5, 5, null);
      expect(game.towers.length).toBe(0);
      let p = game.find_empty_not_path();
      game.place_tower(p.c, p.r, "Gun tower");
      expect(game.towers.length).toBe(1);
    });
  });
  describe("grid_click()", () => {
    test("places a tower", () => {
      let game = new Game(5, 5, null);
      expect(game.towers.length).toBe(0);
      let p = game.find_empty_not_path();
      expect(p).not.toBe(null);
      game.grid_click(p.c, p.r, "Gun tower");
      expect(game.towers.length).toBe(1);
    });
    test("doesn't place a tower when dead", () => {
      let game = new Game(5, 5, null);
      expect(game.towers.length).toBe(0);
      let p = game.find_empty_not_path();
      game.lives = 0;
      game.grid_click(p.c, p.r, "Gun tower");
      expect(game.towers.length).toBe(0);
    });
    test("doesn't block the path", () => {
      let game = new Game(3, 3, null);
      expect(game.towers.length).toBe(0);
      let row = game.spawn.r;
      game.grid_click(1, row, "Gun tower");
      expect(game.towers.length).toBe(0);
      expect(game.is_empty(1, row)).toBe(true);
    });
    test("doesn't place a tower on a wall", () => {
      let game = new Game(5, 5, null);
      expect(game.towers.length).toBe(0);
      game.grid_click(0, 0, "Gun tower");
      expect(game.towers.length).toBe(0);
    });
    test("doesn't place a tower on a tower", () => {
      let game = new Game(5, 5, null);
      expect(game.towers.length).toBe(0);
      let p = game.find_empty_not_path();
      game.grid_click(p.c, p.r, "Gun tower");
      expect(game.towers.length).toBe(1);
      game.grid_click(p.c, p.r, "Gun tower");
      expect(game.towers.length).toBe(1);
    });
    test("doesn't place a tower when you have no money", () => {
      let game = new Game(5, 5, null);
      game.money = 0;
      expect(game.towers.length).toBe(0);
      let row = game.is_path(1, 1) ? 2 : 1;
      game.grid_click(1, row, "Gun tower");
      expect(game.towers.length).toBe(0);
    });
  });
  describe("is_empty()", () => {
    test("Game.is_empty() returns true by default", () => {
      let game = new Game(4, 3, null);
      expect(game.is_empty(1, 1)).toBe(true);
    });

    test("Game.is_empty() returns false for wall", () => {
      let game = new Game(10, 10, null);
      expect(game.is_empty(0, 0)).toBe(false);
      expect(game.tiles[0][0], "wall");
    });
  });
  describe("can_afford()", () => {
    test("returns true at beginning of game", () => {
      let game = new Game(4, 3, null);
      expect(game.can_afford("Gun tower")).toBe(true);
    });
    test("returns false when you have no money", () => {
      let game = new Game(4, 3, null);
      game.money = 0;
      expect(game.can_afford("Gun tower")).toBe(false);
    });
  });
});
