import { xy } from "../libbasic/utils";
import { ClickCallback, XY } from "@olehermanse/utils";
import { Draw } from "../libdraw/draw";
import { Card } from "../libtowers/libtowers";

class UIRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string | null;
  stroke: string | null;
  padding: number;
  margin: number;
  line_width: number | null;
  padded: UIRect;
  children: any[];

  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    fill = null,
    stroke = null,
    padding = 0,
    margin = 0,
    line_width = null
  ) {
    this.x = x + margin;
    this.y = y + margin;
    this.w = w - 2 * margin;
    this.h = h - 2 * margin;
    this.fill = fill;
    this.stroke = stroke;
    this.padding = padding;
    this.padded = this;
    if (padding > 0) {
      this.padded = this.get_padded();
    }
    this.line_width = line_width;
    this.children = [];
  }

  get_padded() {
    return new UIRect(
      this.x + this.padding,
      this.y + this.padding,
      this.w - 2 * this.padding,
      this.h - 2 * this.padding,
      this.fill,
      this.stroke,
      0,
      0
    );
  }

  draw_children(ctx: CanvasRenderingContext2D) {
    this.children.map((c) => {
      c.draw(ctx);
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    Draw.rectangle(
      ctx,
      this.x,
      this.y,
      this.w,
      this.h,
      this.fill,
      this.stroke,
      this.line_width
    );
    this.draw_children(ctx);
  }

  center(): XY {
    return xy(this.x + this.w / 2, this.y + this.h / 2);
  }

  top_left(): XY {
    return xy(this.x, this.y);
  }

  top_right(): XY {
    return xy(this.x + this.w, this.y);
  }

  bottom_left(): XY {
    return xy(this.x, this.y + this.h);
  }

  bottom_right(): XY {
    return xy(this.x + this.w, this.y + this.h);
  }

  top(): XY {
    return xy(this.x + this.w / 2, this.y);
  }

  bottom(): XY {
    return xy(this.x + this.w / 2, this.y + this.h);
  }

  left(): XY {
    return xy(this.x, this.y + this.h / 2);
  }

  right() {
    return xy(this.x + this.w, this.y + this.h / 2);
  }

  is_inside(x: number, y: number): boolean {
    return (
      x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h
    );
  }
}

class UIText {
  x: number;
  y: number;
  c: string;
  text: string;
  textAlign: string;
  textBaseline: string;
  font: number;
  w: number;

  constructor(
    x: number,
    y: number,
    color: string,
    font: number,
    text: string = "",
    n: number = 5
  ) {
    this.x = x;
    this.y = y;
    this.c = color;
    this.text = text;
    this.textAlign = "center";
    this.textBaseline = "middle";
    this.font = font;
    this.w = 0.6 * font * n;
  }

  left(): XY {
    return xy(this.x - this.w, this.y);
  }

  draw(ctx: CanvasRenderingContext2D) {
    Draw.fill_text(
      ctx,
      this.text,
      this.x,
      this.y,
      this.c,
      this.font,
      this.textAlign,
      this.textBaseline
    );
  }
}

class UIButton extends UIRect {
  label: UIText | null;
  on_click: ClickCallback;
  state: string;
  base_color: string;
  draw_icon_callback: any; // TODO make type for draw icon callback
  painter: any;
  name: string;
  card: Card | null;

  constructor(
    x,
    y,
    w,
    h,
    fill = null,
    stroke = null,
    label = null,
    line_width = null
  ) {
    super(x, y, w, h, fill, stroke);
    this.line_width = line_width;
    if (label === null) {
      this.label = null;
    } else {
      this.label = new UIText(x + w / 2, y + h / 2, stroke, h / 2, label);
      this.children.push(this.label);
    }
    this.on_click = null;
    this.state = "active";
    this.base_color = stroke;
    this.draw_icon_callback = null;
    this.painter = null;
    this.card = null;
  }

  hide() {
    this.state = "hidden";
  }

  show() {
    if (this.state === "hidden") {
      this.state = "active";
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.state === "hidden") {
      return;
    }
    if (this.draw_icon_callback != null) {
      this.draw_icon_callback(this.center(), this.w);
    }
    super.draw(ctx);
  }

  set_temporary_color(label = null, rect = null) {
    if (this.label != null) {
      if (label != null) {
        this.label.c = label;
      } else {
        this.label.c = this.base_color;
      }
    }
    if (rect != null) {
      this.stroke = rect;
    } else {
      this.stroke = this.base_color;
    }
  }

  transition(state: string) {
    console.assert(this.state != state);
    this.state = state;
    const blue = "rgba(0,128,255,1)";
    const grey = "rgba(180,180,180,1)";
    const red = "rgba(255,0,0,1)";
    if (state === "active") {
      this.set_temporary_color();
    } else if (state === "hovered") {
      this.set_temporary_color(blue, blue);
    } else if (state === "clicked") {
      this.set_temporary_color(blue, grey);
    } else if (state === "disabled") {
      this.set_temporary_color(grey, grey);
    } else if (state === "selected") {
      this.set_temporary_color(blue, blue);
    } else {
      this.set_temporary_color(red, red);
    }
  }

  click(x: number, y: number) {
    if (this.state === "hidden") {
      return;
    }
    if (["active", "hovered"].includes(this.state) && this.is_inside(x, y)) {
      this.transition("clicked");
    }
  }

  release(x: number, y: number) {
    if (this.state === "hidden") {
      return;
    }
    if (this.state === "clicked") {
      if (this.is_inside(x, y)) {
        this.transition("hovered");
        if (this.on_click != null) {
          this.on_click(this);
        }
      } else {
        this.transition("active");
      }
    }
  }

  hover(x: number, y: number): any[] {
    if (this.state === "hidden") {
      return [];
    }
    const inside: boolean = this.is_inside(x, y);
    if (this.state === "hovered" && !inside) {
      this.transition("active");
    } else if (this.state === "active" && inside) {
      this.transition("hovered");
    }
    if (inside) {
      return [this];
    }
    return [];
  }
}

class UITooltip {
  pos: XY;
  card: Card;
  opacity: number;
  fading_in: boolean;
  fade_in_time: number;
  delay: number;

  constructor(pos: XY, card: Card) {
    this.pos = pos;
    this.card = card;
    this.opacity = 0.0;
    this.fading_in = false;
    this.fade_in_time = 0.1;
    this.delay = 0.0;
  }

  fade_in() {
    if (this.fading_in) {
      return;
    }
    if (this.opacity <= 0.0 && this.delay <= 0.0) {
      this.delay = 0.5;
    }
    this.fading_in = true;
  }

  fade_out() {
    this.fading_in = false;
    this.delay = 0.0;
  }

  update(ms) {
    const s = (1.0 * ms) / 1000;
    if (this.delay > 0.0) {
      this.delay -= s;
      return;
    }
    const fading_in = this.fading_in;
    if (fading_in && this.opacity >= 1.0) {
      return;
    }
    if (!fading_in && this.opacity <= 0.0) {
      return;
    }
    const step = (1.0 / this.fade_in_time) * s;
    if (fading_in) {
      this.opacity += step;
    } else {
      this.opacity -= 0.5 * step;
    }
  }
}

export { UIRect, UIText, UIButton, UITooltip };
