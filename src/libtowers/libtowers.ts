import { Enemies } from "./enemies";
import { Tower } from "./towers";
import { Shape } from "./shapes";
import {
  get_rotation,
  position,
  randint,
  seconds,
  text_wrap,
} from "@olehermanse/utils/funcs.js";
import type { CR } from "@olehermanse/utils";

class Game {
  painter: any;
  paused: boolean;
  on_victory: any;
  level: number;
  lives: number;
  remaining: any[];
  money: number;
  rows: number;
  columns: number;
  towers: any[];
  enemies: any[];
  delay: number;
  path: any[];
  inventory: Card[];
  perfect: boolean;
  tiles: any[][];
  spawning: boolean;
  goal: CR;
  spawn: CR;

  constructor(columns: number, rows: number) {
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
        "Deals damage. Very cost effective. Always targets the furthest enemy.",
        null,
        this,
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
      "Spawn not on wall",
    );
    console.assert(
      this.tiles[this.goal.c][this.goal.r] === "wall",
      "Goal not on wall",
    );
    console.assert(
      this.tiles[this.spawn.c + 1][this.spawn.r] === null,
      "Spawn not accessible",
    );
    console.assert(
      this.tiles[this.goal.c - 1][this.goal.r] === null,
      "Goal not accessible",
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
        randint(2, this.rows - 2 - h),
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

  is_empty_rect(shape: Shape, col: number, row: number): boolean {
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

  place_path(c: number, r: number) {
    if (this.is_outside(c, r)) {
      return;
    }
    const tile = this.tiles[c][r];
    if (tile === "spawn" || tile === "goal") {
      return;
    }
    this.tiles[c][r] = "path";
  }

  is_outside(c: number, r: number): boolean {
    return c < 0 || r < 0 || r >= this.rows || c >= this.columns;
  }

  is_inside(c: number, r: number): boolean {
    return !this.is_outside(c, r);
  }

  is_empty(c: number, r: number): boolean {
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

  is_path(c: number, r: number) {
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

  set_path(path: any[]) {
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

  fill_distances(c: number, r: number, distance: number) {
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

  get_distance(c: number, r: number) {
    if (this.is_outside(c, r)) {
      return null;
    }
    const tile = this.tiles[c][r];
    if (!Number.isInteger(tile)) {
      return null;
    }

    return tile;
  }

  find_path(start_c: number, start_r: number) {
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

  get_tower(position: CR) {
    if (position === null) {
      return null;
    }
    if (!this.has_tower(position.c, position.r)) {
      return null;
    }
    return this.tiles[position.c][position.r];
  }

  price(card, position = null): number {
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

  can_afford(card, position: null | CR = null) {
    card = this.find_card(card);
    return this.money >= this.price(card.name, position);
  }

  _try_place_tower(c: number, r: number, card) {
    card = this.find_card(card);
    let name = card === "Rock" ? "Rock" : card.name;
    if (!this.spawning) {
      console.assert(
        this.can_afford(name, position(c, r)),
        "Cannot afford tower",
      );
    }
    console.assert(this.is_empty(c, r), "Cannot place in non-empty");

    const tower = new Tower(c, r, name, this.price(name));
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

  place_tower(c: number, r: number, card) {
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

  has_tower(c: number, r: number): boolean {
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

  can_place(c: number, r: number, card): boolean {
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

  find_card(name: string) {
    for (let card of this.inventory) {
      if (card.name === name) {
        return card;
      }
    }
    return name;
  }

  grid_click(c: number, r: number, card): Tower | null {
    card = this.find_card(card);
    if (this.lives <= 0) {
      return null;
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
      this.path,
    ).reverse();
    this.paused = false;
    this.perfect = true;
    this.delay = 0.0;
  }

  get banks(): number {
    let n = 0;
    for (let t of this.towers) {
      if (t.name === "Bank") {
        n += t.level;
      }
    }
    return n;
  }

  get level_reward() {
    let n: number = this.banks + 1;
    let fixed = 2 * n;
    let interest = (n * 10) / 100;
    return Math.floor(fixed + interest * this.money);
  }

  have_card(name: string) {
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
          "Blocks the path. Build a maze to make the enemies run longer.",
          null,
          this,
        ),
      );
    }
    if (this.level === 5) {
      this.inventory.push(
        new Card(
          "Slow tower",
          "Slows enemies, but low damage and range.",
          null,
          this,
        ),
      );
    }
    if (this.level === 11) {
      this.inventory.push(
        new Card(
          "Laser tower",
          "More damage and range, but even more expensive.",
          null,
          this,
        ),
      );
    }
    if (this.level === 11) {
      this.inventory.push(new Card("Bank", "Cash. Money.", null, this));
    }

    this.on_victory();
  }

  tick(ms: number) {
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
  name: string;
  description: string;
  _price: number;
  game: Game;

  constructor(name: string, description: string, price: number, game: Game) {
    this.name = name;
    this.description = text_wrap(description, 18);
    this._price = price;
    this.game = game;
  }

  get price(): number {
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

export { Card, Game };
