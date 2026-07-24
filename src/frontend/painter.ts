import { Application } from "./application.ts"; // For access to width, height, game object
import {
  Battle,
  BattleEvent,
  Choice,
  Creature,
  Entity,
  Player,
  Tile,
  Zone,
  ZoneTransition,
} from "../libtrpg/game.ts";
import { CR, XY } from "@olehermanse/utils";
import { cr, limit, wh, xy, xy_copy } from "@olehermanse/utils/funcs.js";
import { Drawer } from "@olehermanse/utils/draw.js";
import { UpgradeName } from "../libtrpg/upgrades.ts";

// Resolution: 256x192

export class SpriteMetadata {
  cr: CR;
  frames: number;
  constructor(
    r: number,
    c: number,
    frames?: number,
    public animation_data?: AnimationData,
  ) {
    this.cr = cr(c, r);
    this.frames = frames ?? 1;
  }
}

export interface AnimationFrame {
  index: number;
  time: number;
}

export function frame(index: number, time: number): AnimationFrame {
  return { index: index, time: time };
}

export class AnimationData {
  constructor(
    public frames: AnimationFrame[],
    public loop?: boolean,
  ) {
  }

  get_animator() {
    return new Animation(this.frames, this.loop);
  }
}

export class Animation {
  current_ms: number = 0;
  current_frame_index: number = 0;
  max_time: number;
  done: boolean = false;
  frames: AnimationFrame[] = [];
  constructor(
    frames: AnimationFrame[],
    public loop?: boolean,
  ) {
    // Translate frames from duration to end time:
    let sum = 0;
    for (const f of frames) {
      const frame: AnimationFrame = { time: f.time, index: f.index };
      const before = frame.time;
      frame.time += sum;
      sum += before;
      this.frames.push(frame);
    }
    // Max time is just the end time of the last frame:
    this.max_time = this.frames[this.frames.length - 1].time;
  }

  restart() {
    this.current_frame_index = 0;
    this.current_ms = 0;
    this.done = false;
  }

  get_current_frame(): number {
    return this.frames[this.current_frame_index].index;
  }

  get_next_time(): number {
    return this.frames[this.current_frame_index].time;
  }

  tick(ms: number) {
    if (this.done) {
      return;
    }
    this.current_ms += ms;
    const beyond_end = this.current_ms >= this.max_time;
    if (beyond_end) {
      if (!this.loop) {
        this.done = true;
        this.current_frame_index = this.frames.length - 1;
        return;
      }
      // Go back to start if necessary
      this.current_frame_index = 0;
      this.current_ms -= this.max_time;
      while (this.current_ms > this.max_time) {
        this.current_ms -= this.max_time;
      }
    }
    // Advance frame if necessary
    while (
      this.current_frame_index < this.frames.length - 1 &&
      this.current_ms > this.get_next_time()
    ) {
      this.current_frame_index += 1;
    }
  }
}

const SPRITESHEET = {
  Player: new SpriteMetadata(
    0,
    0,
    2,
    new AnimationData([frame(0, 250), frame(1, 250)], false),
  ),
  Sword: new SpriteMetadata(
    1,
    0,
    2,
    new AnimationData([frame(0, 250), frame(1, 250)], false),
  ),
  Pickaxe: new SpriteMetadata(
    1,
    2,
    2,
    new AnimationData([frame(0, 250), frame(1, 250)], false),
  ),
  Axe: new SpriteMetadata(
    1,
    4,
    2,
    new AnimationData([frame(0, 250), frame(1, 250)], false),
  ),
  Staff: new SpriteMetadata(
    1,
    4,
    2,
    new AnimationData([frame(0, 250), frame(1, 250)], false),
  ),
  Selector: new SpriteMetadata(2, 0, 2),
  Chest: new SpriteMetadata(3, 0),
  Rock: new SpriteMetadata(3, 1, 3),
  Crystal: new SpriteMetadata(3, 4),
  Skeleton: new SpriteMetadata(
    4,
    0,
    4,
    new AnimationData([
      frame(0, 350),
      frame(1, 350),
      frame(2, 350),
      frame(3, 350),
    ], false),
  ),
  Robe: new SpriteMetadata(
    4,
    12,
    4,
    new AnimationData([
      frame(0, 350),
      frame(1, 350),
      frame(2, 350),
      frame(3, 350),
    ], false),
  ),
  Golem: new SpriteMetadata(
    4,
    8,
    4,
    new AnimationData([
      frame(0, 350),
      frame(1, 350),
      frame(2, 350),
      frame(3, 350),
    ], false),
  ),
  Monk: new SpriteMetadata(
    4,
    4,
    4,
    new AnimationData([
      frame(0, 350),
      frame(1, 350),
      frame(2, 350),
      frame(3, 350),
    ], false),
  ),
  Fog: new SpriteMetadata(5, 0, 5),
  Attack: new SpriteMetadata(6, 0, 1),
  Heal: new SpriteMetadata(6, 1, 1),
  Might: new SpriteMetadata(6, 2, 1),
  Run: new SpriteMetadata(6, 3, 1),
  Fireball: new SpriteMetadata(6, 4, 1),
  Rend: new SpriteMetadata(6, 5, 1),
  Elixir: new SpriteMetadata(6, 6, 1),
  Pact: new SpriteMetadata(6, 7, 1),
  Physique: new SpriteMetadata(8, 0, 1),
  Haste: new SpriteMetadata(8, 1, 1),
  Vision: new SpriteMetadata(8, 2, 1),
  Permahaste: new SpriteMetadata(8, 1, 1),
  Permavision: new SpriteMetadata(8, 2, 1),
  Willpower: new SpriteMetadata(8, 3, 1),
  Vitality: new SpriteMetadata(8, 4, 1),
};

