const Game = require("../../../libtowers/libtowers.js").Game;
const Draw = require("./draw.js");
const UI = require("./ui.js").UI;

const COLUMNS = 20;
const ROWS = 14;
const CANVAS_WIDTH = 1200;

const GRID_WIDTH = CANVAS_WIDTH;
const GRID_SIZE = GRID_WIDTH / COLUMNS;
const WIDTH = CANVAS_WIDTH;

const GRID_HEIGHT = ROWS * GRID_SIZE;
const CANVAS_HEIGHT = GRID_HEIGHT + GRID_SIZE;

const FG = "rgb(256,256,256)";
const BG = "rgb(16,16,16)";
const black = BG;
const green = "rgb(0,255,0)";
const bright_blue = "#a9d1fa";
const dark_blue = "#330bd8";
const grey = "rgb(200,200,200)";
const bright_purple = "rgb(255,0,255)";
const dark_purple = "rgb(128,0,128)";

const game = new Game(COLUMNS, ROWS);
const UI_X = 0;
const UI_Y = GRID_HEIGHT - GRID_SIZE;
const UI_W = WIDTH;
const UI_H = GRID_SIZE * 2;
const UI_C = FG;
const UI_S = GRID_SIZE / 4;
const ui = new UI(UI_X, UI_Y, UI_W, UI_H, UI_C, UI_S, UI_S);

function canvas_to_grid_int(p) {
    return Math.floor(p / GRID_SIZE);
}

function xy(x, y) {
    return { "x": x, "y": y };
}

function grid_to_canvas(p) {
    if (p === null) {
        return p;
    }
    if (isNaN(p)) {
        return xy(grid_to_canvas(p.c), grid_to_canvas(p.r));
    }
    return (p * GRID_SIZE + GRID_SIZE / 2);
}

function offset_to_canvas(p, canvas) {
    return (p / canvas.getBoundingClientRect().width) * WIDTH;
}

function fill_stroke(f, s) {
    return { "fill": f, "stroke": s };
}

function draw_tower_generic(ctx, x, y, s, rotation, circle, triangle) {
    const r = (s / 2) * 0.7;
    if (circle != null) {
        Draw.circle(ctx, x, y, r, circle.fill, circle.stroke);
    }
    if (triangle != null) {
        Draw.triangle(ctx, x, y, r, rotation, triangle.fill, triangle.stroke);
    }
}

function draw_rock(ctx, t, target = null) {
    const circle = fill_stroke(grey, black);
    draw_tower_generic(ctx, t.x, t.y, t.w, t.rotation, circle, null);
}

function draw_gun_tower(ctx, t, target = null) {
    const circle = fill_stroke(grey, black);
    const triangle = fill_stroke(green, black);
    if (target != null) {
        const stroke = green;
        Draw.line(ctx, t.x, t.y, target.x, target.y, stroke, 5 * t.intensity);
    }
    draw_tower_generic(ctx, t.x, t.y, t.w, t.rotation, circle, triangle);
}

function draw_slow_tower(ctx, t, target = null) {
    const circle = fill_stroke(grey, black);
    const triangle = fill_stroke(bright_blue, dark_blue);
    if (target != null) {
        const stroke = bright_blue;
        Draw.line(ctx, t.x, t.y, target.x, target.y, stroke, 5 * t.intensity);
    }
    draw_tower_generic(ctx, t.x, t.y, t.w, t.rotation, circle, triangle);
}

function draw_laser_tower(ctx, t, target = null) {
    const circle = fill_stroke(grey, black);
    const triangle = fill_stroke(bright_purple, dark_purple);
    if (target != null) {
        const stroke = bright_purple;
        Draw.line(ctx, t.x, t.y, target.x, target.y, stroke, 5 * t.intensity);
    }
    draw_tower_generic(ctx, t.x, t.y, t.w, t.rotation, circle, triangle);
}

function draw_tower(ctx, tower) {
    const t = grid_to_canvas(tower);
    t.w = GRID_SIZE;
    t.rotation = tower.rotation;
    t.intensity = tower.intensity;
    const target = grid_to_canvas(tower.target);
    tower.draw(ctx, t, target);
}

function draw_towers(ctx) {
    for (let tower of game.towers) {
        draw_tower(ctx, tower);
    }
}

function draw_wall(ctx, c, r) {
    Draw.rectangle(ctx, c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE, BG);
}

function draw_path(ctx, c, r) {
    const color = "rgba(200,200,200,0.5)";
    Draw.rectangle(ctx, c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE, color);
}

function draw_spawn(ctx, c, r) {
    const color = "rgba(0,128,0,1)";
    Draw.rectangle(ctx, c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE, color);
}

