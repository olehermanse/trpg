import { Game } from "../libtrpg/game";
import { Painter } from "./painter";
import type { XY } from "@olehermanse/utils";
import { Draw } from "@olehermanse/utils/draw.js";
import { OXY, oxy } from "../todo_utils";

class Application {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
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
  mouse: XY;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    columns: number = 20,
    rows: number = 13,
    width: number = 1600,
    height: number = 1200,
    scale: number = 1.0,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.painter = new Painter(this);
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

    this.game = new Game(this.columns, this.rows);
    this.mouse = null;

    canvas.addEventListener("mousedown", (e) => {
      const offset: OXY = oxy(e.offsetX, e.offsetY, canvas);
      const pos: XY = offset.to_xy(this);
      this.mouse_click(pos);
      this.mouse_move(pos);
    });

    canvas.addEventListener("mousemove", (e) => {
      const offset: OXY = oxy(e.offsetX, e.offsetY, canvas);
      const pos: XY = offset.to_xy(this);
      this.mouse_move(pos);
    });

    window.addEventListener("mouseup", (e) => {
      const offset: OXY = oxy(e.offsetX, e.offsetY, canvas);
      const pos: XY = offset.to_xy(this);
      this.mouse_release(pos);
      this.mouse_move(pos);
    });

    document.addEventListener(
      "keydown",
      (event) => {
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
      (event) => {
        this.key_up(event.key);
      },
      false,
    );
  }

  draw() {
    Draw.rectangle(this.ctx, 0, 0, this.width, this.height, "black", "black");
    Draw.rectangle(this.ctx, 0, 0, 100, 100, "white", "white");
    Draw.rectangle(
      this.ctx,
      this.width - 100,
      this.height - 100,
      100,
      100,
      "white",
      "white",
    );
  }

  mouse_click(_pos: XY) {
  }

  mouse_release(_pos: XY) {
  }

  mouse_move(_pos: XY) {
  }

  key_down(_key: string) {
  }

  key_up(_key: string) {
  }

  tick(_ms: number) {
  }
}

export { Application };
