import { Draw } from "@olehermanse/utils/draw.js";
import { Application } from "./application.ts"; // For access to width, height, game object
import { Entity, Player } from "../libtrpg/game.ts";

const SPRITESHEET = {
  player: {
    row: 0,
    col: 0,
    frames: 2,
  },
  sword: {
    row: 1,
    col: 0,
    frames: 2,
  },
  pickaxe: {
    row: 1,
    col: 2,
    frames: 2,
  },
  axe: {
    row: 1,
    col: 4,
    frames: 2,
  },
  staff: {
    row: 1,
    col: 4,
    frames: 2,
  },
  selector: {
    row: 2,
    col: 0,
    frames: 2,
  },
  chest: {
    row: 3,
    col: 0,
  },
  rock: {
    row: 3,
    col: 1,
    frames: 3,
  },
  crystal: {
    row: 3,
    col: 4,
  },
  skeleton: {
    row: 4,
    col: 0,
    frames: 4,
  },
};

export class Painter {
  ctx: CanvasRenderingContext2D;
  application: Application;

  spritesheet: Image;
  sprites: Record<string, ImageBitmap[]>;

  constructor(application: Application, ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.application = application;
    this.spritesheet = new Image();
    this.sprites = {};
    const size = this.application.game.grid.cell_width;
    let frames = [];
    for (const [key, value] of Object.entries(SPRITESHEET)) {
      this.sprites[key] = [];
      const n = value.frames ?? 1;
      for (let i = 0; i < n; i++) {
        const frame = {
          x: (i + value.col) * 16,
          y: value.row * 16,
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
    this.ctx.drawImage(
      sprite,
      this.application.scale * (entity.xy.x - entity.wh.width / 2),
      this.application.scale * (entity.xy.y - entity.wh.height / 2),
    );
  }

  draw_zone() {
    let drew_player = false;
    const player = this.application.game.player;
    for (let entity of this.application.game.current_zone.get_all()) {
      if (!drew_player && entity.xy.y > player.xy.y) {
        this.draw_player();
        drew_player = true;
      }
      const c = entity.cr.c;
      const r = entity.cr.r;
      if (this.application.game.current_zone.fog[c][r] === true) {
        continue;
      }
      this.draw_entity(entity);
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
    const player: Player = this.application.game.player;
    const destination: XY = player.destination;
    const x = destination.x;
    const y = destination.y;
    const width = player.wh.width;
    const height = player.wh.height;
    this.ctx.save();
    this.ctx.translate(
      this.application.scale * (x - width / 2),
      this.application.scale * (y - height / 2),
    );
    const selector = this.sprites["selector"];
    const frame = Math.round(0.6 * player.walk_counter) % 2;
    this.ctx.drawImage(selector[frame], 0, 0);
    this.ctx.restore();
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
