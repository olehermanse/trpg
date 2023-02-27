const Game = require("../libtowers/libtowers.js").Game;
const { number_string } = require("../libtowers/utils.js");

var assert = require("assert");

describe("Game", function () {
  it("Can be created", function () {
    let game = new Game(4, 3);
    assert.strictEqual(game.rows, 3);
    assert.strictEqual(game.columns, 4);
  });
  describe("#is_empty()", function () {
    it("Returns false for walls", function () {
      let game = new Game(5, 5);
      assert.strictEqual(game.is_empty(0, 0), false);
    });
    it("Returns true for empty tiles", function () {
      let game = new Game(5, 5);
      assert.strictEqual(game.is_empty(1, 1), true);
    });
    it("Returns false for goal", function () {
      let game = new Game(5, 5);
      let c = game.goal.c;
      let r = game.goal.r;
      assert.strictEqual(game.is_empty(c, r), false);
    });
    it("Returns false for spawn", function () {
      let game = new Game(5, 5);
      let c = game.spawn.c;
      let r = game.spawn.r;
      assert.strictEqual(game.is_empty(c, r), false);
    });
  });
  describe("#is_outside()", function () {
    it("Returns false for positions inside", function () {
      let game = new Game(10, 20);
      assert.strictEqual(game.is_outside(0, 0), false);
      assert.strictEqual(game.is_outside(1, 1), false);
      assert.strictEqual(game.is_outside(9, 19), false);
      assert.strictEqual(game.is_outside(9, 1), false);
      assert.strictEqual(game.is_outside(1, 19), false);
    });
    it("Returns true for positions outside", function () {
      let game = new Game(10, 20);
      assert.strictEqual(game.is_outside(-1, 0), true);
      assert.strictEqual(game.is_outside(0, -1), true);
      assert.strictEqual(game.is_outside(10, 20), true);
      assert.strictEqual(game.is_outside(10, 0), true);
      assert.strictEqual(game.is_outside(0, 20), true);
    });
  });
  describe("#place_tower()", function () {
    it("Places a tower", function () {
      let game = new Game(5, 5);
      assert.strictEqual(game.towers.length, 0);
      let p = game.find_empty_not_path();
      game.place_tower(p.c, p.r, "gun");
      assert.strictEqual(game.towers.length, 1);
    });
  });
  describe("#grid_click()", function () {
    it("Places a tower", function () {
      let game = new Game(5, 5);
      assert.strictEqual(game.towers.length, 0);
      let p = game.find_empty_not_path();
      assert.notStrictEqual(p, null);
      game.grid_click(p.c, p.r, "gun");
      assert.strictEqual(game.towers.length, 1);
    });
    it("Doesn't place a tower when dead", function () {
      let game = new Game(5, 5);
      assert.strictEqual(game.towers.length, 0);
      let p = game.find_empty_not_path();
      game.lives = 0;
      game.grid_click(p.c, p.r, "gun");
      assert.strictEqual(game.towers.length, 0);
    });
    it("Doesn't block the path", function () {
      let game = new Game(3, 3);
      assert.strictEqual(game.towers.length, 0);
      let row = game.spawn.r;
      game.grid_click(1, row, "gun");
      assert.strictEqual(game.towers.length, 0);
      assert.strictEqual(game.is_empty(1, row), true);
    });
    it("Doesn't place a tower on a wall", function () {
      let game = new Game(5, 5);
      assert.strictEqual(game.towers.length, 0);
      game.grid_click(0, 0, "gun");
      assert.strictEqual(game.towers.length, 0);
    });
    it("Doesn't place a tower on a tower", function () {
      let game = new Game(5, 5);
      assert.strictEqual(game.towers.length, 0);
      let p = game.find_empty_not_path();
      game.grid_click(p.c, p.r, "gun");
      assert.strictEqual(game.towers.length, 1);
      game.grid_click(p.c, p.r, "gun");
      assert.strictEqual(game.towers.length, 1);
    });
    it("Doesn't place a tower when you have no money", function () {
      let game = new Game(5, 5);
      game.money = 0;
      assert.strictEqual(game.towers.length, 0);
      let row = game.is_path(1, 1) ? 2 : 1;
      game.grid_click(1, row, "gun");
      assert.strictEqual(game.towers.length, 0);
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
  describe("#can_afford()", function () {
    it("Returns true at beginning of game", function () {
      let game = new Game(4, 3);
      assert.strictEqual(game.can_afford("gun"), true);
    });
    it("Returns false when you have no money", function () {
      let game = new Game(4, 3);
      game.money = 0;
      assert.strictEqual(game.can_afford("gun"), false);
    });
  });
});

describe("number_string", function () {
  it("inserts spaces", function () {
    assert.strictEqual(number_string(1000), "1 000");
    assert.strictEqual(number_string(123456), "123 456");
    assert.strictEqual(number_string(999000), "999 000");
    assert.strictEqual(number_string(1000000), "1 000 000");
    assert.strictEqual(number_string(9999999), "9 999 999");
  });
  it("works for zero", function () {
    assert.strictEqual(number_string(0), "0");
  });
  it("works for small numbers", function () {
    assert.strictEqual(number_string(1), "1");
    assert.strictEqual(number_string(2), "2");
    assert.strictEqual(number_string(3), "3");
    assert.strictEqual(number_string(99), "99");
    assert.strictEqual(number_string(100), "100");
    assert.strictEqual(number_string(999), "999");
  });
  it("works for negative numbers", function () {
    assert.strictEqual(number_string(-1), "-1");
    assert.strictEqual(number_string(-2), "-2");
    assert.strictEqual(number_string(-3), "-3");
    assert.strictEqual(number_string(-99), "-99");
    assert.strictEqual(number_string(-100), "-100");
    assert.strictEqual(number_string(-999), "-999");
    assert.strictEqual(number_string(-1000), "-1 000");
    assert.strictEqual(number_string(-9999), "-9 999");
  });
});
