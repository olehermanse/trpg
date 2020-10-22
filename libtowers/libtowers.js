class Tower {
  constructor(c, r) {
    this.c = c;
    this.r = r;
    this.rotation = 0;
  }
  tick(ms) {
    this.rotation += 0.005 * ms;
  }
}

class Enemy {
  constructor(c, r) {
    this.c = c;
    this.r = r;
    this.rotation = 0;
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

  has_tower(c, r) {
    for (let t of this.towers) {
      if (t.c === c && t.r === r)
        return true;
    }
    return false;
  }
  place_tower(c, r) {
    console.assert(!this.has_tower(c, r));
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
  }
}

module.exports = {
  Game,
};
