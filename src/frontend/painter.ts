import { Drawer } from "../todo_utils.ts";
import { Application } from "./application.ts"; // For access to width, height, game object
import {
  Choice,
  Entity,
  Player,
  Tile,
  Zone,
  ZoneTransition,
} from "../libtrpg/game.ts";
import { CR, XY } from "@olehermanse/utils";
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
  const frames: SpriteLocation[] = [];
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

interface Frame {
  x: number;
  y: number;
  name: string;
}

export class Painter {
  canvas_drawer: Drawer<HTMLCanvasElement>;
  offscreen_drawer: Drawer<OffscreenCanvas>;
  real_scale: number;

  spritesheet: HTMLImageElement;
  sprites: Record<string, ImageBitmap[]>;
  font: Record<string, ImageBitmap>;
  clock: number = 0;

  constructor(
    public application: Application,
    canvas: HTMLCanvasElement,
    public columns: number,
    public rows: number,
    public size: number,
  ) {
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
    const frames: Frame[] = [];
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
        frames.map((frame: Frame) =>
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

  tick(ms: number) {
    this.clock += ms;
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
    this.offscreen_drawer.sprite(sprite, xy(x, y), entity.reversed);
  }

  draw_fog(tile: Tile) {
    if (this.sprites["fog"].length < 5) {
      return;
    }
    this.offscreen_drawer.sprite(this.sprites["fog"][tile.light], tile.xy);
  }

  draw_one_zone(zone: Zone) {
    let drew_player = false;
    const player = this.application.game.player;
    for (const entity of zone.get_entities()) {
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
    for (const tiles of zone.tiles) {
      for (const tile of tiles) {
        if (tile.light < 5) {
          this.draw_fog(tile);
        }
      }
    }
    this.draw_selector();
  }

  draw_transition(transition: ZoneTransition) {
    const offset = transition.xy_from;
    this.offscreen_drawer.ctx.save();
    this.offscreen_drawer.ctx.translate(offset.x, offset.y);
    this.draw_one_zone(transition.from);
    this.offscreen_drawer.ctx.restore();

    const inv = transition.xy_to;
    this.offscreen_drawer.ctx.save();
    this.offscreen_drawer.ctx.translate(inv.x, inv.y);
    this.draw_one_zone(transition.to);
    this.offscreen_drawer.ctx.restore();
  }

  draw_zone() {
    if (this.application.game.transition !== null) {
      this.draw_transition(this.application.game.transition);
      return;
    }
    this.draw_one_zone(this.application.game.current_zone);
  }

  draw_selector() {
    const player: Player = this.application.game.player;
    if (player.target === null) {
      return;
    }
    const frame = player.target.frame;
    this.offscreen_drawer.sprite(
      this.sprites["selector"][frame],
      player.target.xy,
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

  draw_card(choice: Choice) {
    let pos = choice.pos;
    if (choice.hovered) {
      pos = xy(pos.x, pos.y - 2);
    }

    this.offscreen_drawer.rectangle(pos, choice.size);
    const text_position = xy(pos.x + 5, pos.y + 6);
    const text = choice.name + "\n" + choice.description;
    this.offscreen_drawer.text(text, this.font, text_position);
  }

  draw_level_up() {
    const width = this.offscreen_drawer.canvas.width;
    const height = this.offscreen_drawer.canvas.height;
    this.offscreen_drawer.rectangle(xy(0, 0), wh(width, height));

    const choices = this.application.game.choices;
    this.draw_card(choices[0]);
    this.draw_card(choices[1]);
    this.draw_card(choices[2]);

    const y = Math.floor(choices[0].pos.y / 2 - 4);
    const text_width = 6 * "Level up!".length;
    const x = Math.floor(width / 2 - text_width / 2);

    this.offscreen_drawer.text("Level up!", this.font, xy(x, y));

    this.offscreen_drawer.sprite(
      this.sprites["player"][0],
      xy(Math.floor(width / 2 - 8), height - 2 * 16),
    );
  }

  draw_one_map(pos: XY, zone: Zone, scaling: number) {
    for (const tile of zone.all_tiles) {
      if (tile.is_empty()) {
        continue;
      }
      if (tile.light !== 5) {
        continue;
      }
      this.offscreen_drawer.white_square(
        xy(pos.x + scaling * tile.cr.c, pos.y + scaling * tile.cr.r),
        scaling,
      );
    }
  }

  draw_world_map() {
    const width = this.offscreen_drawer.canvas.width;
    const height = this.offscreen_drawer.canvas.height;
    this.offscreen_drawer.rectangle(xy(0, 0), wh(width, height));

    const center = xy(
      Math.floor(this.offscreen_drawer.canvas.width / 2),
      Math.floor(this.offscreen_drawer.canvas.height / 2),
    );
    const scaling = 2.0;
    const map_width = scaling * (this.columns - 1);
    const map_height = scaling * (this.rows - 1);
    const world_map_origin = xy(
      Math.floor(center.x - map_width / 2),
      Math.floor(center.y - map_height / 2),
    );
    const top_left = xy(
      world_map_origin.x - 2 * map_width,
      world_map_origin.y - 2 * map_height,
    );
    const top_left_cr = cr(
      this.application.game.current_zone.pos.c - 2,
      this.application.game.current_zone.pos.r - 2,
    );
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const zone_pos = xy(
          top_left.x + map_width * i,
          top_left.y + map_height * j,
        );
        const zone_pos_cr = cr(top_left_cr.c + i, top_left_cr.r + j);
        const zone = this.application.game.get_zone(zone_pos_cr);
        if (zone === null) {
          continue;
        }
        this.draw_one_map(zone_pos, zone, scaling);
      }
    }
    this.offscreen_drawer.white_square(
      xy(
        world_map_origin.x + scaling * this.application.game.player.cr.c,
        world_map_origin.y + scaling * this.application.game.player.cr.r,
      ),
      scaling,
    );
    if (this.clock % 1000 < 333) {
      this.offscreen_drawer.white_square(
        xy(world_map_origin.x, world_map_origin.y),
        2,
      );
      this.offscreen_drawer.white_square(
        xy(world_map_origin.x + map_width, world_map_origin.y),
        2,
      );
      this.offscreen_drawer.white_square(
        xy(world_map_origin.x, world_map_origin.y + map_height),
        2,
      );
      this.offscreen_drawer.white_square(
        xy(world_map_origin.x + map_width, world_map_origin.y + map_height),
        2,
      );
    } else if (this.clock % 1000 < 666) {
      this.offscreen_drawer.black_square(
        xy(world_map_origin.x, world_map_origin.y),
        2,
      );
      this.offscreen_drawer.black_square(
        xy(world_map_origin.x + map_width, world_map_origin.y),
        2,
      );
      this.offscreen_drawer.black_square(
        xy(world_map_origin.x, world_map_origin.y + map_height),
        2,
      );
      this.offscreen_drawer.black_square(
        xy(world_map_origin.x + map_width, world_map_origin.y + map_height),
        2,
      );
    }
  }

  draw_game() {
    // Check the current state and choose what "screen" to draw:
    if (this.application.game.state === "loading") {
      return;
    }
    if (this.application.game.state === "zone") {
      return this.draw_zone();
    }
    if (this.application.game.state === "level_up") {
      return this.draw_level_up();
    }
    if (this.application.game.state === "world_map") {
      return this.draw_world_map();
    }
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
