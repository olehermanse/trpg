import { Draw } from "@olehermanse/utils/draw.js";
import { Application } from "./application.ts"; // For access to width, height, game object
import { Entity, Player } from "../libtrpg/game.ts";
import { CR, XY } from "@olehermanse/utils";
import { cr } from "../todo_utils.ts";
import { xy } from "@olehermanse/utils/funcs.js";

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

  spritesheet: Image;
  sprites: Record<string, ImageBitmap[]>;

  draw_sprite(sprite, pos: XY, reversed?: boolean) {
    this.ctx.save();
    this.ctx.translate(pos.x, pos.y);
    if (reversed) {
      this.ctx.scale(-1, 1);
      this.ctx.translate(-this.real_scale, 0);
    }
    this.ctx.drawImage(sprite, 0, 0);
    this.ctx.restore();
  }

  constructor(application: Application, ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.application = application;
    this.real_scale = this.application.scale *
      this.application.game.grid.cell_width;
    this.spritesheet = new Image();
    this.sprites = {};
    const size = this.application.game.grid.cell_width;
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
            resizeWidth: size * this.application.scale,
            resizeHeight: size * this.application.scale,
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
    const width = player.wh.width * this.application.scale;
    const height = player.wh.height * this.application.scale;
    const pos = entity.cr;
    const x = Math.floor(pos.c * width);
    const y = Math.floor(pos.r * height);
    this.draw_sprite(sprite, xy(x, y));
  }

  draw_fog(pos: CR) {
    if (this.sprites["fog"].length < 5) {
      return;
    }
    const player: Player = this.application.game.player;
    const width = player.wh.width * this.application.scale;
    const height = player.wh.height * this.application.scale;
    const x = Math.floor(pos.c * width);
    const y = Math.floor(pos.r * height);
    const fog = this.sprites["fog"];

    this.draw_sprite(fog[1], xy(x, y));
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
      if (this.application.game.current_zone.tiles[c][r].fog === true) {
        this.draw_fog(cr(c, r));
      }
    }
    if (!drew_player) {
      this.draw_player();
      drew_player = true;
    }
    return;
  }

  draw_selector() {
    if (this.sprites["selector"].length < 2) {
      return;
    }
    if (this.application.game.player.destination === null) {
      return;
    }
    const half = this.application.game.current_zone.cell_width / 2;
    const player: Player = this.application.game.player;
    const x = (player.destination.x - half) * this.application.scale;
    const y = (player.destination.y - half) * this.application.scale;
    const frame = Math.round(0.6 * player.walk_counter) % 2;
    this.draw_sprite(this.sprites["selector"][frame], xy(x, y), true);
  }

  draw_player() {
    this.draw_selector();
    const player: Player = this.application.game.player;
    const x = player.xy.x;
    const y = player.xy.y;
    const width = player.wh.width;
    const height = player.wh.height;
    if (this.sprites["player"].length < 2) {
      Draw.rectangle(
        this.ctx,
        x - width / 2,
        y - height / 2,
        width,
        height,
        "white",
        "white",
      );
      return;
    }
    this.ctx.save();
    this.ctx.translate(this.application.scale * x, this.application.scale * y);
    if (player.reversed) {
      this.ctx.scale(-1, 1);
    }
    const standing = this.sprites["player"][0];
    const walking = this.sprites["player"][1];
    this.ctx.drawImage(
      player.walk_counter < 1 ? standing : walking,
      (-this.application.scale * width) / 2,
      (-this.application.scale * height) / 2,
    );
    this.ctx.restore();
  }

  draw() {
    const width = this.application.width;
    const height = this.application.height;
    Draw.rectangle(this.ctx, 0, 0, width, height, "black", "black");
    this.draw_zone();
  }
}
