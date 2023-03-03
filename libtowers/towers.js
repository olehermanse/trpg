import { get_rotation, dps, distance } from "./utils.js";

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

export { Tower };
