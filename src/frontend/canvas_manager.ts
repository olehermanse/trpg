import { number_string, position, xy } from "@olehermanse/utils/funcs.js";
import { Game } from "../libtowers/libtowers";
import { Tower } from "../libtowers/towers";
import { Draw } from "@olehermanse/utils/draw.js";
import { Painter } from "./painter";
import { UI } from "./ui";
import { UITooltip } from "../libdraw/ui_elements";
import { BG, FG, GREY } from "@olehermanse/utils/colors.js";
import type { Callback, CR, XY } from "@olehermanse/utils";

class CanvasManager {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  painter: Painter;
  screenshot: HTMLImageElement;
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
  grid_start: number;
  grid_height: number;
  grid_end: number;
  game: Game;
  ui: UI;
  space_pressed: boolean;
  preview: Tower;
  mouse: XY;
  tooltip: UITooltip;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    columns: number = 20,
    rows: number = 13,
    width: number = 1200,
    scale: number = 1.0,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.painter = new Painter(this);
    this.screenshot = null;
    this.columns = columns;
    this.rows = rows;
    this.scale = scale;
    this.width = width;
    this.real_width = Math.floor(this.scale * this.width);

    this.grid_width = this.width;
    this.grid_size = this.grid_width / this.columns;
    this.line_width = this.grid_size / 20;
    this.grid_start = this.grid_size;
    this.grid_height = this.rows * this.grid_size;
    this.grid_end = this.grid_start + this.grid_height;
    this.height = this.grid_end + this.grid_size;
    this.real_height = this.height * scale;

