import { Drawer } from "../todo_utils.ts";
import { Application } from "./application.ts"; // For access to width, height, game object
import { Entity, Player, Tile } from "../libtrpg/game.ts";
import { CR } from "@olehermanse/utils";
import { cr, wh, xy } from "@olehermanse/utils/funcs.js";

class SpriteLocation {
  cr: CR;
  frames: number;
  constructor(r: number, c: number, frames?: number) {
    this.cr = cr(c, r);
    this.frames = frames ?? 1;
  }
}

const SPRITESHEET = {
  player: new SpriteLocation(0, 0, 2),
  sword: new SpriteLocation(1, 0, 2),
  pickaxe: new SpriteLocation(1, 2, 2),
  axe: new SpriteLocation(1, 4, 2),
  staff: new SpriteLocation(1, 4, 2),
  selector: new SpriteLocation(2, 0, 2),
  chest: new SpriteLocation(3, 0),
  rock: new SpriteLocation(3, 1, 3),
  crystal: new SpriteLocation(3, 4),
  skeleton: new SpriteLocation(4, 0, 4),
  fog: new SpriteLocation(5, 0, 5),
};

type SpriteCallback = {
  (spritesheet: ImageBitmap[][]): void;
};

function load_sprites(
  url: string,
  columns: number,
  rows: number,
  cell_width: number,
  cell_height: number,
  callback: SpriteCallback,
) {
  const image = new Image();
  const sprites: ImageBitmap[] = [];
  let frames = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      frames.push(new SpriteLocation(r, c));
    }
  }
  image.onload = () => {
    Promise.all(
      frames.map((loc) =>
        createImageBitmap(
          image,
          loc.cr.c * cell_width,
          loc.cr.r * cell_height,
          cell_width,
          cell_height,
          {
            resizeQuality: "pixelated",
          },
        )
      ),
    ).then((bitmaps: ImageBitmap[]) => {
      for (let i = 0; i < bitmaps.length; i++) {
        const sprite = bitmaps[i];
        sprites.push(sprite);
      }
      const spritesheet: ImageBitmap[][] = [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < columns; c++) {
          row.push(sprites[r * columns + c]);
        }
        spritesheet.push(row);
      }
      callback(spritesheet);
    });
  };
  image.src = url;
}

function get_font_data(font: ImageBitmap[][]) {
  const FONT_MAP = [
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "abcdefghijklmnopqrstuvwxyz",
    "1234567890",
    "!+-*/\"'_., ^?",
  ];
  const map: Record<string, ImageBitmap> = {};
  for (let r = 0; r < FONT_MAP.length; r++) {
    const row = FONT_MAP[r];
    for (let c = 0; c < row.length; ++c) {
      map[row[c]] = font[r][c];
    }
  }
  return map;
}

export class Painter {
  canvas_drawer: Drawer<HTMLCanvasElement>;
  offscreen_drawer: Drawer<OffscreenCanvas>;
  application: Application;
  real_scale: number;
  columns: number;
  rows: number;
  size: number;

  spritesheet: HTMLImageElement;
  sprites: Record<string, ImageBitmap[]>;
  font: Record<string, ImageBitmap>;

  constructor(
    application: Application,
    canvas: HTMLCanvasElement,
    columns: number,
    rows: number,
    size: number,
  ) {
    this.columns = columns;
    this.rows = rows;
    this.size = size;
    this.font = {};
    this.canvas_drawer = new Drawer(canvas, false);
    this.offscreen_drawer = new Drawer(
      new OffscreenCanvas(columns * size, rows * size),
      false,
    );
    this.application = application;
    this.real_scale = this.application.scale *
      this.application.game.grid.cell_width;
    this.spritesheet = new Image();
    this.sprites = {};
    let frames = [];
    for (const [key, value] of Object.entries(SPRITESHEET)) {
      this.sprites[key] = [];
      const n = value.frames ?? 1;
      for (let i = 0; i < n; i++) {
        const frame = {
          x: (i + value.cr.c) * 16,
          y: value.cr.r * 16,
          name: key,
        };
        frames.push(frame);
      }
    }
    const saved_state = this.application.game.state;
    this.application.game.state = "loading";
    this.spritesheet.onload = () => {
      Promise.all(
        frames.map((frame) =>
          createImageBitmap(this.spritesheet, frame.x, frame.y, 16, 16, {
            resizeQuality: "pixelated",
          })
        ),
      ).then((bitmaps) => {
        for (let i = 0; i < bitmaps.length; i++) {
          const sprite = bitmaps[i];
          const name = frames[i].name;
          this.sprites[name].push(sprite);
        }
        load_sprites("/font.png", 26, 4, 5, 8, (font) => {
          this.font = get_font_data(font);
          this.application.game.state = saved_state;
        });
      });
    };
    this.spritesheet.src = "/sprites.png";
  }

