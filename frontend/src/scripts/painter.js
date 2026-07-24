// All code for drawing towers, enemies, etc. should live here, and be
// based on the code for drawing primitives in draw.js
// This is purely callback based, anything which will be drawn needs a pointer
// to the painter object before draw is called.

const { fill_stroke } = require("../../../libtowers/utils.js");
const { GREY, BLACK, GREEN, BRIGHT_BLUE, DARK_BLUE, BRIGHT_PURPLE, DARK_PURPLE } = require("./colors.js");
const Draw = require("./draw.js");

function draw_tower_generic(ctx, x, y, s, level, rotation, circle, triangle) {
    let r = (s / 2) * 0.7;
    if (circle != null) {
        Draw.circle(ctx, x, y, r, circle.fill, circle.stroke);
    }
    if (triangle != null) {
        for (let i = 0; i < level; ++i) {
            Draw.triangle(ctx, x, y, r, rotation, triangle.fill, triangle.stroke);
            r = r / 2;
        }
    }
}

function draw_rock(ctx, t, target = null) {
    const circle = fill_stroke(GREY, BLACK);
    draw_tower_generic(ctx, t.x, t.y, t.w, 1, t.rotation, circle, null);
}

function draw_gun_tower(ctx, t, target = null) {
    const circle = fill_stroke(GREY, BLACK);
    const triangle = fill_stroke(GREEN, BLACK);
    if (target != null) {
        const stroke = GREEN;
        Draw.line(ctx, t.x, t.y, target.x, target.y, stroke, 0.1 * t.w * t.intensity);
    }
    draw_tower_generic(ctx, t.x, t.y, t.w, t.level, t.rotation, circle, triangle);
}

function draw_slow_tower(ctx, t, target = null) {
    const circle = fill_stroke(GREY, BLACK);
    const triangle = fill_stroke(BRIGHT_BLUE, DARK_BLUE);
    if (target != null) {
        const stroke = BRIGHT_BLUE;
        Draw.line(ctx, t.x, t.y, target.x, target.y, stroke, 0.1 * t.w * t.intensity);
    }
    draw_tower_generic(ctx, t.x, t.y, t.w, t.level, t.rotation, circle, triangle);
}

function draw_laser_tower(ctx, t, target = null) {
    const circle = fill_stroke(GREY, BLACK);
    const triangle = fill_stroke(BRIGHT_PURPLE, DARK_PURPLE);
    if (target != null) {
        const stroke = BRIGHT_PURPLE;
        Draw.line(ctx, t.x, t.y, target.x, target.y, stroke, 0.1 * t.w * t.intensity);
    }
    draw_tower_generic(ctx, t.x, t.y, t.w, t.level, t.rotation, circle, triangle);
}

function draw_bank(ctx, t, target = null) {
    let s = (t.w / 2) * 0.5;
    for (let i = 0; i < t.level; ++i) {
        Draw.rectangle(ctx, t.x - s, t.y - s, 2 * s, 2 * s, "yellow", BLACK);
        s = s / 2;
    }
}

function draw_building(ctx, t, target = null) {
    if (t.name === "bank") {
        return draw_bank(ctx, t, target);
    }
    if (t.name === "laser") {
        return draw_laser_tower(ctx, t, target);
    }
    if (t.name === "slow") {
        return draw_slow_tower(ctx, t, target);
    }
    if (t.name === "gun") {
        return draw_gun_tower(ctx, t, target);
    }
    if (t.name === "rock") {
        return draw_rock(ctx, t, target);
    }
}

class Painter {
    constructor(canvas_manager) {
        this.canvas_manager = canvas_manager
    }

    paint(target){
        // TODO
    }
}

module.exports = {
    Painter,
    draw_building,
    draw_tower_generic,
    draw_rock,
    draw_gun_tower,
    draw_laser_tower,
    draw_slow_tower,
    draw_bank,
};
