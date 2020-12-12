const Game = require("../../../libtowers/libtowers.js").Game;
const Tower = require("../../../libtowers/libtowers.js").Tower;
const Draw = require("./draw.js");
const UI = require("./ui.js").UI;

const COLUMNS = 20;
const ROWS = 13;
const CANVAS_WIDTH = 1200;

const GRID_WIDTH = CANVAS_WIDTH;
const GRID_SIZE = GRID_WIDTH / COLUMNS;
const GRID_START = GRID_SIZE;
const WIDTH = CANVAS_WIDTH;

const GRID_HEIGHT = ROWS * GRID_SIZE;
const GRID_END = GRID_START + GRID_HEIGHT;
const CANVAS_HEIGHT = GRID_END + GRID_SIZE;

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
const UI_Y = GRID_END - GRID_SIZE;
const UI_W = WIDTH;
const UI_H = GRID_SIZE * 2;
const UI_C = FG;
const ui = new UI(UI_X, UI_Y, UI_W, UI_H, BG, UI_C, GRID_SIZE);
let space_pressed = false;

let preview = null;

function canvas_to_grid_int(p, offset = 0) {
    return Math.floor((p - offset) / GRID_SIZE);
}

function xy(x, y) {
    return { "x": x, "y": y };
}

function grid_to_canvas(p, offset=0) {
    if (p === null) {
        return p;
    }
    if (isNaN(p)) {
        return xy(grid_to_canvas(p.c), grid_to_canvas(p.r, GRID_START));
    }
    return (offset + p * GRID_SIZE + GRID_SIZE / 2);
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

function draw_bank(ctx, t, target = null) {
    const s = (t.w / 2) * 0.5;
    Draw.rectangle(ctx, t.x - s, t.y - s, 2 * s, 2 * s, "yellow", black);
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
    Draw.rectangle(ctx, c * GRID_SIZE, GRID_START + r * GRID_SIZE, GRID_SIZE, GRID_SIZE, BG);
}

function draw_path(ctx, c, r) {
    const color = "rgba(200,200,200,0.5)";
    Draw.rectangle(ctx, c * GRID_SIZE, GRID_START + r * GRID_SIZE, GRID_SIZE, GRID_SIZE, color);
}

function draw_spawn(ctx, c, r) {
    const color = "rgba(0,128,0,1)";
    Draw.rectangle(ctx, c * GRID_SIZE, GRID_START + r * GRID_SIZE, GRID_SIZE, GRID_SIZE, color);
}

function draw_goal(ctx, c, r) {
    const color = "rgba(200,200,0,1)";
    Draw.rectangle(ctx, c * GRID_SIZE, GRID_START + r * GRID_SIZE, GRID_SIZE, GRID_SIZE, color);
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
    const pos = grid_to_canvas(enemy);
    const r = (GRID_SIZE / 2) * 0.7;
    const angle = enemy.rotation;
    Draw.triangle(ctx, pos.x, pos.y, r, angle, enemy.color, "#000000");
}

function draw_enemies(ctx) {
    for (let enemy of game.enemies) {
        draw_enemy(ctx, enemy);
    }
}

function draw_preview(ctx) {
    if (preview === null) {
        return;
    }
    ctx.globalAlpha = 0.3;
    let pos = grid_to_canvas(preview);
    let r = GRID_SIZE * preview.range;
    Draw.circle(ctx, pos.x, pos.y, r, null, "black");
    draw_tower(ctx, preview);
    ctx.globalAlpha = 1.0;
}

function draw(ctx) {
    // Background:
    Draw.rectangle(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, BG);

    if (game.lives <= 0) {
        Draw.text(ctx, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, "Game over", FG, CANVAS_HEIGHT / 5);
        return;
    }

    // Grid:
    Draw.rectangle(ctx, 0, GRID_START, GRID_WIDTH, GRID_HEIGHT, FG);
    Draw.grid(ctx, GRID_SIZE, 0, GRID_START, WIDTH, GRID_HEIGHT);
    // Game elements:
    draw_tiles(ctx);
    draw_towers(ctx);
    draw_enemies(ctx);
    // UI:
    draw_preview(ctx);
    Draw.rectangle(ctx, 0, 0, WIDTH, GRID_START, BG);
    ui.draw(ctx);
}

function mouse_click(x, y) {
    const name = ui.selected.name;
    const tower = game.grid_click(canvas_to_grid_int(x), canvas_to_grid_int(y, GRID_START), name);
    if (tower != null) {
        tower.draw = ui.selected.icon;
        if (tower.name === "bank") {
            ui.selected.price.text = game.price("bank");
        }
    }
    ui.click(x, y);
}

function mouse_move(x, y) {
    ui.hover(x, y);
    let c = canvas_to_grid_int(x);
    let r = canvas_to_grid_int(y, GRID_START);
    let name = ui.selected.name;

    if (!game.can_place(c, r, name)) {
        preview = null;
        return;
    }

    if (preview === null) {
        preview = new Tower(c, r, name, game.price(name), ui.selected.icon);
    } else {
        preview.r = r;
        preview.c = c;
    }
}

function mouse_release(x, y) {
    ui.release(x, y);
}

function key_down(key) {
    if (key === "å") {
        for (let b of ui.tower_buttons) {
            b.show();
        }
        game.level = 10;
        game.money = 10000;
    }
    if (key === " ") {
        if (!space_pressed && game.paused) {
            on_start_click();
        }
        space_pressed = true;
    }
}

function key_up(key) {
    if (key === " ") {
        space_pressed = false;
    }
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
        case 8:
            ui.tower_buttons[3].show();
            break;
        case 11:
            ui.tower_buttons[4].show();
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

function on_bank_click(btn) {
    select(btn);
}

function setup_events(canvas) {
    ui.start_button.on_click = on_start_click;
    game.on_victory = on_victory;

    ui.add_tower_button("rock", draw_rock, on_rock_click).hide();
    select(ui.add_tower_button("gun", draw_gun_tower, on_gun_click));
    ui.add_tower_button("slow", draw_slow_tower, on_slow_click).hide();
    ui.add_tower_button("laser", draw_laser_tower, on_laser_click).hide();
    ui.add_tower_button("bank", draw_bank, on_bank_click).hide();

    canvas.addEventListener('mousedown', e => {
        const x = offset_to_canvas(e.offsetX, canvas);
        const y = offset_to_canvas(e.offsetY, canvas);
        mouse_click(x, y);
        mouse_move(x, y);
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
        mouse_move(x, y);
    });

    document.addEventListener('keydown', (event) => {
        key_down(event.key);
    }, false);

    document.addEventListener('keyup', (event) => {
        key_up(event.key);
    }, false);
}

function tick(ms) {
    if (game.lives <= 0) {
        return;
    }
    if (!game.paused) {
        game.tick(ms);
    }
    ui.interest.text = "+ " + game.reward() + "";
    ui.money.text = "$ " + game.money + "";
    ui.level.text = "Level: " + game.level;
    ui.lives.text = "Lives: " + game.lives;
}

function start(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.setAttribute("width", CANVAS_WIDTH);
    canvas.setAttribute("height", CANVAS_HEIGHT);
    setup_events(canvas);
    const ms = 10;
    window.setInterval(() => {
        let speedup = 1.0;
        if (space_pressed) {
            speedup = 4.0;
        }
        tick(ms * speedup);
        draw(ctx);
    }, ms)
}

module.exports = {
    start,
};
