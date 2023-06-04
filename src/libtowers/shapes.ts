import { Tower } from "./towers.js";
import { randint } from "./utils.js";

class Shape {
  c: number;
  r: number;
  rocks: any[];

  constructor(c: number, r: number, rocks: any[]) {
    this.c = c;
    this.r = r;
    this.rocks = rocks;
  }

  translate(c: number, r: number) {
    for (let rock of this.rocks) {
      rock.c += c;
      rock.r += r;
    }
  }

  static _get_shape() {
    let shapes = [];
    // 1x1
    shapes.push([[1]]);
    // 2x1
    shapes.push([[1, 1]]);
    shapes.push([[1], [1]]);
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
    shapes.push([[1, 1, 1]]);
    shapes.push([[1, 1, 1, 1]]);
    shapes.push([[1], [1], [1]]);
    shapes.push([[1], [1], [1], [1]]);

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

  static get_shape(): Shape {
    let base = Shape._get_shape();
    let rocks = [];
    let rows = base.length;
    let columns = base[0].length;
    for (let c = 0; c < columns; ++c) {
      for (let r = 0; r < rows; ++r) {
        if (base[r][c] === 0) {
          continue;
        }
        rocks.push(new Tower(c, r, "Rock", 1));
      }
    }
    return new Shape(columns, rows, rocks);
  }
}

export { Shape };
