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
  constructor(c, r) {
    this.c = c;
    this.r = r;
    this.rotation = 0;
    this.health = 100.0;
  }
  tick(ms) {
    this.rotation = 0.0;
    this.c += 0.001 * ms;
  }
}

class Game {
  constructor(columns, rows) {
    this.rows = rows;
    this.columns = columns;
    this.towers = [];
    this.enemies = [];
    this.time = 0;
  }

  is_empty(c, r) {
    for (let t of this.towers) {
      if (t.c === c && t.r === r)
        return false;
    }
    return true;
  }
  place_tower(c, r) {
    console.assert(this.is_empty(c, r));
    this.towers.push(new Tower(c, r));
  }
  place_enemy(c, r) {
    this.enemies.push(new Enemy(c, r));
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
      this.place_enemy(-1, Math.floor(this.rows / 2));
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
