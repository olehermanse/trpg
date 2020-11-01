const Game = require("../../../libtowers/libtowers.js").Game;
const Draw = require("./draw.js");
const UI = require("./ui.js").UI;

const GRID_SIZE = 100;
const WIDTH = 1600;
const GRID_HEIGHT = 1100;
const CANVAS_HEIGHT = 1200;

const ROWS = GRID_HEIGHT / GRID_SIZE;
const COLUMNS = WIDTH / GRID_SIZE;
const FG = "rgba(128,128,128,1)";
const BG = "rgba(64,64,64,1)";

const game = new Game(COLUMNS, ROWS);
const ui = new UI(0, GRID_HEIGHT - GRID_SIZE, WIDTH, GRID_SIZE * 2, BG, FG);
ui.setup();

function canvas_to_grid_int(p) {
    return Math.floor(p / GRID_SIZE);
}

function grid_to_canvas(p) {
    return (p * GRID_SIZE + GRID_SIZE / 2);
}

function offset_to_canvas(p, canvas) {
    return (p / canvas.getBoundingClientRect().width) * WIDTH;
}

function draw_tower(ctx, tower) {
    const x = grid_to_canvas(tower.c);
    const y = grid_to_canvas(tower.r);
    const r = (GRID_SIZE / 2) * 0.7;
    const angle = tower.rotation;
    Draw.circle(ctx, x, y, r);

    if (tower.target) {
        const tx = grid_to_canvas(tower.target.c);
        const ty = grid_to_canvas(tower.target.r);
        const intensity = tower.intensity;
        const stroke = `rgba(127, 0, 255, ${intensity})`;
        Draw.line(ctx, x, y, tx, ty, stroke, 5 * intensity);
    }
    Draw.triangle(ctx, x, y, r, angle);
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
    Draw.background(ctx, WIDTH, GRID_HEIGHT);
    Draw.grid(ctx, GRID_SIZE, WIDTH, GRID_HEIGHT);
    draw_tiles(ctx);
    draw_towers(ctx);
    draw_enemies(ctx);
    ui.draw(ctx);
}

function grid_click(c, r) {
    if (game.is_empty(c, r)) {
        game.place_tower(c, r);
    }
}

function mouse_click(x, y) {
    grid_click(canvas_to_grid_int(x), canvas_to_grid_int(y));
}

function mouse_move(x, y) {

}

function mouse_release() {

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
        mouse_release();
    });
}

function tick(ms) {
    game.tick(10);
    ui.text.text = "" + game.money;
}

function start(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.setAttribute("width", WIDTH);
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
