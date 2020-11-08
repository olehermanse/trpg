const Game = require("../libtowers/libtowers.js").Game;

var assert = require("assert");

describe("Game", function () {
  it("Can be created", function () {
    let game = new Game(4, 3);
    assert.strictEqual(game.rows, 3);
    assert.strictEqual(game.columns, 4);
  });
  describe("#place_tower()", function () {
    it("Places a tower", function () {
      let game = new Game(5, 5);
      assert.strictEqual(game.towers.length, 0);
      game.place_tower(1, 1);
      assert.strictEqual(game.towers.length, 1);
    });
    it("Doesn't block the path", function () {
      let game = new Game(3, 3);
      assert.strictEqual(game.towers.length, 0);
      game.place_tower(1, 1);
      assert.strictEqual(game.towers.length, 0);
    });
  });
  describe("#grid_click()", function () {
    it("Places a tower", function () {
      let game = new Game(5, 5);
      assert.strictEqual(game.towers.length, 0);
      game.grid_click(1, 1);
      assert.strictEqual(game.towers.length, 1);
    });
    it("Doesn't place a tower on a wall", function () {
      let game = new Game(5, 5);
      assert.strictEqual(game.towers.length, 0);
      game.grid_click(0, 0);
      assert.strictEqual(game.towers.length, 0);
    });
    it("Doesn't place a tower on a tower", function () {
      let game = new Game(5, 5);
      assert.strictEqual(game.towers.length, 0);
      game.grid_click(1, 1);
      game.grid_click(1, 1);
      assert.strictEqual(game.towers.length, 1);
    });
  });
  describe("#is_empty()", function () {
    it("Returns true by default", function () {
      let game = new Game(4, 3);
      assert.strictEqual(game.is_empty(1, 1), true);
    });
    it("Returns false for wall", function () {
      let game = new Game(10, 10);
      assert.strictEqual(game.is_empty(0, 0), false);
      assert.strictEqual(game.tiles[0][0], "wall");
    });
  });
});
