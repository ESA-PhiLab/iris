/*Extend the layers from ViewLayer*/

class MaskLayer extends CanvasLayer{
    constructor(port, vm, view){
        super(port, vm, view, "mask");
    }
    render(bbox=null){
        let ctx = this.container.getContext("2d");
        
        const hiddenCanvas = window.getHiddenMaskCanvasFromStore ? window.getHiddenMaskCanvasFromStore() : null;
        
        if (!hiddenCanvas) {
            console.error('[IRIS] Hidden mask canvas not available for MaskLayer render');
            return;
        }
        
        if (bbox === null){
            // No specific coordinates are given, i.e. we redraw the whole mask:
            const imageShape = window.getImageShapeFromStore ? window.getImageShapeFromStore() : null;
            
            if (imageShape) {
                ctx.clearRect(0, 0, ...imageShape);
            } else {
                console.warn('[IRIS Migration] MaskLayer.render: No image shape available');
                return;
            }
            
            const maskArea = window.getMaskAreaFromStore ? window.getMaskAreaFromStore() : null;
            
            if (!maskArea) {
                console.error('[IRIS] Mask area not available for MaskLayer render');
                return;
            }
            
            // Store-based mask rendering
            
            ctx.drawImage(
                hiddenCanvas,
                maskArea[0], maskArea[1]
            );
        } else {
            const maskArea = window.getMaskAreaFromStore ? window.getMaskAreaFromStore() : null;
            
            if (!maskArea) {
                console.error('[IRIS] Mask area not available for MaskLayer render');
                return;
            }
            
            ctx.clearRect(
                bbox[0]+maskArea[0],
                bbox[1]+maskArea[1],
                bbox[2], bbox[3]
            );
            ctx.drawImage(
                hiddenCanvas,
                ...bbox,
                bbox[0]+maskArea[0], bbox[1]+maskArea[1],
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
        
        const hiddenCanvas = window.getHiddenMaskCanvasFromStore ? window.getHiddenMaskCanvasFromStore() : null;
        
        if (!hiddenCanvas) {
            console.error('[IRIS] Hidden mask canvas not available for SuperpixelsLayer render');
            return;
        }
        
        if (bbox === null){
            // No specific coordinates are given, i.e. we redraw the whole mask:
            const imageShape = window.getImageShapeFromStore();
            
            if (!imageShape) {
                console.error('[IRIS] ❌ No image shape available for SuperpixelsLayer.render');
                return;
            }
            
            ctx.clearRect(0, 0, ...imageShape);
            
            const maskArea = window.getMaskAreaFromStore ? window.getMaskAreaFromStore() : null;
            
            if (!maskArea) {
                console.error('[IRIS] ❌ Mask area not available for SuperpixelsLayer render');
                return;
            }
            
            ctx.drawImage(
                hiddenCanvas,
                maskArea[0], maskArea[1]
            );
        } else {
            const maskArea = window.getMaskAreaFromStore ? window.getMaskAreaFromStore() : null;
            
            if (!maskArea) {
                console.error('[IRIS] Mask area not available for SuperpixelsLayer render');
                return;
            }
            
            ctx.clearRect(
                bbox[0]+maskArea[0],
                bbox[1]+maskArea[1],
                bbox[2], bbox[3]
            );
            ctx.drawImage(
                hiddenCanvas,
                ...bbox,
                bbox[0]+maskArea[0], bbox[1]+maskArea[1],
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
        
        const imageShape = window.getImageShapeFromStore();
        
        if (!imageShape) {
            console.error('[IRIS] ❌ No image shape available for PreviewLayer.render');
            return;
        }
        
        ctx.clearRect(0, 0, ...imageShape);
        ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
        
        const toolSize = window.getToolSizeFromStore ? window.getToolSizeFromStore() : 1;
        
        if (!window.getToolSizeFromStore) {
            console.error('[IRIS] ❌ Tool size not available from store');
        }
        
        const cursorImage = window.getCursorImageFromStore ? window.getCursorImageFromStore() : [0, 0];
        
        if (!window.getCursorImageFromStore) {
            console.error('[IRIS] ❌ Cursor image not available from store');
        }
        
        const toolShape = window.getToolShapeFromStore ? window.getToolShapeFromStore() : 'square';
        
        if (!window.getToolShapeFromStore) {
            console.error('[IRIS] ❌ Tool shape not available from store');
        }
        
        // Draw tool cursor preview based on shape
        if (toolShape === 'round') {
            // Draw circular cursor
            const radius = toolSize / 2;
            const centerX = cursorImage[0] + offset.x + radius;
            const centerY = cursorImage[1] + offset.y + radius;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fill();
        } else {
            // Draw square cursor (default)
            ctx.fillRect(
                cursorImage[0]+offset.x,
                cursorImage[1]+offset.y,
                toolSize, toolSize
            );
        }

        // Draw the boundaries of the masking area
        ctx.beginPath();
        
        const views = window.getConfigSectionFromStore ? 
            window.getConfigSectionFromStore('views') : null;
        
        if (!window.getConfigSectionFromStore) {
            console.error('[IRIS] ❌ Config store not available for views');
        }
        
        const viewCount = views ? (Array.isArray(views) ? views.length : Object.keys(views).length) : 0;
        if (viewCount < 2){
            ctx.lineWidth = "3";
        } else {
            ctx.lineWidth = "2";
        }

        ctx.strokeStyle = "red";
        ctx.setLineDash([5, 15]);
        const maskShape = window.getMaskShapeFromStore ? window.getMaskShapeFromStore() : null;
        
        if (!window.getMaskShapeFromStore) {
            console.error('[IRIS] ❌ Mask shape store not available');
        }
        
        const maskArea = window.getMaskAreaFromStore ? window.getMaskAreaFromStore() : null;
        
        if (maskShape && maskArea) {
            ctx.rect(
                maskArea[0], maskArea[1],
                ...maskShape
            );
            ctx.stroke();
        } else {
            console.warn('[IRIS] No mask shape or mask area available for ViewLayer rendering');
        }
    }
}
