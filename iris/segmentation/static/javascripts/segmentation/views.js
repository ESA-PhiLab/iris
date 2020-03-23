/*Extend the layers from ViewLayer*/

class MaskLayer extends CanvasLayer{
    constructor(port, vm, view){
        super(port, vm, view, "mask");
    }
    render(bbox=null){
        let ctx = this.container.getContext("2d");
        if (bbox === null){
            // No specific coordinates are given, i.e. we redraw the whole mask:
            ctx.clearRect(0, 0, ...vars.image_shape);
            ctx.drawImage(
                vars.hidden_mask,
                vars.mask_area[0], vars.mask_area[1]
            );
        } else {
            ctx.clearRect(
                bbox[0]+vars.mask_area[0],
                bbox[1]+vars.mask_area[1],
                bbox[2], bbox[3]
            );
            ctx.drawImage(
                vars.hidden_mask,
                ...bbox,
                bbox[0]+vars.mask_area[0], bbox[1]+vars.mask_area[1],
                bbox[2], bbox[3]
            );
        }
    }
}

class SuperpixelsLayer extends CanvasLayer{
    // Shows
    //
    //
    //
    constructor(port, vm, view){
        super(port, vm, view, "superpixels");
    }
    render(bbox=null){
        let ctx = this.container.getContext("2d");
        if (bbox === null){
            // No specific coordinates are given, i.e. we redraw the whole mask:
            ctx.clearRect(0, 0, ...vars.image_shape);
            ctx.drawImage(
                vars.hidden_mask,
                vars.mask_area[0], vars.mask_area[1]
            );
        } else {
            ctx.clearRect(
                bbox[0]+vars.mask_area[0],
                bbox[1]+vars.mask_area[1],
                bbox[2], bbox[3]
            );
            ctx.drawImage(
                vars.hidden_mask,
                ...bbox,
                bbox[0]+vars.mask_area[0], bbox[1]+vars.mask_area[1],
                bbox[2], bbox[3]
            );
        }
    }
}

class PreviewLayer extends CanvasLayer{
    constructor(port, vm, view){
        super(port, vm, view, "preview");

        this.container.addEventListener("mousemove", mouse_move, false);
        this.container.addEventListener("mousedown", mouse_down, false);
        this.container.addEventListener("mouseup", mouse_up, false);
        this.container.addEventListener("mouseenter", mouse_enter, false);
        this.container.addEventListener("mousewheel", mouse_wheel, false);
        this.container.addEventListener("DOMMouseScroll", mouse_wheel, false);
    }
    render(){
        let offset = get_tool_offset();

        let ctx = this.container.getContext("2d");
        ctx.clearRect(0, 0, ...vars.image_shape);
        ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
        ctx.fillRect(
            vars.cursor_image[0]+offset.x,
            vars.cursor_image[1]+offset.y,
            vars.tool.size, vars.tool.size
        );

        // Draw the boundaries of the masking area
        ctx.beginPath();
        if (vars.config.views.length < 2){
            ctx.lineWidth = "3";
        } else {
            ctx.lineWidth = "2";
        }

        ctx.strokeStyle = "red";
        ctx.setLineDash([5, 15]);
        ctx.rect(
            vars.mask_area[0], vars.mask_area[1],
            ...vars.mask_shape
        );
        ctx.stroke();
    }
}
