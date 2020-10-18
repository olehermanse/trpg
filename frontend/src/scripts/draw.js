const PI = 3.14159;

function line(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function circle(ctx, x, y, r) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillStyle = 'rgba(128, 128, 128, 1)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * PI);
    ctx.stroke();
    ctx.fill();
}

function background(ctx, width, height) {
    ctx.fillStyle = 'rgb(244, 244, 244)';
    ctx.fillRect(0, 0, width, height);
}

function grid(ctx, size, width, height) {
    for (let x = size; x < width; x += size) {
        line(ctx, x, 0, x, height);
    }
    for (let y = size; y < height; y += size) {
        line(ctx, 0, y, width, y);
    }
}

module.exports = {
    circle,
    line,
    background,
    grid,
};
