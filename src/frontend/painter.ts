import { Draw } from "@olehermanse/utils/draw.js";
import { Application } from "./application.ts"; // For access to width, height, game object
import { Entity, Player, Tile } from "../libtrpg/game.ts";
import { CR, XY } from "@olehermanse/utils";
import { cr, xy } from "@olehermanse/utils/funcs.js";

class SpriteLocation {
  cr: CR;
  frames: number;
  constructor(r, c, frames?: number) {
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

export class Painter {
  ctx: CanvasRenderingContext2D;
  application: Application;
  real_scale: number;
  columns: number;
  rows: number;
  size: number;
  offscreen_canvas: OffscreenCanvas;

  spritesheet: Image;
  sprites: Record<string, ImageBitmap[]>;

  draw_sprite(sprite, pos: XY, reversed?: boolean) {
    const ctx = this.offscreen_canvas.getContext("2d");
    ctx.save();
    ctx.translate(pos.x, pos.y);
    if (reversed) {
      ctx.scale(-1, 1);
      ctx.translate(-16, 0);
    }
    ctx.drawImage(sprite, 0, 0);
    ctx.restore();
  }

  constructor(
    application: Application,
    ctx: CanvasRenderingContext2D,
    columns: number,
    rows: number,
    size: number,
  ) {
    this.columns = columns;
    this.rows = rows;
    this.size = size;
    this.ctx = ctx;
    this.offscreen_canvas = new OffscreenCanvas(columns * size, rows * size);
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
    this.draw_sprite(sprite, xy(x, y));
  }

  draw_fog(tile: Tile) {
    if (this.sprites["fog"].length < 5) {
      return;
    }
    this.draw_sprite(this.sprites["fog"][tile.light], tile.xy);
  }

  draw_zone() {
    let drew_player = false;
    const player = this.application.game.player;
    for (let entity of this.application.game.current_zone.get_entities()) {
      if (!drew_player && entity.xy.y > player.xy.y) {
        this.draw_player();
        drew_player = true;
      }
      const c = entity.cr.c;
      const r = entity.cr.r;
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
    if (this.sprites["selector"].length < 2) {
      return;
    }
    if (this.application.game.player.destination === null) {
      return;
    }
    const player: Player = this.application.game.player;
    const frame = Math.round(0.6 * player.walk_counter) % 2;
    this.draw_sprite(this.sprites["selector"][frame], player.destination, true);
  }

  draw_player() {
    if (this.sprites["player"].length < 2) {
      return;
    }
    const player: Player = this.application.game.player;
    const standing = this.sprites["player"][0];
    const walking = this.sprites["player"][1];
    this.draw_sprite(
      player.walk_counter < 1 ? standing : walking,
      player.xy,
      player.reversed,
    );
  }

  draw_offscreen_canvas() {
    this.draw_zone();
  }

  draw() {
    const width = this.application.width;
    const height = this.application.height;
    Draw.rectangle(this.ctx, 0, 0, width, height, "black", "black");
    this.draw_offscreen_canvas();
    const bmp = this.offscreen_canvas.transferToImageBitmap();
    this.ctx.drawImage(bmp, 0, 0);
  }
}
