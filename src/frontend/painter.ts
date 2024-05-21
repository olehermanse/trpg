// All code for drawing towers, enemies, etc. should live here, and be
// based on the code for drawing primitives in draw.js
// This is purely callback based, anything which will be drawn needs a pointer
// to the painter object before draw is called.
import { fill_stroke, xy, limit } from "@olehermanse/utils/funcs.js";
import {
  WHITE,
  GREY,
  BLACK,
  GREEN,
  BRIGHT_BLUE,
  DARK_BLUE,
  BRIGHT_PURPLE,
  DARK_PURPLE,
  RED,
  YELLOW,
  PURPLE,
  CYAN,
} from "@olehermanse/utils/colors.js";
import { Draw } from "@olehermanse/utils/draw.js";

const CARD_WIDTH = 300;
const CARD_HEIGHT = 400;

class Painter {
  canvas_manager: any;

  constructor(canvas_manager) {
    console.assert(canvas_manager != null);
    this.canvas_manager = canvas_manager;
    console.assert(this.canvas_manager != null);
  }

  translate(a) {
    if (a === null) {
      return null;
    }
    let b = this.canvas_manager.grid_to_canvas(a);
    b.level = a.level;
    b.name = a.name;
    b.w = this.canvas_manager.grid_size;
    b.h = this.canvas_manager.grid_size;
    b.rotation = a.rotation;
    b.intensity = a.intensity;
    b.price = a.price;
    return b;
  }

  //@ts-ignore
  paint_enemy(enemy, effects = null) {
    const ctx = this.canvas_manager.ctx;
    const pos = this.canvas_manager.grid_to_canvas(enemy);
    const grid = this.canvas_manager.grid_size;
    const r = (grid / 2) * 0.7;
    const x = pos.x;
    const y = pos.y;
    const angle = enemy.rotation;
    Draw.triangle(ctx, x, y, r, angle, Painter.enemy_color(enemy), "#000000");
    if (enemy.health < enemy.max_health) {
      const hp = enemy.health;
      const max_hp = enemy.max_health;
      Draw.healthbar(ctx, x, y - grid / 2, grid * 0.75, grid / 10, hp, max_hp);
    }
  }

  paint_tower(tower, effects = null) {
    let extra = tower.target;
    let a = this.translate(tower);
    let b = this.translate(extra);
    Painter.draw_building(this.canvas_manager.ctx, a, b, effects);
  }

  paint(obj, effects = null) {
    console.assert(this.canvas_manager != null);
    console.assert(this.canvas_manager.ctx != null);
    console.assert(["tower", "enemy"].includes(obj.type));

    if (obj.type === "enemy") {
      return this.paint_enemy(obj, effects);
    }
    this.paint_tower(obj, effects);
  }

  paint_all(objs, effects = null) {
    for (let obj of objs) {
      this.paint(obj, effects);
    }
  }

  paint_xy(type, name, pos, width, effects = null) {
    console.assert(this.canvas_manager != null);
    console.assert(this.canvas_manager.ctx != null);
    console.assert(["tower"].includes(type));

    const tower = pos;
    tower.type = type;
    tower.name = name;
    tower.level = 1;
    tower.w = width;
    tower.h = width;
    tower.rotation = Math.PI / 2;
    tower.target = null;
    tower.price = this.canvas_manager.game.price(name);
    Painter.draw_building(this.canvas_manager.ctx, tower, null, effects);
  }

  paint_card_top_left(card, pos, effects = null) {
    let opacity = 1.0;
    if (effects != null && "opacity" in effects) {
      opacity = effects.opacity;
      if (opacity <= 0.0) {
        return;
      }
    }
    const w = CARD_WIDTH;
    const h = CARD_HEIGHT;
    const bg = BLACK;
    const stroke = WHITE;
    const ctx = this.canvas_manager.ctx;
    let x = limit(
      this.canvas_manager.grid_size + 10,
      pos.x,
      this.canvas_manager.width - w - 10
    );
    let y = limit(
      this.canvas_manager.grid_start + 10,
      pos.y,
      this.canvas_manager.grid_end - this.canvas_manager.grid_size - h - 10
    );
    let tmp = ctx.globalAlpha;
    ctx.globalAlpha = opacity;
    Draw.rectangle(ctx, x, y, w, h, bg, stroke, 2);
    Draw.text_top_left(ctx, x + 15, y + 15, card.full_text, stroke, 24);
    ctx.globalAlpha = tmp;
  }

