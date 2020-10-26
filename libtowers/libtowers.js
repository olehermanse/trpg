function get_rotation(a, b) {
  return Math.atan2(a.r - b.r, b.c - a.c);
}

function dps(dps, ms) {
  return dps * (ms / 1000);
}

function distance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.c - b.c) ** 2);
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
      return;
    }
    const target = this.path[this.path_index];
    const dx = target.c - this.c;
    const dy = target.r - this.r;
    if (Math.abs(dx) < step && Math.abs(dy) < step) {
      this.path_index += 1;
      return;
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
    this.rows = rows;
    this.columns = columns;
    this.spawn = { "c": 0, "r": Math.floor(this.rows / 2) };
    this.goal = { "c": columns - 1, "r": this.spawn.r };
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
    this.create_path();
  }

  add_to_path(c, r) {
    this.path.push({ "c": c, "r": r });
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
    return ((c < 0) || (r < 0) || (c >= this.rows) || (c >= this.columns));
  }

  is_empty(c, r) {
    return (this.tiles[c][r] === null || this.has_path(c, r));
  }

  has_path(c, r) {
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

  set_path() {
    for (let enemy of this.enemies) {
      enemy.path = this.path;
    }
  }

  create_path() {
    this.clear_path();
    let c = this.spawn.c;
    let r = this.spawn.r;
    while (true) {
      if (this.tiles[c][r] === "spawn") {
        this.add_to_path(c, r);
        ++c;
        continue;
      }
      if (this.tiles[c][r] === "goal") {
        this.add_to_path(c, r);
        this.add_to_path(c + 1, r);
        this.set_path();
        return true;
      }
      if (this.tiles[c][r] === "wall") {
        --c;
        ++r;
        if (!this.is_empty(c, r)) {
          return false;
        }
        continue;
      }
      if (this.tiles[c][r] instanceof Tower) {
        --c;
        --r;
      }
      if (!this.is_empty(c, r)) {
        return false;
      }

      this.tiles[c][r] = "path";
      this.add_to_path(c, r);

      ++c;
    }
  }

  place_tower(c, r) {
    console.assert(this.is_empty(c, r));

    const on_path = (this.has_path(c, r));
    if (on_path) {
      this.clear_path();
    }
    const tower = new Tower(c, r);
    this.tiles[c][r] = tower;

    if (!this.create_path()) {
      this.tiles[c][r] = null;
      this.create_path();
      return false;
    }

    this.towers.push(tower);
    return true;
  }

  place_enemy(c, r) {
    this.enemies.push(new Enemy(c, r, this.path));
  }

  tick(ms) {
    for (let tower of this.towers) {
      tower.tick(ms);
    }
    for (let enemy of this.enemies) {
      enemy.tick(ms);
    }
    this.time += ms;
    while (this.time > 1000) {
      this.place_enemy(this.spawn.c - 1, this.spawn.r);
      this.time -= 1000;
    }
    let removed = [];
    for (let enemy of this.enemies) {
      if (enemy.health <= 0.0 || enemy.c > this.columns) {
        removed.push(enemy);
      }
    }
    this.enemies = this.enemies.filter((enemy) => { return !removed.includes(enemy); });
    for (let tower of this.towers) {
      tower.pick_target(this.enemies);
    }
  }
}

module.exports = {
  Game,
};