function draw_goal(ctx, c, r) {
    const color = "rgba(200,200,0,1)";
    Draw.rectangle(ctx, c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE, color);
}

function draw_tile(ctx, c, r) {
    const tile = game.tiles[c][r];
    if (tile === "wall") {
        draw_wall(ctx, c, r)
    } else if (tile === "path") {
        draw_path(ctx, c, r);
    } else if (tile === "spawn") {
        draw_spawn(ctx, c, r);
    } else if (tile === "goal") {
        draw_goal(ctx, c, r);
    }
}

function draw_tiles(ctx) {
    for (let c = 0; c < COLUMNS; ++c) {
        for (let r = 0; r < ROWS; ++r) {
            draw_tile(ctx, c, r);
        }
    }
}

function draw_enemy(ctx, enemy) {
    const x = grid_to_canvas(enemy.c);
    const y = grid_to_canvas(enemy.r);
    const r = (GRID_SIZE / 2) * 0.7;
    const angle = enemy.rotation;
    Draw.triangle(ctx, x, y, r, angle, enemy.color, "#000000");
}

function draw_enemies(ctx) {
    for (let enemy of game.enemies) {
        draw_enemy(ctx, enemy);
    }
}

function draw(ctx) {
    // Background:
    Draw.rectangle(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, BG);
    // Grid:
    Draw.rectangle(ctx, 0, 0, GRID_WIDTH, GRID_HEIGHT, FG);
    Draw.grid(ctx, GRID_SIZE, WIDTH, GRID_HEIGHT);
    // Game elements:
    draw_tiles(ctx);
    draw_towers(ctx);
    draw_enemies(ctx);
    // UI:
    ui.draw(ctx);
}

function mouse_click(x, y) {
    const name = ui.selected.name;
    const tower = game.grid_click(canvas_to_grid_int(x), canvas_to_grid_int(y), name);
    if (tower != null) {
        tower.draw = ui.selected.icon;
    }
    ui.click(x, y);
}

function mouse_move(x, y) {
    ui.hover(x, y);
}

function mouse_release(x, y) {
    ui.release(x, y);
}

function on_start_click() {
    game.start();
    ui.start_button.transition("disabled");
}

function on_victory() {
    ui.start_button.transition("active");
    switch (game.level) {
        case 2:
            ui.tower_buttons[0].show();
            break;
        case 5:
            ui.tower_buttons[2].show();
            break;
        case 10:
            ui.tower_buttons[3].show();
            break;
        default:
            break;
    }
}

function select(btn) {
    ui.selected = btn;
    if (btn.state != "selected") {
        btn.transition("selected");
    }
    for (let button of ui.tower_buttons) {
        if (button != btn && button.state === "selected") {
            button.transition("active");
        }
    }
}

function on_rock_click(btn) {
    select(btn);
}

function on_gun_click(btn) {
    select(btn);
}

function on_slow_click(btn) {
    select(btn);
}

function on_laser_click(btn) {
    select(btn);
}

function setup_events(canvas) {
    ui.start_button.on_click = on_start_click;
    game.on_victory = on_victory;

    ui.add_tower_button("rock", draw_rock, on_rock_click).hide();
    select(ui.add_tower_button("gun", draw_gun_tower, on_gun_click));
    ui.add_tower_button("slow", draw_slow_tower, on_slow_click).hide();
    ui.add_tower_button("laser", draw_laser_tower, on_laser_click).hide();

    canvas.addEventListener('mousedown', e => {
        const x = offset_to_canvas(e.offsetX, canvas);
        const y = offset_to_canvas(e.offsetY, canvas);
        mouse_click(x, y);
    });

    canvas.addEventListener('mousemove', e => {
        const x = offset_to_canvas(e.offsetX, canvas);
        const y = offset_to_canvas(e.offsetY, canvas);
        mouse_move(x, y);
    });

    window.addEventListener('mouseup', e => {
        const x = offset_to_canvas(e.offsetX, canvas);
        const y = offset_to_canvas(e.offsetY, canvas);
        mouse_release(x, y);
    });
}

function tick(ms) {
    if (!game.paused) {
        game.tick(ms);
    }
    ui.money.text = "" + game.money + " $";
    ui.level.text = "Lv. " + game.level;
}

function start(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.setAttribute("width", CANVAS_WIDTH);
    canvas.setAttribute("height", CANVAS_HEIGHT);
    setup_events(canvas);
    const ms = 10;
    window.setInterval(() => {
        tick(ms);
        draw(ctx);
    }, ms)
}

module.exports = {
    start,
};
