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
      let game = new Game(4, 3);
      assert.strictEqual(game.towers.length, 0);
      game.place_tower(0, 0);
      assert.strictEqual(game.towers.length, 1);
    });
  });
  describe("#has_tower()", function () {
    it("Returns false by default", function () {
      let game = new Game(4, 3);
      assert.strictEqual(game.has_tower(0, 0), false);
    });
  });
});
