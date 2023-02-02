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
    shapes.push([
      [1],
    ]);
    // 2x1
    shapes.push([
      [1, 1],
    ]);
    shapes.push([
      [1],
      [1],
    ]);
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
    shapes.push([
      [1, 1, 1],
    ]);
    shapes.push([
      [1, 1, 1, 1],
    ]);
    shapes.push([
      [1],
      [1],
      [1],
    ]);
    shapes.push([
      [1],
      [1],
      [1],
      [1],
    ]);

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
        rocks.push(new Tower(c, r, "rock"));
      }
    }
    return new Shape(columns, rows, rocks);
  }
}

class Tower {
  constructor(c, r, name, price, painter = null) {
    this.name = name;
    this.c = c;
    this.r = r;
    this.painter = painter;
    this.price = price;
    this.draw_price = false;
    this.rotation = 0;
    this.target = null;
    this.intensity = 0.0;
    this.range = null;
    this.level = 1;
    if (this.name === "gun") {
      this.charge_time = 0.3;
      this.dps = 60; // 3 per cost
      this.range = 3.0;
    } else if (this.name === "laser") {
      this.charge_time = 1.0;
      this.dps = 100; // 2 per cost
      this.range = 4.0;
    } else if (this.name === "slow") {
      this.charge_time = 1.0;
      this.dps = 10;
      this.slow = 1.0;
      this.range = 2.0;
    }
  }
  draw() {
    this.painter.paint(this, this.target);
  }
  get level_factor() {
    return 1 + 0.9 * (this.level - 1);
  }
  tick(ms) {
    if (["rock", "bank"].includes(this.name)) {
      return;
    }
    const sec = ms / 1000;
    if (this.target) {
      this.intensity += sec / this.charge_time;
      if (this.intensity > 1.0) {
        this.intensity = 1.0;
      }
      if (this.name === "slow") {
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
      ["laser", "slow"].includes(this.name) &&
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
    if (name === "rock") {
      return 1;
    }
    if (name === "gun") {
      return 20;
    }
    if (name === "slow") {
      return 25;
    }
    if (name === "laser") {
      return 50;
    }
    if (name === "bank") {
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
    let money = this.money;
    this.money = 10000;
    let counter = 0;
    for (let i = 0; i < 20; ++i) {
      let shape = Shape.get_shape();
      let h = shape.r;
      let w = shape.c;
      let p = position(randint(2, this.columns - 2 - w), randint(2, this.rows - 2 - h));
      if (!this.is_empty_rect(shape, p.c, p.r))
        continue;
      shape.translate(p.c, p.r);
      for (let rock of shape.rocks) {
        console.assert(this.can_place(rock.c, rock.r, "rock"));
        let r = this.place_tower(rock.c, rock.r, "rock");
        console.assert(r != null);
        counter += 1;
      }
    }
    this.money = money;
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

  price(selected, position = null) {
    if (selected === "bank") {
      return 100 + 100 * this.banks;
    }
    let tower = this.get_tower(position);
    if (tower === null) {
      return Tower.price(selected);
    }
    if (tower.name != selected) {
      return Tower.price(selected);
    }

    return Tower.price(selected) + 10;
  }

  can_afford(name, position = null) {
    return this.money >= this.price(name, position);
  }

  _try_place_tower(c, r, name) {
    console.assert(this.can_afford(name, position(c, r)), "Cannot afford tower");
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

  place_tower(c, r, name) {
    console.assert(this.can_afford(name, position(c, r)));
    console.assert(this.can_place(c, r, name));
    const price = this.price(name);
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
      towers[i] = this._try_place_tower(c, r, name);
      console.assert(towers[i] != null);
      console.assert(towers[i] != tower);
      console.assert(towers[i] === this.tiles[c][r]);
      this.money -= price;
      return towers[i];
    }

    const tower = this._try_place_tower(c, r, name);
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

  can_place(c, r, name) {
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
    if (name === "rock") {
      return false;
    }
    if (name === this.tiles[c][r].name && this.tiles[c][r].level >= 3) {
      return false;
    }
    return true;
  }

  grid_click(c, r, name) {
    if (this.lives <= 0) {
      return;
    }
    if (this.can_place(c, r, name)) {
      if (this.paused || !this.is_path(c, r)) {
        return this.place_tower(c, r, name);
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
      if (t.name === "bank") {
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

  victory() {
    console.assert(this.remaining.length === 0);
    console.assert(this.paused === false);
    if (this.perfect && this.lives < 3 && this.level % 5 === 0) {
      this.lives += 1;
    }
    this.paused = true;
    this.money += this.level_reward;
    this.level += 1;
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

module.exports = {
  Tower,
  Game,
};
