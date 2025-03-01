import { Battle, Enemy, Game, GameSave } from "../libtrpg/game.ts";
import { Painter } from "./painter.ts";
import type { XY } from "@olehermanse/utils";
import { cr, get_cookie, Grid, OXY, oxy } from "@olehermanse/utils/funcs.js";

function get_save(): GameSave {
  const cookie = get_cookie("trpg_save_data");
  if (cookie === null) {
    return { permanents: [] };
  }
  const save: GameSave = JSON.parse(cookie);
  return save;
}

function set_permanent_cookie(key: string, value: string) {
  document.cookie =
    `${key}=${value}; SameSite=None; Secure; Max-Age=31536000; Path=/`;
}

function put_save(save: GameSave) {
  set_permanent_cookie("trpg_save_data", JSON.stringify(save));
}

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
    this.game = new Game(grid, get_save());
    this.game.player.save_function = put_save;
    this.painter = new Painter(this, canvas, columns, rows, 16);
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
        if (event.repeat) {
          return;
        }
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
    if (this.game.restart === true) {
      const grid = new Grid(this.width, this.height, this.columns, this.rows);
      this.game = new Game(grid, get_save());
      this.game.player.save_function = put_save;
    }
  }

  mouse_release(_pos: XY) {}

  mouse_move(pos: XY) {
    this.game.hover(pos);
  }

  key_down(key: string) {
    this.game.keyboard.press(key);
    if (key === "1") {
      this.game.goto_state("zone");
      return;
    }
    if (key === "2") {
      this.game.level_up();
      return;
    }
    if (key === "3") {
      this.game.goto_state("world_map");
      return;
    }
    if (key === "4") {
      this.game.goto_state("loading");
      return;
    }
    if (key === "5") {
      this.game.battle = new Battle(
        this.game.player,
        new Enemy("Skeleton", 3, cr(0, 0), this.game.current_zone, this.game),
      );
      this.game.goto_state("battle");
      return;
    }
    if (key === "p") {
      console.log(this);
      return;
    }
    this.game.keyboard_update();
  }

  key_up(key: string) {
    this.game.keyboard.release(key);
  }

  tick(ms: number) {
    this.game.tick(ms);
    this.painter.tick(ms);
  }
}

export { Application };
