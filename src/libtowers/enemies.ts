import { shuffle } from "@olehermanse/utils/funcs.js";

class Enemy {
  type: string;
  c: number;
  r: number;
  rotation: number;
  target_rotation: number;
  health: number;
  path: any[];
  path_index: number;
  slow: number;
  slow_time: number;
  travelled: number;

  // Accessing static constants for enemy type:
  get reward(): number {
    //@ts-ignore
    return this.__proto__.constructor._REWARD;
  }
  get name(): string {
    //@ts-ignore
    return this.__proto__.constructor._NAME;
  }
  get max_health(): number {
    //@ts-ignore
    return this.__proto__.constructor._MAX_HEALTH;
  }
  get speed(): number {
    //@ts-ignore
    return 2.0 * this.__proto__.constructor._SPEED;
  }
  get delay(): number {
    return 1.0 / this.speed;
  }
  get current_speed(): number {
    return this.speed * (1 - this.slow * 0.8);
  }

  constructor(c: number, r: number, path: any) {
    this.type = "enemy";
    this.c = c;
    this.r = r;
    this.rotation = 0;
    this.target_rotation = 0;
    this.health = this.max_health;
    this.path = path;
    this.path_index = 0;
    this.slow = 0.0;
    this.slow_time = 0.0;
    this.travelled = 0.0;
  }

  tick(ms: number) {
    const sec = ms / 1000.0;
    this.slow_time -= sec;
    if (this.slow_time < 0.0) {
      this.slow_time = 0.0;
      this.slow = 0.0;
    } else if (this.slow > 1.0) {
      this.slow = 1.0;
    }

    if (this.rotation != this.target_rotation) {
      return this.update_rotation(ms);
    }

    const speed = this.current_speed;
    const step = speed * sec;
    if (this.path_index >= this.path.length) {
      this.path_index = this.path.length - 1;
    }
    const target = this.path[this.path_index];
    const dx = target.c - this.c;
    const dy = target.r - this.r;
    if (
      Math.abs(dx) < step &&
      Math.abs(dy) < step &&
      this.path_index + 1 < this.path.length
    ) {
      this.path_index += 1;
    }
    if (Math.abs(dx) > step) {
      this.c += step * Math.sign(dx);
      this.travelled += step;
      if (Math.sign(dx) > 0.0) {
        this.target_rotation = 0.0;
      } else {
        this.target_rotation = Math.PI;
      }
    } else {
      this.c = target.c;
    }
    if (Math.abs(dy) > step) {
      this.r += step * Math.sign(dy);
      this.travelled += step;
      if (Math.sign(dy) > 0.0) {
        this.target_rotation = (3 * Math.PI) / 2;
      } else {
        this.target_rotation = Math.PI / 2;
      }
    } else {
      this.r = target.r;
    }
  }

  update_rotation(ms: number) {
    console.assert(this.rotation != this.target_rotation);
    const sec = ms / 1000;
    const speed = this.current_speed * 2.0 * 2 * Math.PI;
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

class Red extends Enemy {
  static _REWARD = 2;
  static _NAME = "red";
  static _SPEED = 1.0;
  static _MAX_HEALTH = 150.0;
}

class Speedy extends Enemy {
  static _REWARD = 4;
  static _NAME = "speedy";
  static _SPEED = 2.0;
  static _MAX_HEALTH = 150.0;
}

class Boss extends Enemy {
  static _REWARD = 50;
  static _NAME = "boss";
  static _SPEED = 0.5;
  static _MAX_HEALTH = 8000.0;
}

class Purple extends Enemy {
  static _REWARD = 50;
  static _NAME = "purple";
  static _SPEED = 1.5;
  static _MAX_HEALTH = 4000.0;
}

class Mega extends Enemy {
  static _REWARD = 100;
  static _NAME = "mega";
  static _SPEED = 1.5;
  static _MAX_HEALTH = 80000.0;
}

class Final extends Enemy {
  static _REWARD = 100;
  static _NAME = "final";
  static _SPEED = 3.0;
  static _MAX_HEALTH = 40 * 80000.0;
}

class Enemies {
  static specific(mob: any, n: number, c: number, r: number, path: any[]) {
    let enemies = [];
    for (let i = 0; i < n; ++i) {
      enemies.push(new mob(c, r, path));
    }
    return enemies;
  }

  // @ts-ignore
  static create(c: number, r: number, level: number, lives: number, path) {
    if (level <= 4) {
      return this.specific(Red, level, c, r, path);
    } else if (level < 10) {
      return [
        ...this.specific(Speedy, 1 + (level % 5), c, r, path),
        ...this.specific(Red, level, c, r, path),
      ];
    }
    if (level == 10) {
      return this.specific(Boss, 1, c, r, path);
    }
    if (level < 15) {
      return this.specific(Speedy, level, c, r, path);
    }
    if (level < 20) {
      return this.specific(Purple, 1 + (level % 5), c, r, path);
    }
    if (level == 20) {
      return this.specific(Boss, 6, c, r, path);
    }
    if (level < 25) {
      return [
        ...this.specific(Boss, 6 + (level % 5), c, r, path),
        ...this.specific(Purple, 1 + (level % 5), c, r, path),
      ];
    }
    if (level == 25) {
      return this.specific(Boss, 14, c, r, path);
    }
    if (level == 26) {
      return this.specific(Purple, 14, c, r, path);
    }
    if (level <= 30) {
      let enemies = [];
      while (enemies.length < level) {
        if (enemies.length % 2 === 0) {
          enemies.push(...this.specific(Boss, 1, c, r, path));
        } else enemies.push(...this.specific(Purple, 1, c, r, path));
      }
      return enemies;
    }
    if (level < 40) {
      return this.specific(Mega, 1 + (level % 10), c, r, path);
    }
    if (level === 45) {
      return shuffle([
        ...this.specific(Red, 45, c, r, path),
        ...this.specific(Speedy, 45, c, r, path),
        ...this.specific(Boss, 45, c, r, path),
        ...this.specific(Purple, 45, c, r, path),
        ...this.specific(Mega, 45, c, r, path),
      ]);
    }
    if (level === 50) {
      return this.specific(Final, 1, c, r, path);
    }
    return this.specific(Mega, 40 + (level - 40) * 4, c, r, path);
  }
}

export { Enemies, Enemy };
