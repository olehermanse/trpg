const Draw = require("./draw.js");

function xy(x, y) {
    return { "x": x, "y": y };
}

class UIRect {
    constructor(x, y, w, h, c, padding = 0, margin = 0) {
        this.x = x + margin;
        this.y = y + margin;
        this.w = w - 2 * margin;
        this.h = h - 2 * margin;
        this.c = c;
        this.padding = padding;
        this.padded = this;
        if (padding > 0) {
            this.padded = this.get_padded();
        }
        this.children = [];
    }

    get_padded() {
        return new UIRect(
            this.x + this.padding,
            this.y + this.padding,
            this.w - 2 * this.padding,
            this.h - 2 * this.padding,
            this.c,
            0,
            0);
    }

    draw_self(ctx) {
        Draw.rectangle(ctx, this.x, this.y, this.w, this.h, null, this.c);
    }

    draw(ctx) {
        this.draw_self(ctx);
        this.children.map((c) => { c.draw(ctx); });
    }

    top_left() {
        return xy(this.x, this.y);
    }

    top_right() {
        return xy(this.x + this.w, this.y);
    }

    bottom_left() {
        return xy(this.x, this.y + this.h);
    }

    bottom_right() {
        return xy(this.x + this.w, this.y + this.h);
    }

    top() {
        return xy(this.x + this.w / 2, this.y);
    }

    bottom() {
        return xy(this.x + this.w / 2, this.y + this.h);
    }

    left() {
        return xy(this.x, this.y + this.h / 2);
    }

    right() {
        return xy(this.x + this.w, this.y + this.h / 2);
    }

    is_inside(x, y) {
        return (x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h);
    }
}

class UIText {
    constructor(x, y, color, text = "") {
        this.x = x;
        this.y = y;
        this.c = color;
        this.text = text;
        this.textAlign = "center";
        this.font = "48px monospace";
        this.w = 32 * 6;
    }

    left() {
        return xy(this.x - this.w, this.y);
    }

    draw(ctx) {
        ctx.font = this.font;
        ctx.textAlign = this.textAlign;
        ctx.textBaseline = "middle";
        ctx.fillStyle = this.c;
        ctx.fillText(this.text, this.x, this.y);
    }
}

class UIButton extends UIRect {
    constructor(x, y, w, h, c, label) {
        super(x, y, w, h, c);
        this.label = new UIText(x + w / 2, y + h / 2, c, label);
        this.label.font = "32px monospace";
        this.children.push(this.label);
        this.on_click = null;
        this.state = "active";
        this.base_color = c;
    }

    set_temporary_color(label = null, rect = null) {
        if (label != null) {
            this.label.c = label;
        }
        else {
            this.label.c = this.base_color;
        }
        if (rect != null) {
            this.c = rect;
        }
        else {
            this.c = this.base_color;
        }
    }

    transition(state) {
        console.assert(this.state != state);
        this.state = state;
        const blue = "rgba(0,128,255,1)";
        const grey = "rgba(180,180,180,1)";
        if (state === "active") {
            this.set_temporary_color();
        } else if (state === "hovered") {
            this.set_temporary_color(blue);
        } else if (state === "clicked") {
            this.set_temporary_color(blue, grey);
        } else if (state === "disabled") {
            this.set_temporary_color(grey, grey);
        }
    }

    click(x, y) {
        if (["active", "hovered"].includes(this.state) && this.is_inside(x, y)) {
            this.transition("clicked");
        }
    }

    release(x, y) {
        if (this.state === "clicked") {
            if (this.is_inside(x, y)) {
                this.transition("hovered");
                if (this.on_click != null) {
                    this.on_click();
                }
            }
            else {
                this.transition("active");
            }
        }
    }

    hover(x, y) {
        const inside = this.is_inside(x, y);
        if (this.state === "hovered" && !inside) {
            this.transition("active");
        }
        else if (this.state === "active" && inside) {
            this.transition("hovered");
        }
    }
}

class UI extends UIRect {
    constructor(x, y, w, h, c, padding = 0, margin = 0) {
        super(x, y, w, h, c, padding, margin);

        const inner = this.get_padded();
        this.inner = inner;
        this.inner.c = null;
        this.children.push(inner);

        let flow = this.inner.padded.right();

        const text = new UIText(flow.x - padding, flow.y, this.c, text);
        text.textAlign = "right";
        this.text = text;
        this.children.push(text);

        flow = text.left();

        const btn_w = w / 10;
        const btn_h = h / 3;
        const button = new UIButton(flow.x - btn_w, flow.y - btn_h / 2, btn_w, btn_h, this.c, "Start");
        this.button = button;
        this.children.push(button);
    }

    click(x, y) {
        this.button.click(x, y);
    }

    release(x, y) {
        this.button.release(x, y);
    }

    hover(x, y) {
        this.button.hover(x, y);
    }
}

module.exports = {
    UI,
};