  draw_entity(entity: Entity) {
    const sprite = this.sprites[entity.name][entity.variant];
    if (sprite === undefined) {
      return;
    }
    const player: Player = this.application.game.player;
    const width = player.wh.width;
    const height = player.wh.height;
    const pos = entity.cr;
    const x = Math.floor(pos.c * width);
    const y = Math.floor(pos.r * height);
    this.offscreen_drawer.sprite(sprite, xy(x, y));
  }

  draw_fog(tile: Tile) {
    if (this.sprites["fog"].length < 5) {
      return;
    }
    this.offscreen_drawer.sprite(this.sprites["fog"][tile.light], tile.xy);
  }

  draw_zone() {
    let drew_player = false;
    const player = this.application.game.player;
    for (let entity of this.application.game.current_zone.get_entities()) {
      if (!drew_player && entity.xy.y > player.xy.y) {
        this.draw_player();
        drew_player = true;
      }
      this.draw_entity(entity);
    }
    if (!drew_player) {
      this.draw_player();
      drew_player = true;
    }
    for (let tiles of this.application.game.current_zone.tiles) {
      for (let tile of tiles) {
        if (tile.light < 5) {
          this.draw_fog(tile);
        }
      }
    }
    this.draw_selector();
    return;
  }

  draw_selector() {
    const player: Player = this.application.game.player;
    if (player.destination === null) {
      return;
    }
    const frame = Math.round(0.6 * player.walk_counter) % 2;
    this.offscreen_drawer.sprite(
      this.sprites["selector"][frame],
      player.destination,
      true,
    );
  }

  draw_player() {
    // TODO: Move this to a more "proper" animation system
    const player: Player = this.application.game.player;
    const standing = this.sprites["player"][0];
    const walking = this.sprites["player"][1];
    this.offscreen_drawer.sprite(
      player.walk_counter < 1 ? standing : walking,
      player.xy,
      player.reversed,
    );
  }

  draw_levelup() {
    const width = this.offscreen_drawer.canvas.width;
    const height = this.offscreen_drawer.canvas.height;
    this.offscreen_drawer.rectangle(xy(0, 0), wh(width, height));

    const card_width = Math.floor(width / 3) - 10;
    const card_height = Math.floor(height / 2);
    let y = height / 2 - card_height / 2;
    const pos = xy(5, y);
    const size = wh(card_width, card_height);
    this.offscreen_drawer.rectangle(pos, size);
    pos.x += card_width + 10;
    this.offscreen_drawer.rectangle(pos, size);
    pos.x += card_width + 10;
    this.offscreen_drawer.rectangle(pos, size);

    y = Math.floor(y / 2 - 4);
    const text_width = 6 * "Level up!".length;
    let x = Math.floor(width / 2 - text_width / 2);

    this.offscreen_drawer.text("Level up!", this.font, xy(x, y));

    this.offscreen_drawer.sprite(
      this.sprites["player"][0],
      xy(Math.floor(width / 2 - 8), height - 2 * 16),
    );
  }

  draw_game() {
    // Check the current state and choose what "screen" to draw:
    if (this.application.game.state === "loading") {
      return;
    }
    if (this.application.game.state === "zone") {
      return this.draw_zone();
    }
    return this.draw_levelup();
  }

  draw() {
    try {
      // Draw backgrounds:
      this.canvas_drawer.clear();
      this.offscreen_drawer.clear();

      // Draw the game itself onto the offscreen canvas:
      this.draw_game();

      // "Flip" the offscreen canvas, transferring it to the DOM canvas:
      const bmp = this.offscreen_drawer.canvas.transferToImageBitmap();
      this.canvas_drawer.sprite(bmp, xy(0, 0));
    } catch (error) {
      console.log(error);
    }
  }
}
