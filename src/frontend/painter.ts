import { Draw } from "@olehermanse/utils/draw.js";
import { Application } from "./application.ts"; // For access to width, height, game object
import { Player } from "../libtrpg/game.ts";

const SPRITESHEET = {
  "player": {
    "row": 0,
    "col": 0,
    "frames": 2,
  },
  "sword": {
    "row": 1,
    "col": 0,
    "frames": 2,
  },
  "pickaxe": {
    "row": 1,
    "col": 2,
    "frames": 2,
  },
  "axe": {
    "row": 1,
    "col": 4,
    "frames": 2,
  },
  "staff": {
    "row": 1,
    "col": 4,
    "frames": 2,
  },
  "selector": {
    "row": 2,
    "col": 0,
    "frames": 2,
  },
  "chest": {
    "row": 3,
    "col": 0,
  },
  "rock": {
    "row": 3,
    "col": 1,
    "frames": 3,
  },
  "crystal": {
    "row": 3,
    "col": 4,
  },
  "skeleton": {
    "row": 4,
    "col": 0,
    "frames": 4,
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
            resizeWidth: size,
            resizeHeight: size,
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

  draw_background() {
    const player: Player = this.application.game.player;
    const width = player.wh.width;
    const height = player.wh.height;
    let x = 0;
    let y = 0;
    const rock = this.sprites["rock"][0];
    if (rock != undefined) {
      this.ctx.drawImage(
        rock,
        0,
        0,
      );
    }
    const crystal = this.sprites["crystal"][0];
    if (crystal != undefined) {
      this.ctx.drawImage(
        crystal,
        8 * width,
        7 * height,
      );
    }
    const chest = this.sprites["chest"][0];
    if (chest != undefined) {
      this.ctx.drawImage(
        chest,
        0 * width,
        6 * height,
      );
    }
    const skeleton = this.sprites["skeleton"][3];
    if (skeleton != undefined) {
      this.ctx.drawImage(
        skeleton,
        width * 3,
        height * 5,
      );
      this.ctx.drawImage(
        skeleton,
        width * 4,
        height * 4,
      );
      this.ctx.drawImage(
        skeleton,
        width * 3,
        height * 3,
      );
    }
    return;
    for (const [_name, frames] of Object.entries(this.sprites)) {
      for (const image of frames) {
        this.ctx.drawImage(
          image,
          x,
          y,
        );
        x += width;
        if (x > width * 4) {
          x = 0;
          y += height;
        }
      }
    }
  }

  draw_player() {
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
    this.ctx.translate(x, y);
    if (player.reversed) {
      this.ctx.scale(-1, 1);
    }
    const standing = this.sprites["player"][0];
    const walking = this.sprites["player"][1];
    this.ctx.drawImage(
      player.walk_counter < 1 ? standing : walking,
      -width / 2,
      -height / 2,
    );
    this.ctx.restore();
  }

  draw() {
    const width = this.application.width;
    const height = this.application.height;
    Draw.rectangle(this.ctx, 0, 0, width, height, "black", "black");
    this.draw_background();
    this.draw_player();
  }
}
