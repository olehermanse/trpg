import { Draw } from "@olehermanse/utils/draw.js";
import { Application } from "./application.ts"; // For access to width, height, game object
import { Player } from "../libtrpg/game.ts";

export class Painter {
  ctx: CanvasRenderingContext2D;
  application: Application;

  spritesheet: Image;
  sprites: ImageBitmap[];
  player_sprite: ImageBitmap | null;
  player_sprite_2: ImageBitmap | null;

  constructor(application: Application, ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.application = application;
    this.player_sprite = null;
    this.spritesheet = new Image();
    const size = this.application.game.grid.cell_width;
    this.spritesheet.onload = () => {
      Promise.all([
        createImageBitmap(this.spritesheet, 0, 0, 16, 16, {
          resizeWidth: size,
          resizeHeight: size,
          resizeQuality: "pixelated",
        }),
        createImageBitmap(this.spritesheet, 16, 0, 16, 16, {
          resizeWidth: size,
          resizeHeight: size,
          resizeQuality: "pixelated",
        }),
      ]).then((sprites) => {
        this.player_sprite = sprites[0];
        this.player_sprite_2 = sprites[1];
      });
    };
    this.spritesheet.src = "/sprites.png";
  }

  draw_player() {
    const player: Player = this.application.game.player;
    const x = player.xy.x;
    const y = player.xy.y;
    const width = player.wh.width;
    const height = player.wh.height;
    if (this.player_sprite === null) {
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
    this.ctx.drawImage(
      player.walk_counter < 1 ? this.player_sprite : this.player_sprite_2,
      -width / 2,
      -height / 2,
    );
    this.ctx.restore();
  }

  draw() {
    const width = this.application.width;
    const height = this.application.height;
    Draw.rectangle(this.ctx, 0, 0, width, height, "black", "black");
    this.draw_player();
  }
}
