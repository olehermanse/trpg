function get_rotation(a, b) {
  return Math.atan2(a.r - b.r, b.c - a.c);
}

function dps(dps, ms) {
  return dps * (ms / 1000);
}

function distance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.c - b.c) ** 2);
}

function position(c, r) {
  return { "c": c, "r": r };
}

class Tower {
  constructor(c, r) {
    this.c = c;
    this.r = r;
    this.rotation = 0;
    this.target = null;
    this.intensity = 0.0;
  }
  tick(ms) {
    if (this.target) {
      this.intensity += 3 * (ms / 1000);
      if (this.intensity > 1.0) {
        this.intensity = 1.0;
      }
      this.target.health -= dps(25 * this.intensity, ms);
      this.rotation = get_rotation(this, this.target);
    }
  }
  pick_target(enemies) {
    if (enemies.length === 0) {
      this.target = null;
      this.intensity = 0.0;
      return;
    }
    const in_range = enemies.filter((e) => { return distance(this, e) < 3; });
    let new_target = null;
    if (in_range.length > 0) {
      new_target = in_range[0];
    }
    if (this.target != new_target) {
      this.target = new_target;
      this.intensity = 0.0;
    }

  }
}

class Enemy {
  constructor(c, r, path) {
    this.c = c;
    this.r = r;
    this.rotation = 0;
    this.health = 100.0;
    this.path = path;
    this.path_index = 0;
  }
  tick(ms) {
    this.rotation = 0.0;
    const step = 0.001 * ms;
    if (this.path_index >= this.path.length) {
      this.path_index = this.path.length - 1;
    }
    const target = this.path[this.path_index];
    const dx = target.c - this.c;
    const dy = target.r - this.r;
    if ((Math.abs(dx) < step && Math.abs(dy) < step) && (this.path_index + 1 < this.path.length)) {
      this.path_index += 1;
    }
    if (Math.abs(dx) > step) {
      this.c += step * Math.sign(dx);
      if (Math.sign(dx) > 0.0) {
        this.rotation = 0.0;
      }
      else {
        this.rotation = Math.PI;
      }
    }
    else {
      this.c = target.c;
    }
    if (Math.abs(dy) > step) {
      this.r += step * Math.sign(dy);
      if (Math.sign(dy) > 0.0) {
        this.rotation = 3 * Math.PI / 2;
      }
      else {
        this.rotation = Math.PI / 2;
      }
    }
    else {
      this.r = target.r;
    }
  }
}


class Game {
  constructor(columns, rows) {
    this.paused = true;
    this.on_victory = null;
    this.level = 1;
    this.remaining = 0;
    this.money = 50;
    this.price = 25;
    this.rows = rows;
    this.columns = columns;
    this.spawn = position(0, Math.floor(this.rows / 2));
    this.goal = position(columns - 1, this.spawn.r);
    this.towers = [];
    this.enemies = [];
    this.time = 0;
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
    this.tiles[this.spawn.c][this.spawn.r] = "spawn";
    this.tiles[this.goal.c][this.goal.r] = "goal";
    const success = this.create_path();
    console.assert(success === true, "Could not create path");
  }

  place_path(c, r) {
    if (this.is_outside(c, r)) {
      return;
    }
    const tile = this.tiles[c][r];
    if ((tile === "spawn") || (tile === "goal")) {
      return;
    }
    this.tiles[c][r] = "path";
  }

  is_outside(c, r) {
    return ((c < 0) || (r < 0) || (r >= this.rows) || (c >= this.columns));
  }

  is_empty(c, r) {
    return (this.tiles[c][r] === null || this.is_path(c, r));
  }

  is_path(c, r) {
    return (this.tiles[c][r] === "path");
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
    let visited = [];
    let current = position(start_c, start_r);
    while (true) {
      const c = current.c;
      const r = current.r;
      const up = position(c, r - 1);
      const down = position(c, r + 1);
      const left = position(c - 1, r);
      const right = position(c + 1, r);
      const all = [up, down, left, right];
      const distances = all.map((pos) => { return this.get_distance(pos.c, pos.r); })
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

  can_afford() {
    return (this.money >= this.price);
  }

  _try_place_tower(c, r) {
    console.assert(this.can_afford(), "Cannot afford tower");
    console.assert(this.is_empty(c, r), "Cannot place in non-empty");

    const tower = new Tower(c, r);
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

  place_tower(c, r) {
    const tower = this._try_place_tower(c, r);
    if (tower === null) {
      return false;
    }
    console.assert(this.tiles[c][r] === tower, "Tower not placed in tile");
    this.towers.push(tower);
    this.money -= this.price;
    return true;
  }

  place_enemy(c, r) {
    this.enemies.push(new Enemy(c, r, this.path));
  }

  grid_click(c, r) {
    if (this.is_empty(c, r) && this.can_afford()) {
      if (this.paused || !this.is_path(c, r)) {
        this.place_tower(c, r);
      }
    }
  }

  start() {
    console.assert(this.paused);
    console.assert(this.on_victory != null);
    console.assert(this.remaining === 0);
    this.remaining = this.level * 2;
    this.paused = false;
    this.time = 0;
  }

  victory() {
    console.assert(this.remaining === 0);
    console.assert(this.paused === false);
    this.paused = true;
    this.money += 20;
    this.level += 1;
    this.on_victory();
  }

  tick(ms) {
    for (let tower of this.towers) {
      tower.tick(ms);
    }
    for (let enemy of this.enemies) {
      enemy.tick(ms);
    }
    this.time += ms;
    while (this.time > 1000 && this.remaining > 0) {
      this.place_enemy(this.spawn.c - 1, this.spawn.r);
      this.time -= 1000;
      this.remaining -= 1;
    }

    let died = [];
    for (let enemy of this.enemies) {
      if (enemy.health <= 0.0) {
        died.push(enemy);
      }
    }

    this.money += died.length;

    let finished = [];

    for (let enemy of this.enemies) {
      if (!died.includes(enemy) && enemy.c >= this.columns) {
        finished.push(enemy);
      }
    }

    let removed = [...died, ...finished];

    this.enemies = this.enemies.filter((enemy) => { return !removed.includes(enemy); });
    for (let tower of this.towers) {
      tower.pick_target(this.enemies);
    }

    if (this.remaining === 0 && this.enemies.length === 0) {
      this.victory();
    }
  }
}

module.exports = {
  Game,
};
