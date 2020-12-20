const { limit } = require("./utils.js");

class Enemy {
  constructor(c, r, path) {
    this.c = c;
    this.r = r;
    this.color = "#ff0000";
    this.rotation = 0;
    this.target_rotation = 0;
    this.health = 100.0;
    this.max_health = this.health;
    this.path = path;
    this.path_index = 0;
    this.slow = 0.0;
    this.slow_time = 0.0;
    this.speed = 1.0;
    this.travelled = 0.0;
    this.reward = 1;
    this.delay = 1.0;
  }

  effective_speed() {
    return this.speed * (1 - this.slow * 0.5);
  }

  tick(ms) {
    const sec = (ms / 1000.0);
    this.slow_time -= sec;
    if (this.slow_time < 0.0) {
      this.slow_time = 0.0;
      this.slow = 0.0;
    }
    else if (this.slow > 1.0) {
      this.slow = 1.0;
    }

    if (this.rotation != this.target_rotation) {
      return this.update_rotation(ms);
    }

    const speed = this.effective_speed();
    const step = speed * sec;
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
      this.travelled += step;
      if (Math.sign(dx) > 0.0) {
        this.target_rotation = 0.0;
      }
      else {
        this.target_rotation = Math.PI;
      }
    }
    else {
      this.c = target.c;
    }
    if (Math.abs(dy) > step) {
      this.r += step * Math.sign(dy);
      this.travelled += step;
      if (Math.sign(dy) > 0.0) {
        this.target_rotation = 3 * Math.PI / 2;
      }
      else {
        this.target_rotation = Math.PI / 2;
      }
    }
    else {
      this.r = target.r;
    }
  }

  update_rotation(ms) {
    console.assert(this.rotation != this.target_rotation);
    const sec = ms / 1000;
    const speed = this.effective_speed() * 2.0 * 2 * Math.PI;
    const step = speed * sec;
    const delta = this.target_rotation - this.rotation;
    let difference = Math.abs(delta);
    let direction = Math.sign(delta);
    if (difference > Math.PI) {
      difference = 2 * Math.PI - difference;
      direction = -1 * direction;
    }
    if (difference <= step) {
      this.rotation = this.target_rotation;
      return;
    }
    this.rotation += step * direction;
    if (this.rotation < 0) {
      this.rotation += 2 * Math.PI;
    }
  }
}

class Speedy extends Enemy {
  constructor(c, r, path) {
    super(c, r, path);
    this.speed = this.speed * 2;
    this.color = "#ffff00";
    this.reward = 4;
    this.health = 150.0;
    this.max_health = this.health;
    this.delay = this.delay / 2;
  }
}

class Boss extends Enemy {
  constructor(c, r, path) {
    super(c, r, path);
    this.speed = this.speed / 2;
    this.color = "#000000";
    this.reward = 10;
    this.health = 4000.0;
    this.max_health = this.health;
    this.delay = this.delay * 2;
  }
}

class Enemies {
  static specific(mob, n, c, r, path) {
    let enemies = [];
    for (let i = 0; i < n; ++i) {
      enemies.push(new mob(c, r, path));
    }
    return enemies;
  }

  static non_bosses(c, r, level, path) {
    switch (level) {
      case 1:
      case 2:
        return this.specific(Enemy, 1, c, r, path);
      case 3:
        return this.specific(Enemy, 2, c, r, path);
      default:
        break;
    }
    let enemy_types = [Enemy, Speedy];
    let weak = enemy_types[0];
    let strong = enemy_types[1];
    let enemies = [];

    if (strong != null) {
      const strong_enemies = (level - 5);
      for (let i = 0; i < strong_enemies; ++i) {
        enemies.push(new strong(c, r, path));
      }
    }

    if (weak != null) {
      const weak_enemies = (level > 15) ? 0 : limit(1, level * 2 - 4, 12);
      for (let i = 0; i < weak_enemies; ++i) {
        enemies.push(new weak(c, r, path));
      }
    }

    enemies.reverse();
    return enemies;
  }

  static bosses(c, r, level, path) {
    const bosses = (level / 10) ** 2;
    return this.specific(Boss, bosses, c, r, path);
  }

  static create(c, r, level, path) {
    if (level % 10 === 0) {
      return this.bosses(c, r, level, path);
    }
    return this.non_bosses(c, r, level, path);
  }
}

module.exports = {
  Enemies,
};