  paint_card(card, pos, anchor, effects = null) {
    console.assert(["center", "top_left", "bottom"].includes(anchor));
    let w = CARD_WIDTH;
    let h = CARD_HEIGHT;
    let x = pos.x;
    let y = pos.y;
    if (anchor === "center") {
      x -= w / 2;
      y -= h / 2;
    } else if (anchor === "bottom") {
      x -= w / 2;
      y -= h;
    }

    this.paint_card_top_left(card, xy(x, y), effects);
  }

  paint_tooltip(tooltip) {
    if (tooltip === null) {
      return;
    }
    this.paint_card(tooltip.card, tooltip.pos, "bottom", {
      opacity: tooltip.opacity,
    });
  }

  static enemy_color(enemy) {
    const colors = {
      red: RED,
      speedy: YELLOW,
      boss: BLACK,
      purple: PURPLE,
      mega: CYAN,
      final: CYAN,
    };
    return colors[enemy.name];
  }

  static draw_tower_generic(ctx, t, circle, triangle, effects = null) {
    let r = (t.w / 2) * 0.7;
    if (circle != null) {
      Draw.circle(ctx, t.x, t.y, r, circle.fill, circle.stroke);
    }
    if (triangle != null) {
      for (let i = 0; i < t.level; ++i) {
        Draw.triangle(
          ctx,
          t.x,
          t.y,
          r,
          t.rotation,
          triangle.fill,
          triangle.stroke
        );
        r = r / 2;
      }
    }
    if (effects != null && effects.draw_price) {
      let tmp = ctx.globalAlpha;
      ctx.globalAlpha = 1.0;
      Draw.text_bottom_right(
        ctx,
        t.x + t.w / 2,
        t.y + t.h / 2,
        String(t.price),
        "#ffff00",
        t.h / 3.5
      );
      ctx.globalAlpha = tmp;
    }
  }

  //@ts-ignore
  static draw_rock(ctx, t, target = null, effects = null) {
    const circle = fill_stroke(GREY, BLACK);
    Painter.draw_tower_generic(ctx, t, circle, null, effects);
  }

  static draw_gun_tower(ctx, t, target = null, effects = null) {
    const circle = fill_stroke(GREY, BLACK);
    const triangle = fill_stroke(GREEN, BLACK);
    if (target != null) {
      const stroke = GREEN;
      Draw.line(
        ctx,
        t.x,
        t.y,
        target.x,
        target.y,
        stroke,
        0.1 * t.w * t.intensity
      );
    }
    Painter.draw_tower_generic(ctx, t, circle, triangle, effects);
  }

  static draw_slow_tower(ctx, t, target = null, effects = null) {
    const circle = fill_stroke(GREY, BLACK);
    const triangle = fill_stroke(BRIGHT_BLUE, DARK_BLUE);
    if (target != null) {
      const stroke = BRIGHT_BLUE;
      Draw.line(
        ctx,
        t.x,
        t.y,
        target.x,
        target.y,
        stroke,
        0.1 * t.w * t.intensity
      );
    }
    Painter.draw_tower_generic(ctx, t, circle, triangle, effects);
  }

  static draw_laser_tower(ctx, t, target = null, effects = null) {
    const circle = fill_stroke(GREY, BLACK);
    const triangle = fill_stroke(BRIGHT_PURPLE, DARK_PURPLE);
    if (target != null) {
      const stroke = BRIGHT_PURPLE;
      Draw.line(
        ctx,
        t.x,
        t.y,
        target.x,
        target.y,
        stroke,
        0.1 * t.w * t.intensity
      );
    }
    Painter.draw_tower_generic(ctx, t, circle, triangle, effects);
  }

  //@ts-ignore
  static draw_bank(ctx, t, target = null, effects = null) {
    let s = (t.w / 2) * 0.5;
    for (let i = 0; i < t.level; ++i) {
      Draw.rectangle(ctx, t.x - s, t.y - s, 2 * s, 2 * s, "yellow", BLACK);
      s = s / 2;
    }
  }

  static draw_building(ctx, t, target = null, effects = null) {
    if (t.name === "Bank") {
      return Painter.draw_bank(ctx, t, target, effects);
    }
    if (t.name === "Laser tower") {
      return Painter.draw_laser_tower(ctx, t, target, effects);
    }
    if (t.name === "Slow tower") {
      return Painter.draw_slow_tower(ctx, t, target, effects);
    }
    if (t.name === "Gun tower") {
      return Painter.draw_gun_tower(ctx, t, target, effects);
    }
    if (t.name === "Rock") {
      return Painter.draw_rock(ctx, t, target, effects);
    }
  }
}

export { Painter };
