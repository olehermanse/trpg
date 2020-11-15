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

const FG = "rgba(256,256,256,1)";
const BG = "rgba(16,16,16,1)";

const game = new Game(COLUMNS, ROWS);
const UI_X = 0;
const UI_Y = GRID_HEIGHT - GRID_SIZE;
const UI_W = WIDTH;
const UI_H = GRID_SIZE * 2;
const UI_C = FG;
const UI_S = GRID_SIZE / 4;
const ui = new UI(UI_X, UI_Y, UI_W, UI_H, UI_C, UI_S, UI_S);

function on_start_click() {
    game.start();
    ui.start_button.transition("disabled");
}

function on_victory() {
    ui.start_button.transition("active");
}

ui.start_button.on_click = on_start_click;
game.on_victory = on_victory;

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

function draw_damage_tower(ctx, pos, side, angle, t = null) {
    const r = (side / 2) * 0.7;
    Draw.circle(ctx, pos.x, pos.y, r);

    if (t != null) {
        const stroke = `rgba(127, 0, 255, ${t.intensity})`;
        Draw.line(ctx, pos.x, pos.y, t.x, t.y, stroke, 5 * t.intensity);
    }
    Draw.triangle(ctx, pos.x, pos.y, r, angle);
}

function draw_tower(ctx, tower) {
    const pos = grid_to_canvas(tower);
    const angle = tower.rotation;
    const side = GRID_SIZE;
    const target = grid_to_canvas(tower.target);
    if (target != null) {
        target.intensity = tower.intensity;
    }
    draw_damage_tower(ctx, pos, side, angle, target);
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
    Draw.triangle(ctx, x, y, r, angle, "#ff0000", "#000000");
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
    game.grid_click(canvas_to_grid_int(x), canvas_to_grid_int(y));
    ui.click(x, y);
}

function mouse_move(x, y) {
    ui.hover(x, y);
}

function mouse_release(x, y) {
    ui.release(x, y);
}

function setup_events(canvas) {
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
        game.tick(10);
    }
    ui.money.text = "" + game.money + " $";
    ui.level.text = "Lv. " + game.level;
}

function start(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.setAttribute("width", CANVAS_WIDTH);
    canvas.setAttribute("height", CANVAS_HEIGHT);
    setup_events(canvas);
    window.setInterval(() => {
        tick(10);
        draw(ctx);
    }, 10)
}

module.exports = {
    start,
};
