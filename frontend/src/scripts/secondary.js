const Session = require("../../../libtowers/libtowers.js").Session;

const GRID_SIZE = 100;
const WIDTH = 800;
const HEIGHT = 600;

function draw_line(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function draw_background(ctx) {
    ctx.fillStyle = 'rgb(244, 244, 244)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function draw_grid(ctx) {
    for (let x = GRID_SIZE; x < WIDTH; x += GRID_SIZE) {
        draw_line(ctx, x, 0, x, HEIGHT);
    }
    for (let y = GRID_SIZE; y < HEIGHT; y += GRID_SIZE) {
        draw_line(ctx, 0, y, WIDTH, y);
    }
}

function draw() {
    const canvas = document.getElementById('towers_canvas');
    const ctx = canvas.getContext('2d');

    draw_grid(ctx);
}

function start() {
    draw();
}

module.exports = {
    start,
};
