// All code for drawing towers, enemies, etc. should live here, and be
// based on the code for drawing primitives in draw.js
// This is purely callback based, anything which will be drawn needs a pointer
// to the painter object before draw is called.

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
};
