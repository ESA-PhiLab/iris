class ViewManager{
    constructor(container, views, view_groups, view_url){
        this.container = container;
        this.views = views;
        this.view_ports = [];
        this.view_groups = view_groups;
        this.current_group = 'default';
        this.view_url = url;
        this.image_id = null;
        this.image_location = [0, 0];
        this.filters = null;
    }
    setImage(image_id){
        this.clear();
        this.image_id = image_id;
        this.image_location = [0, 0];
        this.rgb = {};
    }
    setImageLocation(location){
        this.image_location = image_location;
    }
    showGroup(group='default'){
        this.clear();

        this.current_group = group;

        let views = this.getCurrentViews();
        // Views are always squared and we want to make sure we have enough
        // vertical space
        let size = Math.min(
            round_number(window.innerWidth / views.length),
            window.innerHeight - 100,
        );
        let id = 0;
        for (view of views){
            this.loadRGB(view);

            let view_port = ViewPort(
                id.toString(), this, view,
                [size, size], [size*id, 0]
            );
            this.view_ports.push(view_port);
            id += 1;
        }
        this.render();
    }
    handleResize(){
        let size = Math.min(
            round_number(window.innerWidth / views.length),
            window.innerHeight - 100,
        );
        let column = 0;
        for (view_port of this.view_ports){
            view_port.setSize(size, size);
            view_port.setPosition(size*id, 0);
            column += 1;
        }
    }
    clear(){
        let child = this.container.lastElementChild;
        while (child) {
            this.container.removeChild(child);
            child = this.container.lastElementChild;
        }
        this.view_ports = [];
    }
    loadRGB(view){
        /*Load an image source if it was not loaded already*/
        if (view.type == "bingmap"){
            return;
        }

        if (view.name in this.rgb){
            return;
        }

        this.rgb[view.name] = new Image();
        this.rgb[view.name].src = this.view_url+this.image_id+"/"+view.name;
        // this.image[name].onload = render_image.bind(null, i, true);
    }
    addView(name, position=-1){
        this.views_group.splice(position, 0, name);
        this.showGroup();
        this.render();
    }
    removeView(position){
        this.views_group.splice(position, 1);
        this.showGroup();
        this.render();
    }
    getCurrentViews(){
        views = {};
        for (view of this.view_groups[this.current_group]){
            views[view] = this.views[view];
        }
        return views;
    }
    render(layer=null){
        this.filters = vars.filters;
        for (view_port of this.view_ports){
            view_port.render(layer);
        }
    }
}

class ViewPort{
    /*The view port element*/
    constructor(id, parent, view, size, pos){
        this.id = id;
        this.parent = parent;
        this.view = view;
        this.layer = {};

        this.container = document.createElement('div');
        this.container.style.position = "relative";
        this.container.style.left = pos[0];
        this.container.style.top = pos[1];
        parent.container.appendChild(this.container);
        if (type == "bingmap"){
            let canvas = document.createElement('iframe');
            canvas.style.zIndex = 0;
            canvas.frameborder = 1;
            canvas.scrolling = "no";
            updateIframe(canvas, ...size);
        } else {
            let canvas = document.createElement('canvas');
            canvas.classList.add("view-canvas");
            canvas.style.zIndex = 0;
            canvas.style.width = size[0];
            canvas.style.height = size[1];

                // <canvas id="canvas-{{ loop.index-1 }}-image" class="view-canvas"
                //     style="z-index: 0; width: 70vh; height: 70vh;"></canvas>
                // <canvas id="canvas-{{ loop.index-1 }}-mask" class="view-canvas"
                //     style="z-index: 1; width: 70vh; height: 70vh;"></canvas>
                // <canvas id="canvas-{{ loop.index-1 }}-preview" class="view-canvas"
                //     style="z-index: 2; width: 70vh; height: 70vh;"></canvas>
        }
        canvas.id = "view-"+id+"-image";
        this.addLayer("image", canvas);
    }
    setSize(width, height){
        for (name in Object.keys(this.layer)){
            let canvas = this.layer[name];
            if (canvas.tagName == "iframe"){
                updateIframe(iframe, width, height);
            } else {
                this.layer[canvas].width = width;
                this.layer[canvas].height = height;
            }
        }
    }
    setPosition(x, y){
        this.container.style.left = x;
        this.container.style.top = y;
    }
    updateIframe(iframe, width, height){
        // Default location
        let location =
            this.parent.image_location[0]
            +"~"
            +this.parent.image_location[1];

        let url = "https://www.bing.com/maps/embed?";
        url += "h="+height;
        url += "&w="+width;
        url += "&cp="+location;
        url += "&lvl=12&typ=d&sty=a&src=SHELL&FORM=MBEDV8";
        iframe.src = url;
        iframe.height = height;
        iframe.width = width;
    }
    addLayer(canvas, id){
        this.container.appendChild(canvas);
        this.layer[id] = canvas;

        if (canvas.tagName != 'canvas'){
            return;
        }
        // Here we set the resolution of the canvas in pixels. By setting
        // it to the actual size of the canvas (apparently .scrollWidth gives
        // the actual screen size in pixels) we make sure there are no blurring
        // effects.
        canvas.width = 300;
        canvas.height = 300;

        // To avoid any blurring of the images or masks, we disable smoothing
        var context = canvas.getContext("2d");
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        context.shadowBlur = 0;
        context.shadowColor = null;
        context.imageSmoothingEnabled = false;

        // Track transformations done to the canvas (like zooming and moving)
        trackTransforms(context);
    }
    render(){
        if (this.type != "image"){
            return;
        }


    }
}

class ViewLayer{
    constructor(parent, element){
        this.parent = parent;
        this.element = element;
    }
    render(){
        // Check whether the image has been loaded already
        let image = this.parent.rgb[this.view.name];
        if (!image.complete){
            setTimeout(this.render, 200);
            return;
        }

        let canvas = this.layer.image;
        let ctx = canvas.getContext('2d');

        let filters = this.parent.filters;
        if (filters !== null){
            // Apply brightness, contrast and saturation filters:
            let filter_string = [];
            if (filters.invert){
                filter_string.push("invert(1)");
            }
            filter_string.push("brightness("+filters.brightness+"%)");
            if (filters.contrast){
                filter_string.push("contrast(200%)");
            }
            filter_string.push("saturate("+filters.saturation+"%)");
            canvas.style.filter = filter_string.join(" ");
        }

        ctx.drawImage(
            image, 0, 0, image.width, image.height
        );
    }
}