export type SpriteName = keyof typeof SPRITESHEET;

export function get_sprite_metadata(name: SpriteName) {
  return SPRITESHEET[name];
}

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
  const frames: SpriteMetadata[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      frames.push(new SpriteMetadata(r, c));
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
    let sprite = undefined;
    if (entity.animation !== undefined) {
      sprite = this.sprites[entity.name][entity.animation.get_current_frame()];
    } else {
      sprite = this.sprites[entity.name][entity.variant];
    }
    if (sprite === undefined) {
      console.log("Attempted to draw entity while sprite missing");
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
    if (this.sprites["Fog"].length < 5) {
      return;
    }
    this.offscreen_drawer.sprite(this.sprites["Fog"][tile.light], tile.xy);
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
        if (!tile.is_lit()) {
          this.draw_fog(tile);
        }
      }
    }
    this.draw_target();
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

  draw_health_bar(pos: XY, ref: Creature) {
    pos.y -= 10;
    this.offscreen_drawer.rectangle(pos, wh(16, 4));
    if (ref.hp === 0) {
      return;
    }
    let hp = 14;
    if (ref.hp < ref.stats.max_hp) {
      hp = Math.round(14 * ref.hp / ref.stats.max_hp);
      hp = limit(1, hp, 13);
    }
    pos.x += 1;
    pos.y += 1;
    this.offscreen_drawer.rectangle(pos, wh(hp, 2));
  }
  draw_mana_bar(pos: XY, ref: Creature) {
    pos.y -= 5;
    if (ref.mp === 0) {
      return;
    }
    let mp = 16;
    if (ref.mp < ref.stats.max_mp) {
      mp = Math.round(16 * ref.mp / ref.stats.max_mp);
      mp = limit(1, mp, 15);
    }
    this.offscreen_drawer.rectangle(pos, wh(mp, 2));
  }
  draw_effects(pos: XY, ref: Creature) {
    pos.y -= 2;

    for (const _ of ref.effects) {
      this.offscreen_drawer.white_pixel(pos);
      pos.x += 2;
    }
  }

  draw_battle_sprites(battle: Battle) {
    // TODO: Sprite anchor
    this.offscreen_drawer.sprite(this.sprites["Player"][0], xy(32, 64));
    this.draw_health_bar(xy(32, 64), battle.player);
    this.draw_mana_bar(xy(32, 64), battle.player);
    this.draw_effects(xy(32, 64), battle.player);
    this.offscreen_drawer.sprite(
      this.sprites[battle.enemy.name][3],
      xy(128, 64),
      true,
    );
    this.draw_health_bar(xy(128, 64), battle.enemy);
    this.draw_mana_bar(xy(128, 64), battle.enemy);
    this.draw_effects(xy(128, 64), battle.enemy);
  }

  draw_battle_plates(battle: Battle) {
    const player = battle.player;
    const enemy = battle.enemy;

    this.offscreen_drawer.rectangle(xy(5, 144), wh(79, 43));
    this.offscreen_drawer.text(
      player.get_text(),
      this.font,
      xy(5 + 6, 144 + 6),
      "top_left",
      11,
    );

    this.offscreen_drawer.rectangle(xy(89, 144), wh(79, 43));
    this.offscreen_drawer.text(
      enemy.get_text(),
      this.font,
      xy(89 + 6, 144 + 6),
      "top_left",
      11,
    );
  }

  get_skill_sprite(name: UpgradeName): ImageBitmap | null {
    if (name in this.sprites) {
      return this.sprites[name][0];
    }
    return null;
  }

  draw_battle_menu(battle: Battle) {
    let y = 6;
    const skills = battle.skills;
    const lim = skills.length > 8 ? 8 : skills.length;
    const hovered = battle.hover_index;
    for (let i = 0; i < lim; ++i) {
      const name = skills[i].name;
      let offset = 0;
      const rect = skills[i].rectangle;
      if (i === hovered) {
        offset -= 1;
      }
      this.offscreen_drawer.rectangle(
        xy(rect.xy.x + offset, rect.xy.y),
        rect.wh,
      );
      this.offscreen_drawer.text(
        skills[i].name,
        this.font,
        xy(174 + 4 + offset, y + 6),
      );
      const sprite = this.get_skill_sprite(name);
      if (sprite !== null) {
        this.offscreen_drawer.sprite(
          sprite,
          xy(174 + 77 - 16 - 2 + offset, y + 2),
        );
      }
      y += 20 + 3;
    }
  }

  draw_battle_event(event: BattleEvent) {
    this.offscreen_drawer.rectangle(xy(5, 6), wh(256 - 10, 43));
    this.offscreen_drawer.text(
      event.text,
      this.font,
      xy(5 + 6, 6 + 6),
      "top_left",
      11,
    );
  }

  draw_battle() {
    const battle = this.application.game.battle;
    if (battle === null) {
      return;
    }
    this.draw_battle_sprites(battle);
    this.draw_battle_plates(battle);
    if (battle.current_event !== null) {
      this.draw_battle_event(battle.current_event);
      return;
    }
    if (battle.state === "skill_select") {
      this.draw_battle_menu(battle);
    }
  }

  draw_target() {
    const player: Player = this.application.game.player;
    if (player.target === null || player.target.draw === false) {
      return;
    }
    const frame = player.target.frame;
    this.offscreen_drawer.sprite(
      this.sprites["Selector"][frame],
      player.target.xy,
      true,
    );
  }

  draw_player() {
    // TODO: Move this to a more "proper" animation system
    const player: Player = this.application.game.player;
    const standing = this.sprites["Player"][0];
    const walking = this.sprites["Player"][1];
    this.offscreen_drawer.sprite(
      player.walk_counter < 1 ? standing : walking,
      player.xy,
      player.reversed,
    );
    for (const item of player.inventory) {
      if (item.animation === undefined || item.animation.done) {
        continue;
      }
      const sprite =
        this.sprites[item.name][item.animation.get_current_frame()];
      const pos = xy_copy(player.xy);
      if (player.reversed) {
        pos.x -= 4;
      } else {
        pos.x += 4;
      }
      this.offscreen_drawer.sprite(sprite, pos, player.reversed);
    }
  }

  draw_card(choice: Choice) {
    let pos = choice.pos;
    if (choice.hovered) {
      pos = xy(pos.x, pos.y - 2);
    }

    this.offscreen_drawer.rectangle(pos, choice.size);
    const x = pos.x + 5;
    const y = pos.y + 6;
    const y2 = y + 16;
    this.offscreen_drawer.text(choice.name, this.font, xy(x, y));
    this.offscreen_drawer.text(
      choice.description,
      this.font,
      xy(x, y2),
      "top_left",
      10,
    );

    const sprite = this.sprites[choice.name];
    if (sprite === undefined) {
      return;
    }
    const icon_x = Math.floor(pos.x + choice.size.width / 2 - 16 / 2);
    const icon_y = Math.floor(pos.y + choice.size.height - 16 - 1 - 4);
    this.offscreen_drawer.sprite(sprite[0], xy(icon_x, icon_y));
  }

  draw_level_up() {
    const width = this.offscreen_drawer.canvas.width;
    const height = this.offscreen_drawer.canvas.height;
    this.offscreen_drawer.rectangle(xy(0, 0), wh(width, height));

    const choices = this.application.game.choices;
    this.draw_card(choices[0]);
    this.draw_card(choices[1]);
    this.draw_card(choices[2]);

    this.offscreen_drawer.text(
      `You reached level ${this.application.game.player.level}!`,
      this.font,
      xy(width / 2, choices[0].pos.y / 2),
      "middle_center",
    );

    this.offscreen_drawer.sprite(
      this.sprites["Player"][0],
      xy(Math.floor(width / 2 - 8), height - 2 * 16),
    );
  }
  draw_game_over() {
    const width = this.offscreen_drawer.canvas.width;
    const height = this.offscreen_drawer.canvas.height;
    this.offscreen_drawer.text(
      "Game over!",
      this.font,
      xy(width / 2, height / 2),
      "middle_center",
    );
  }

  draw_one_map(pos: XY, zone: Zone, scaling: number) {
    for (const tile of zone.all_tiles) {
      if (tile.is_empty()) {
        continue;
      }
      if (!tile.is_lit()) {
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
    if (this.application.game.state === "battle") {
      return this.draw_battle();
    }
    if (this.application.game.state === "level_up") {
      return this.draw_level_up();
    }
    if (this.application.game.state === "world_map") {
      return this.draw_world_map();
    }
    if (this.application.game.state === "game_over") {
      return this.draw_game_over();
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
