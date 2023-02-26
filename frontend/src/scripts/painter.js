// All code for drawing towers, enemies, etc. should live here, and be
// based on the code for drawing primitives in draw.js
// This is purely callback based, anything which will be drawn needs a pointer
// to the painter object before draw is called.

const { fill_stroke } = require("../../../libtowers/utils.js");
const { GREY, BLACK, GREEN, BRIGHT_BLUE, DARK_BLUE, BRIGHT_PURPLE, DARK_PURPLE } = require("./colors.js");
const Draw = require("./draw.js");

class Painter {
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

    paint(obj, effects = null) {
        console.assert(this.canvas_manager != null);
        console.assert(this.canvas_manager.ctx != null);
        console.assert(["tower", "enemy"].includes(obj.type));

        let extra = null;
        if (obj.type === "tower") {
            extra = obj.target;
        }

        let a = this.translate(obj);
        let b = this.translate(extra);
        Painter.draw_building(this.canvas_manager.ctx, a, b, effects);
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
        tower.rotation = Math.PI / 2;
        tower.target = null;
        Painter.draw_building(this.canvas_manager.ctx, tower, null, effects);
    }

    static draw_tower_generic(ctx, t, circle, triangle, effects = null) {
        let r = (t.w / 2) * 0.7;
        if (circle != null) {
            Draw.circle(ctx, t.x, t.y, r, circle.fill, circle.stroke);
        }
        if (triangle != null) {
            for (let i = 0; i < t.level; ++i) {
                Draw.triangle(ctx, t.x, t.y, r, t.rotation, triangle.fill, triangle.stroke);
                r = r / 2;
            }
        }
        if (effects != null && effects.draw_price) {
            let tmp = ctx.globalAlpha;
            ctx.globalAlpha = 1.0;
            Draw.text_bottom_right(ctx, t.x + t.w / 2, t.y + t.h / 2, String(t.price), "#ffff00", 20);
            ctx.globalAlpha = tmp;
        }
    }

    static draw_rock(ctx, t, target = null, effects = null) {
        const circle = fill_stroke(GREY, BLACK);
        Painter.draw_tower_generic(ctx, t, circle, null, effects);
    }

    static draw_gun_tower(ctx, t, target = null, effects = null) {
        const circle = fill_stroke(GREY, BLACK);
        const triangle = fill_stroke(GREEN, BLACK);
        if (target != null) {
            const stroke = GREEN;
            Draw.line(ctx, t.x, t.y, target.x, target.y, stroke, 0.1 * t.w * t.intensity);
        }
        Painter.draw_tower_generic(ctx, t, circle, triangle, effects);
    }

    static draw_slow_tower(ctx, t, target = null, effects = null) {
        const circle = fill_stroke(GREY, BLACK);
        const triangle = fill_stroke(BRIGHT_BLUE, DARK_BLUE);
        if (target != null) {
            const stroke = BRIGHT_BLUE;
            Draw.line(ctx, t.x, t.y, target.x, target.y, stroke, 0.1 * t.w * t.intensity);
        }
        Painter.draw_tower_generic(ctx, t, circle, triangle, effects);
    }

    static draw_laser_tower(ctx, t, target = null, effects = null) {
        const circle = fill_stroke(GREY, BLACK);
        const triangle = fill_stroke(BRIGHT_PURPLE, DARK_PURPLE);
        if (target != null) {
            const stroke = BRIGHT_PURPLE;
            Draw.line(ctx, t.x, t.y, target.x, target.y, stroke, 0.1 * t.w * t.intensity);
        }
        Painter.draw_tower_generic(ctx, t, circle, triangle, effects);
    }

    static draw_bank(ctx, t, target = null, effects = null) {
        let s = (t.w / 2) * 0.5;
        for (let i = 0; i < t.level; ++i) {
            Draw.rectangle(ctx, t.x - s, t.y - s, 2 * s, 2 * s, "yellow", BLACK);
            s = s / 2;
        }
    }

    static draw_building(ctx, t, target = null, effects = null) {
        if (t.name === "bank") {
            return Painter.draw_bank(ctx, t, target, effects);
        }
        if (t.name === "laser") {
            return Painter.draw_laser_tower(ctx, t, target, effects);
        }
        if (t.name === "slow") {
            return Painter.draw_slow_tower(ctx, t, target, effects);
        }
        if (t.name === "gun") {
            return Painter.draw_gun_tower(ctx, t, target, effects);
        }
        if (t.name === "rock") {
            return Painter.draw_rock(ctx, t, target, effects);
        }
    }
}

module.exports = {
    Painter,
};
