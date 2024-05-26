import { Draw } from "@olehermanse/utils/draw.js";
import { Application } from "./application.ts"; // For access to width, height, game object
import { Player } from "../libtrpg/game.ts";

export class Painter {
  ctx: CanvasRenderingContext2D;
  application: Application;

  player_image: Image;
  player_sprite: ImageBitmap | null;

  constructor(application: Application, ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.application = application;
    this.player_sprite = null;
    this.player_image = new Image();
    const size = this.application.game.grid.cell_width;
    this.player_image.onload = () => {
      Promise.all([
        createImageBitmap(this.player_image, 0, 0, 32, 32, {
          resizeWidth: size,
          resizeHeight: size,
          resizeQuality: "pixelated",
        }),
      ]).then((sprites) => {
        this.player_sprite = sprites[0];
      });
    };
    this.player_image.src = "/player.png";
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
    this.ctx.drawImage(
      this.player_sprite,
      x - width / 2,
      y - height / 2,
    );
  }

  draw() {
    const width = this.application.width;
    const height = this.application.height;
    Draw.rectangle(this.ctx, 0, 0, width, height, "black", "black");
    this.draw_player();
  }
}