    this.game = new Game(this.columns, this.rows);
    this.game.spawn_rocks();
    const UI_X = 0;
    const UI_Y = this.grid_end - this.grid_size;
    const UI_W = this.width;
    const UI_H = this.grid_size * 2;
    const UI_C = FG;
    this.ui = new UI(
      UI_X,
      UI_Y,
      UI_W,
      UI_H,
      BG,
      UI_C,
      this.grid_size,
      this.line_width,
      this.painter,
    );
    this.ui.refresh(this.game);
    this.space_pressed = false;
    this.preview = null;
    this.mouse = null;
    this.tooltip = null;
  }

  canvas_to_grid_int(p: number, offset: number = 0) {
    return Math.floor((p - offset) / this.grid_size);
  }

  grid_to_canvas(p: null | number | CR, offset: number = 0) {
    if (p === null) {
      return p;
    }
    if (typeof p == "number") {
      return offset + p * this.grid_size + this.grid_size / 2;
    }
    return xy(
      this.grid_to_canvas(p.c),
      this.grid_to_canvas(p.r, this.grid_start),
    );
  }

  offset_to_canvas(p: number, canvas: HTMLCanvasElement) {
    return (p / canvas.getBoundingClientRect().width) * this.width;
  }

  draw_wall(ctx: CanvasRenderingContext2D, c: number, r: number) {
    Draw.rectangle(
      ctx,
      c * this.grid_size,
      this.grid_start + r * this.grid_size,
      this.grid_size,
      this.grid_size,
      BG,
    );
  }

  draw_path(ctx: CanvasRenderingContext2D, c: number, r: number) {
    const color = "rgba(200,200,200,0.5)";
    Draw.rectangle(
      ctx,
      c * this.grid_size,
      this.grid_start + r * this.grid_size,
      this.grid_size,
      this.grid_size,
      color,
    );
  }

  draw_spawn(ctx: CanvasRenderingContext2D, c: number, r: number) {
    const color = "rgba(0,128,0,1)";
    Draw.rectangle(
      ctx,
      c * this.grid_size,
      this.grid_start + r * this.grid_size,
      this.grid_size,
      this.grid_size,
      color,
    );
  }

  draw_goal(ctx: CanvasRenderingContext2D, c: number, r: number) {
    const color = "rgba(200,200,0,1)";
    Draw.rectangle(
      ctx,
      c * this.grid_size,
      this.grid_start + r * this.grid_size,
      this.grid_size,
      this.grid_size,
      color,
    );
  }

  draw_tile(ctx: CanvasRenderingContext2D, c: number, r: number) {
    const tile = this.game.tiles[c][r];
    if (tile === "wall") {
      this.draw_wall(ctx, c, r);
    } else if (tile === "path") {
      this.draw_path(ctx, c, r);
    } else if (tile === "spawn") {
      this.draw_spawn(ctx, c, r);
    } else if (tile === "goal") {
      this.draw_goal(ctx, c, r);
    }
  }

  draw_tiles(ctx: CanvasRenderingContext2D) {
    for (let c = 0; c < this.columns; ++c) {
      for (let r = 0; r < this.rows; ++r) {
        this.draw_tile(ctx, c, r);
      }
    }
  }

  draw_enemies() {
    this.painter.paint_all(this.game.enemies);
  }

  draw_towers() {
    this.painter.paint_all(this.game.towers);
  }

  draw_preview(ctx: CanvasRenderingContext2D) {
    if (this.preview === null) {
      return;
    }
    ctx.globalAlpha = 0.3;
    let pos = this.grid_to_canvas(this.preview);
    let r = this.grid_size * this.preview.range;
    Draw.circle(ctx, pos.x, pos.y, r, null, "black", this.line_width);
    this.painter.paint(this.preview, { draw_price: true });
    ctx.globalAlpha = 1.0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.game.lives <= 0 && this.screenshot != null) {
      let w = this.width;
      let h = this.height;
      Draw.rectangle(ctx, 0, 0, w, h, GREY);
      Draw.image(ctx, this.screenshot, w / 4, h / 4, w / 2, h / 2);
      let level = this.game.level;
      let cash = this.game.money;
      Draw.text(ctx, w / 2, (1 * h) / 8, "Game over", BG, this.width / 12);
      Draw.text(
        ctx,
        w / 2,
        h / 2 + (3 * h) / 10,
        "Level: " + level,
        BG,
        this.width / 24,
      );
      Draw.text(
        ctx,
        w / 2,
        h / 2 + (4 * h) / 10,
        "" + number_string(cash) + "$",
        BG,
        this.width / 24,
      );
      return;
    }
    // Background:
    Draw.rectangle(ctx, 0, 0, this.width, this.height, BG);

    // Grid:
    Draw.rectangle(
      ctx,
      0,
      this.grid_start,
      this.grid_width,
      this.grid_height,
      FG,
    );
    Draw.grid(
      ctx,
      this.grid_size,
      0,
      this.grid_start,
      this.width,
      this.grid_height,
    );
    // Game elements:
    this.draw_tiles(ctx);
    this.draw_towers();
    this.draw_enemies();

    // UI elements:
    if (this.game.lives > 0) {
      // UI:
      this.draw_preview(ctx);
      Draw.rectangle(ctx, 0, 0, this.width, this.grid_start, BG);
      this.ui.draw(ctx);
    } else {
      Draw.rectangle(ctx, 0, 0, this.width, this.grid_start, BG);
      this.screenshot = new Image();
      this.screenshot.src = this.canvas.toDataURL();
      this.draw(ctx); // Screenshot taken, draw game over screen
    }

    // Hover tooltips:
    this.painter.paint_tooltip(this.tooltip);
  }

  mouse_click(x: number, y: number) {
    this.ui.click(x, y);

    if (this.ui.selected === null) {
      return;
    }

    const card = this.ui.selected.card;
    this.game.grid_click(
      this.canvas_to_grid_int(x),
      this.canvas_to_grid_int(y, this.grid_start),
      card,
    );
  }

  update_preview(c: number, r: number, name: string) {
    if (c === null && this.preview === null) {
      return;
    }
    if (c === null) {
      c = this.preview.c;
      r = this.preview.r;
    }

    if (!this.game.can_place(c, r, name)) {
      this.preview = null;
      return;
    }

    if (this.preview === null) {
      this.preview = new Tower(c, r, name, this.game.price(name));
    } else {
      this.preview.r = r;
      this.preview.c = c;
      this.preview.price = this.game.price(name, position(c, r));
    }

    if (this.game.has_tower(c, r) && this.game.tiles[c][r].name === name) {
      this.preview.level = this.game.tiles[c][r].level + 1;
      this.preview.rotation = this.game.tiles[c][r].rotation;
      return;
    }
    this.preview.rotation = Math.PI / 2;
    this.preview.level = 1;
  }

  update_tooltip(x: number, y: number, hovered: any[]) {
    let found = null;
    for (let x of hovered) {
      if (x.card != null) {
        found = x;
      }
    }
    if (found === null) {
      if (this.tooltip != null) {
        this.tooltip.fade_out();
      }
      return;
    }
    if (this.tooltip === null) {
      this.tooltip = new UITooltip(xy(x, y), found.card);
      this.tooltip.fade_in();
      return;
    }
    this.tooltip.pos.x = x;
    this.tooltip.pos.y = y;
    this.tooltip.card = found.card;
    this.tooltip.fade_in();
  }

  mouse_move(x: number, y: number) {
    this.mouse = xy(x, y);
    let hovered = this.ui.hover(x, y);
    this.update_tooltip(x, y, hovered);
    let c = this.canvas_to_grid_int(x);
    let r = this.canvas_to_grid_int(y, this.grid_start);
    if (this.ui.selected === null) {
      return;
    }
    let name = this.ui.selected.card.name;
    this.update_preview(c, r, name);
  }

  mouse_release(x: number, y: number) {
    this.ui.release(x, y);
  }

  key_down(key: string) {
    if (key === " ") {
      if (!this.space_pressed && this.game.paused) {
        this.ui.start_button.on_click(this.ui.start_button);
      }
      this.space_pressed = true;
    }
  }

  key_up(key: string) {
    if (key === " ") {
      this.space_pressed = false;
    }
  }

  setup_events(
    canvas: HTMLCanvasElement,
    on_start_click: Callback,
    on_victory: Callback,
  ) {
    this.ui.start_button.on_click = on_start_click;
    this.game.on_victory = on_victory;

    canvas.addEventListener("mousedown", (e) => {
      const x = this.offset_to_canvas(e.offsetX, canvas);
      const y = this.offset_to_canvas(e.offsetY, canvas);
      this.mouse_click(x, y);
      this.mouse_move(x, y);
    });

    canvas.addEventListener("mousemove", (e) => {
      const x = this.offset_to_canvas(e.offsetX, canvas);
      const y = this.offset_to_canvas(e.offsetY, canvas);
      this.mouse_move(x, y);
    });

    window.addEventListener("mouseup", (e) => {
      const x = this.offset_to_canvas(e.offsetX, canvas);
      const y = this.offset_to_canvas(e.offsetY, canvas);
      this.mouse_release(x, y);
      this.mouse_move(x, y);
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

  tick(ms) {
    if (this.tooltip != null) {
      this.tooltip.update(ms);
    }
    if (this.game.lives <= 0) {
      return;
    }
    if (!this.game.paused) {
      this.game.tick(ms);
      if (this.mouse != null) {
        this.mouse_move(this.mouse.x, this.mouse.y);
      }
    }
    this.ui.interest.text = "+ " + number_string(this.game.level_reward) + "";
    this.ui.money.text = "$ " + number_string(this.game.money) + "";
    this.ui.level.text = "Level: " + this.game.level;
    this.ui.lives.text = "Lives: " + this.game.lives;
  }
}

export { CanvasManager };
