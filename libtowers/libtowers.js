const { Enemies } = require("./enemies.js");
const {
  get_rotation,
  seconds,
  dps,
  distance,
  position,
} = require("./utils.js");

class Shape {
  constructor(c, r, rocks) {
    this.c = c;
    this.r = r;
    this.rocks = rocks;
  }

  translate(c, r) {
    for (let rock of this.rocks) {
      rock.c += c;
      rock.r += r;
    }
  }

  static _get_shape() {
    let shapes = [];
    // 1x1
    shapes.push([[1]]);
    // 2x1
    shapes.push([[1, 1]]);
    shapes.push([[1], [1]]);
    // 2x2
    shapes.push([
      [1, 0],
      [0, 1],
    ]);
    shapes.push([
      [0, 1],
      [1, 0],
    ]);
    // 3x3 Diagonals:
    shapes.push([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    shapes.push([
      [0, 0, 1],
      [0, 1, 0],
      [1, 0, 0],
    ]);
    // 4 corners:
    shapes.push([
      [1, 0, 1],
      [0, 0, 0],
      [1, 0, 1],
    ]);
    // =
    shapes.push([
      [1, 1, 1],
      [0, 0, 0],
      [1, 1, 1],
    ]);
    // ||
    shapes.push([
      [1, 0, 1],
      [1, 0, 1],
      [1, 0, 1],
    ]);
    // L shapes:
    shapes.push([
      [0, 0, 1],
      [0, 0, 1],
      [1, 1, 1],
    ]);
    shapes.push([
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1],
    ]);
    shapes.push([
      [1, 1, 1],
      [0, 0, 1],
      [0, 0, 1],
    ]);
    shapes.push([
      [1, 1, 1],
      [1, 0, 0],
      [1, 0, 0],
    ]);

    // 3x1 and 4x1 bars
    shapes.push([[1, 1, 1]]);
    shapes.push([[1, 1, 1, 1]]);
    shapes.push([[1], [1], [1]]);
    shapes.push([[1], [1], [1], [1]]);

    // Tetris inspired:
    shapes.push([
      [0, 1],
      [1, 1],
      [1, 0],
    ]);
    shapes.push([
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
    shapes.push([
      [1, 0],
      [1, 1],
      [1, 0],
    ]);
    shapes.push([
      [0, 1],
      [1, 1],
      [0, 1],
    ]);
    shapes.push([
      [0, 1, 1],
      [1, 1, 0],
    ]);
    shapes.push([
      [1, 1, 0],
      [0, 1, 1],
    ]);
    return shapes[randint(0, shapes.length - 1)];
  }

  static get_shape() {
    let base = Shape._get_shape();
    let rocks = [];
    let rows = base.length;
    let columns = base[0].length;
    for (let c = 0; c < columns; ++c) {
      for (let r = 0; r < rows; ++r) {
        if (base[r][c] === 0) {
          continue;
        }
        rocks.push(new Tower(c, r, "Rock"));
      }
    }
    return new Shape(columns, rows, rocks);
  }
}

class Tower {
  constructor(c, r, name, price, painter = null) {
    this.type = "tower";
    this.name = name;
    this.c = c;
    this.r = r;
    this.painter = painter;
    this.price = price;
    this.rotation = Math.PI / 2;
    this.target = null;
    this.intensity = 0.0;
    this.range = null;
    this.level = 1;
    if (this.name === "Gun tower") {
      this.charge_time = 0.3;
      this.dps = 60; // 3 per cost
      this.range = 3.0;
    } else if (this.name === "Laser tower") {
      this.charge_time = 1.0;
      this.dps = 100; // 2 per cost
      this.range = 4.0;
    } else if (this.name === "Slow tower") {
      this.charge_time = 1.0;
      this.dps = 10;
      this.slow = 1.0;
      this.range = 2.0;
    }
  }
  get level_factor() {
    return 1 + 0.9 * (this.level - 1);
  }
  tick(ms) {
    if (["Rock", "Bank"].includes(this.name)) {
      return;
    }
    const sec = ms / 1000;
    if (this.target) {
      this.intensity += sec / this.charge_time;
      if (this.intensity > 1.0) {
        this.intensity = 1.0;
      }
      if (this.name === "Slow tower") {
        const slow_factor =
          this.level_factor * this.slow * this.intensity * sec;
        this.target.slow += slow_factor; // squares per second
        this.target.slow_time += 3 * slow_factor; // seconds
      }
      this.target.health -= dps(
        this.level_factor * this.dps * this.intensity,
        ms
      );
      this.rotation = get_rotation(this, this.target);
    }
  }
  pick_target(enemies) {
    if (this.range === null) {
      return;
    }
    if (enemies.length === 0) {
      this.target = null;
      this.intensity = 0.0;
      return;
    }
    const in_range = enemies.filter((e) => {
      return distance(this, e) < this.range;
    });
    if (
      ["Laser tower", "Slow tower"].includes(this.name) &&
      in_range.includes(this.target)
    ) {
      return;
    }
    let new_target = null;
    if (in_range.length > 0) {
      new_target = in_range[0];
      for (let t of in_range) {
        if (t.travelled > new_target.travelled) {
          new_target = t;
        }
      }
    }
    if (this.target != new_target) {
      this.target = new_target;
      this.intensity = 0.0;
    }
  }
  static price(name) {
    if (name === "Rock") {
      return 1;
    }
    if (name === "Gun tower") {
      return 20;
    }
    if (name === "Slow tower") {
      return 50;
    }
    if (name === "Laser tower") {
      return 100;
    }
    if (name === "Bank") {
      return 100;
    }
  }
}

function randint(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

class Game {
  constructor(columns, rows, painter) {
    this.painter = painter;
    this.paused = true;
    this.on_victory = null;
    this.level = 1;
    this.lives = 3;
    this.remaining = [];
    this.money = 45;
    this.rows = rows;
    this.columns = columns;
    this.spawn = position(0, randint(1, this.rows - 2));
    this.goal = position(columns - 1, randint(1, this.rows - 2));
    this.towers = [];
    this.enemies = [];
    this.delay = 0;
    this.path = [];
    this.tiles = [...Array(columns)].map(() => Array(rows).fill(null));
    this.inventory = [
      new Card(
        "Gun tower",
        "Deals damage.\nVery cost\neffective. Always\ntargets the\nfurthest enemy.",
        null,
        this
      ),
    ];
    this.spawning = false;
    console.assert(this.tiles.length === columns);
    console.assert(this.tiles[0].length === rows);

    for (let i = 0; i < rows; ++i) {
      this.tiles[0][i] = this.tiles[columns - 1][i] = "wall";
    }
    for (let i = 0; i < columns; ++i) {
      this.tiles[i][0] = this.tiles[i][rows - 1] = "wall";
    }
    console.assert(
      this.tiles[this.spawn.c][this.spawn.r] === "wall",
      "Spawn not on wall"
    );
    console.assert(
      this.tiles[this.goal.c][this.goal.r] === "wall",
      "Goal not on wall"
    );
    console.assert(
      this.tiles[this.spawn.c + 1][this.spawn.r] === null,
      "Spawn not accessible"
    );
    console.assert(
      this.tiles[this.goal.c - 1][this.goal.r] === null,
      "Goal not accessible"
    );
    this.tiles[this.spawn.c][this.spawn.r] = "spawn";
    this.tiles[this.goal.c][this.goal.r] = "goal";
    const success = this.create_path();
    console.assert(success === true, "Could not create path");
  }

  spawn_rocks() {
    this.spawning = true;
    let counter = 0;
    for (let i = 0; i < 20; ++i) {
      let shape = Shape.get_shape();
      let h = shape.r;
      let w = shape.c;
      let p = position(
        randint(2, this.columns - 2 - w),
        randint(2, this.rows - 2 - h)
      );
      if (!this.is_empty_rect(shape, p.c, p.r)) continue;
      shape.translate(p.c, p.r);
      for (let rock of shape.rocks) {
        let r = this.place_tower(rock.c, rock.r, "Rock");
        console.assert(r != null);
        counter += 1;
      }
    }
    this.spawning = false;
    return counter;
  }

  is_empty_rect(shape, col, row) {
    let start_c = col - 1;
    let start_r = row - 1;
    let w = shape.c + 2;
    let h = shape.r + 2;
    let end_c = start_c + w;
    let end_r = start_r + h;
    for (let c = start_c; c < end_c; ++c) {
      for (let r = start_r; r < end_r; ++r) {
        if (!this.is_empty(c, r)) {
          return false;
        }
      }
    }
    return true;
  }

  place_path(c, r) {
    if (this.is_outside(c, r)) {
      return;
    }
    const tile = this.tiles[c][r];
    if (tile === "spawn" || tile === "goal") {
      return;
    }
    this.tiles[c][r] = "path";
  }

  is_outside(c, r) {
    return c < 0 || r < 0 || r >= this.rows || c >= this.columns;
  }

  is_inside(c, r) {
    return !this.is_outside(c, r);
  }

  is_empty(c, r) {
    if (this.is_outside(c, r)) {
      return false;
    }
    return this.tiles[c][r] === null || this.is_path(c, r);
  }

  find_empty_not_path() {
    for (let c = 0; c < this.columns; ++c) {
      for (let r = 0; r < this.rows; ++r) {
        if (this.is_empty(c, r) && !this.is_path(c, r)) {
          return position(c, r);
        }
      }
    }
    return null;
  }

  is_path(c, r) {
    return this.tiles[c][r] === "path";
  }

  clear_path() {
    this.path = [];
    for (let tiles of this.tiles) {
      for (let i = 0; i < tiles.length; ++i) {
        if (tiles[i] === "path") {
          tiles[i] = null;
        }
      }
    }
  }

  set_path(path) {
    this.path = path;
    for (let pos of path) {
      this.place_path(pos.c, pos.r);
    }
    for (let enemy of this.enemies) {
      enemy.path = this.path;
    }
  }

  clear_distances() {
    for (let tiles of this.tiles) {
      for (let i = 0; i < tiles.length; ++i) {
        if (Number.isInteger(tiles[i])) {
          tiles[i] = null;
        }
      }
    }
  }

  fill_distances(c, r, distance) {
    console.assert(Number.isInteger(c));
    console.assert(Number.isInteger(r));
    console.assert(Number.isInteger(distance));

    if (this.is_outside(c, r)) {
      return;
    }
    const tile = this.tiles[c][r];
    if (tile === null) {
      // Good, we will record distance
    } else if (Number.isInteger(tile)) {
      if (distance >= tile) {
        return; // Already a lower distance there
      }
    } else if (tile === "goal") {
      if (distance > 0) {
        // We've already been here, don't recurse
        return;
      }
    } else if (tile === "spawn") {
      return; // We reached spawn, no need to recurse further
    } else {
      console.assert(tile != "path");
      return; // Something else, like a wall or a tower.
    }

    if (tile === null || Number.isInteger(tile)) {
      this.tiles[c][r] = distance;
    } else {
      console.assert(tile === "goal");
    }
    this.fill_distances(c - 1, r, distance + 1);
    this.fill_distances(c, r + 1, distance + 1);
    this.fill_distances(c, r - 1, distance + 1);
    this.fill_distances(c + 1, r, distance + 1);
  }

  get_distance(c, r) {
    if (this.is_outside(c, r)) {
      return null;
    }
    const tile = this.tiles[c][r];
    if (!Number.isInteger(tile)) {
      return null;
    }

    return tile;
  }

  find_path(start_c, start_r) {
    const PI = Math.PI;
    const target = position(this.goal.c - 1, this.goal.r);
    let visited = [];
    let current = position(start_c, start_r);
    while (true) {
      const c = current.c;
      const r = current.r;
      const up = position(c, r - 1);
      const down = position(c, r + 1);
      const left = position(c - 1, r);
      const right = position(c + 1, r);
      const direction = get_rotation(current, target);
      let all = [];
      if (direction <= 0) {
        console.assert(false, "Bad direction during pathfinding");
      }
      if (direction <= 0.25 * PI) {
        all = [right, up, down, left];
      } else if (direction <= 0.75 * PI) {
        all = [up, right, left, down];
      } else if (direction <= 1.25 * PI) {
        all = [left, up, down, right];
      } else if (direction <= 1.75 * PI) {
        all = [down, right, left, up];
      } else if (direction <= 2.0 * PI) {
        all = [right, up, down, left];
      } else {
        console.assert(false, "Bad direction during pathfinding");
      }
      const distances = all.map((pos) => {
        return this.get_distance(pos.c, pos.r);
      });
      const filtered = distances.filter(Number.isInteger);
      if (filtered.length === 0) {
        console.assert(this.tiles[c][r] === "spawn");
        return [];
      }
      const best = Math.min(...filtered);
      console.assert(all.length === distances.length);
      const best_position = all[distances.indexOf(best)];
      visited.push(best_position);
      if (best === 1) {
        break;
      }
      current = best_position;
    }
    return visited;
  }

  create_path() {
    const spawn = this.spawn;
    const goal = this.goal;

    this.clear_path();
    this.fill_distances(goal.c, goal.r, 0);
    let path = this.find_path(spawn.c, spawn.r);
    this.clear_distances();
    if (path.length === 0) {
      return false;
    }
    this.set_path([this.spawn, ...path, goal, position(goal.c + 1, goal.r)]);
    return true;
  }

  get_tower(position) {
    if (position === null) {
      return null;
    }
    if (!this.has_tower(position.c, position.r)) {
      return null;
    }
    return this.tiles[position.c][position.r];
  }

  price(card, position = null) {
    card = this.find_card(card);
    let name = card.name;
    if (name === "Bank") {
      return 100 + 100 * this.banks;
    }
    let tower = this.get_tower(position);
    if (tower === null) {
      return Tower.price(name);
    }
    if (tower.name != name) {
      return Tower.price(name);
    }

    return Tower.price(name) * 2;
  }

  can_afford(card, position = null) {
    card = this.find_card(card);
    return this.money >= this.price(card.name, position);
  }

  _try_place_tower(c, r, card) {
    card = this.find_card(card);
    let name = card === "Rock" ? "Rock" : card.name;
    if (!this.spawning) {
      console.assert(
        this.can_afford(name, position(c, r)),
        "Cannot afford tower"
      );
    }
    console.assert(this.is_empty(c, r), "Cannot place in non-empty");

    const tower = new Tower(c, r, name, this.price(name), this.painter);
    const on_path = this.is_path(c, r);

    const save = this.tiles[c][r];
    this.tiles[c][r] = tower;

    if (!on_path) {
      return tower;
    }

    if (!this.create_path()) {
      this.tiles[c][r] = save;
      const success = this.create_path();
      console.assert(success === true);
      return null;
    }

    return tower;
  }

  place_tower(c, r, card) {
    card = this.find_card(card);
    let name = this.spawning ? "Rock" : card.name;
    if (!this.spawning) {
      console.assert(this.can_afford(name, position(c, r)));
      console.assert(this.can_place(c, r, name));
      console.assert(this.have_card(name));
    }
    const price = this.spawning ? 0 : card.price;
    if (this.has_tower(c, r)) {
      const tower = this.tiles[c][r];
      if (tower.name === name) {
        tower.level += 1;
        this.money -= price;
        return tower;
      }
      const towers = this.towers;
      const i = towers.indexOf(tower);
      this.tiles[c][r] = null;
      towers[i] = this._try_place_tower(c, r, card);
      console.assert(towers[i] != null);
      console.assert(towers[i] != tower);
      console.assert(towers[i] === this.tiles[c][r]);
      this.money -= price;
      return towers[i];
    }

    const tower = this._try_place_tower(c, r, card);
    if (tower === null) {
      return null;
    }
    console.assert(this.tiles[c][r] === tower, "Tower not placed in tile");
    this.towers.push(tower);
    this.money -= price;
    return tower;
  }

  has_tower(c, r) {
    if (this.is_outside(c, r)) {
      return false;
    }
    if (this.is_empty(c, r)) {
      return false;
    }
    const tile = this.tiles[c][r];
    console.assert(tile != null);
    if (["spawn", "wall", "path", "goal"].includes(tile)) {
      return false;
    }
    return true;
  }

  can_place(c, r, card) {
    card = this.find_card(card);
    let name = card.name;
    if (!this.spawning && !this.have_card(name)) {
      return false;
    }
    if (!this.can_afford(name, position(c, r))) {
      return false;
    }
    if (this.is_outside(c, r)) {
      return false;
    }
    if (this.is_empty(c, r)) {
      return true;
    }
    if (!this.has_tower(c, r)) {
      return false;
    }
    if (name === "Rock") {
      return false;
    }
    if (name === this.tiles[c][r].name && this.tiles[c][r].level >= 3) {
      return false;
    }
    return true;
  }

  find_card(name) {
    for (let card of this.inventory) {
      if (card.name === name) {
        return card;
      }
    }
    return name;
  }

  grid_click(c, r, card) {
    card = this.find_card(card);
    if (this.lives <= 0) {
      return;
    }
    if (this.can_place(c, r, card.name)) {
      if (this.paused || !this.is_path(c, r)) {
        return this.place_tower(c, r, card);
      }
    }
    return null;
  }

  start() {
    console.assert(this.paused);
    console.assert(this.on_victory != null);
    console.assert(this.remaining.length === 0);

    this.remaining = Enemies.create(
      this.spawn.c - 1,
      this.spawn.r,
      this.level,
      this.lives,
      this.path
    ).reverse();
    this.paused = false;
    this.perfect = true;
    this.delay = 0.0;
  }

  get banks() {
    let n = 0;
    for (let t of this.towers) {
      if (t.name === "Bank") {
        n += t.level;
      }
    }
    return n;
  }

  get level_reward() {
    let n = this.banks + 1;
    let fixed = 2 * n;
    let interest = (n * 10) / 100;
    return Math.floor(fixed + interest * this.money);
  }

  have_card(name) {
    for (let x of this.inventory) {
      if (x.name === name) {
        return true;
      }
    }
    return false;
  }

  victory() {
    console.assert(this.remaining.length === 0);
    console.assert(this.paused === false);
    if (this.perfect && this.lives < 3 && this.level % 5 === 0) {
      this.lives += 1;
    }
    this.paused = true;
    this.money += this.level_reward;
    this.level += 1;
    if (this.level === 2) {
      this.inventory.push(
        new Card(
          "Rock",
          "Blocks the path.\nBuild a maze to\nmake the enemies\nrun longer.",
          null,
          this
        )
      );
    }
    if (this.level === 5) {
      this.inventory.push(
        new Card(
          "Slow tower",
          "Slows enemies,\nbut low damage\nand range.",
          null,
          this
        )
      );
    }
    if (this.level === 11) {
      this.inventory.push(
        new Card(
          "Laser tower",
          "More damage and\nrange, but even\nmore expensive.",
          null,
          this
        )
      );
    }
    if (this.level === 11) {
      this.inventory.push(new Card("Bank", "Cash. Money.", null, this));
    }

    this.on_victory();
  }

  tick(ms) {
    if (this.lives === 0) {
      return;
    }
    for (let tower of this.towers) {
      tower.tick(ms);
    }
    for (let enemy of this.enemies) {
      enemy.tick(ms);
    }
    this.delay -= seconds(ms);
    while (this.delay <= 0 && this.remaining.length > 0) {
      const enemy = this.remaining.pop();
      this.enemies.push(enemy);
      this.delay += enemy.delay;
    }

    let died = [];
    for (let enemy of this.enemies) {
      if (enemy.health <= 0.0) {
        died.push(enemy);
      }
    }

    for (let dead of died) {
      this.money += dead.reward;
    }

    let finished = [];

    for (let enemy of this.enemies) {
      if (!died.includes(enemy) && enemy.c >= this.columns) {
        finished.push(enemy);
        this.lives -= 1;
        this.perfect = false;
      }
    }

    if (this.lives === 0) {
      return;
    }

    let removed = [...died, ...finished];

    this.enemies = this.enemies.filter((enemy) => {
      return !removed.includes(enemy);
    });
    for (let tower of this.towers) {
      tower.pick_target(this.enemies);
    }

    if (this.remaining.length === 0 && this.enemies.length === 0) {
      this.victory();
    }
  }
}

class Card {
  constructor(name, description, price, game) {
    this.name = name;
    this.description = description;
    this._price = price;
    this.game = game;
  }

  get price() {
    if (this._price != null) {
      return this._price;
    }
    return this.game.price(this.name);
  }

  get full_text() {
    return (
      "" +
      this.name +
      "\n\n" +
      "Cost: " +
      this.price +
      "\n\n" +
      this.description
    );
  }
}

module.exports = {
  Tower,
  Game,
};
