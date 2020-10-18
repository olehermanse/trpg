class Tower {
  constructor(c, r) {
    this.c = c;
    this.r = r;
  }
}

class Game {
  constructor(columns, rows) {
    this.rows = rows;
    this.columns = columns;
    this.towers = [];
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
  tick(ms) {

  }
}

module.exports = {
  Game,
};
