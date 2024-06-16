import { Game } from "../libtrpg/game.ts";
import { Painter } from "./painter.ts";
import type { XY } from "@olehermanse/utils";
import { Grid, OXY, oxy } from "@olehermanse/utils/funcs.js";

class Application {
  canvas: HTMLCanvasElement;
  painter: Painter;
  columns: number;
  rows: number;
  scale: number;
  width: number;
  height: number;
  real_width: number;
  real_height: number;
  grid_width: number;
  grid_size: number;
  line_width: number;
  grid_height: number;
  game: Game;
  mouse: XY | null;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    columns: number,
    rows: number,
    width: number,
    height: number,
    scale: number = 1.0,
  ) {
    this.canvas = canvas;
    this.columns = columns;
    this.rows = rows;
    this.scale = scale;
    this.width = width;
    this.height = height;
    this.real_width = Math.floor(this.scale * this.width);
    this.real_height = Math.floor(this.scale * this.height);

    this.grid_width = this.width;
    this.grid_size = this.grid_width / this.columns;
    this.line_width = this.grid_size / 20;
    this.grid_height = this.rows * this.grid_size;

    const grid = new Grid(this.width, this.height, this.columns, this.rows);
    this.game = new Game(grid);
    this.game.current_zone.generate();
    this.painter = new Painter(this, ctx, columns, rows, 16);
    this.mouse = null;

    canvas.addEventListener("mousedown", (event: any) => {
      const offset: OXY = oxy(event.offsetX, event.offsetY, canvas);
      const pos: XY = offset.to_xy(this);
      this.mouse_click(pos);
      this.mouse_move(pos);
    });

    canvas.addEventListener("mousemove", (event: any) => {
      const offset: OXY = oxy(event.offsetX, event.offsetY, canvas);
      const pos: XY = offset.to_xy(this);
      this.mouse_move(pos);
    });

    window.addEventListener("mouseup", (event: any) => {
      const offset: OXY = oxy(event.offsetX, event.offsetY, canvas);
      const pos: XY = offset.to_xy(this);
      this.mouse_release(pos);
      this.mouse_move(pos);
    });

    document.addEventListener(
      "keydown",
      (event: any) => {
        if (event.key === " ") {
          // Prevent spacebar from scrolling page
          event.preventDefault();
        }
        this.key_down(event.key);
      },
      false,
    );

    document.addEventListener(
      "keyup",
      (event: any) => {
        this.key_up(event.key);
      },
      false,
    );
  }

  draw() {
    this.painter.draw();
  }

  mouse_click(pos: XY) {
    this.game.click(pos);
  }

  mouse_release(_pos: XY) {}

  mouse_move(_pos: XY) {}

  key_down(_key: string) {}

  key_up(_key: string) {}

  tick(ms: number) {
    this.game.tick(ms);
  }
}

export { Application };
