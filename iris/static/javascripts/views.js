class ViewManager{
    constructor(container, views, view_groups, view_url){
        this.container = container;
        this.views = views;
        this.ports = [];
        this.view_groups = view_groups;
        this.current_group = 'default';
        this.view_url = view_url;
        this.image_id = null;
        this.image_location = [0, 0];
        this.filters = {
            'contrast': false,
            'invert': false,
            'brightness': 100,
            'saturation': 100,
        },
        this.standard_layers = [
            [RGBLayer, (view) => view.type == "image"],
            [BingLayer, (view) => view.type == "bingmap"]
        ];
        this.show_controls = false;
    }
    setImage(image_id, image_location){
        this.clear();
        this.image_id = image_id;
        this.image_location = image_location;
        this.source = {};
    }
    setImageLocation(location){
        this.image_location = location;

        for (let port of this.ports){
            port.imageLocationChanged(location);
        }
    }
    showNextGroup(){
        let groups = Object.keys(this.view_groups);
        let index = groups.indexOf(this.current_group);

        if (index >= groups.length-1){
            index = 0;
        } else {
            index += 1;
        }

        show_message(`Group: <i>${groups[index]}</i>`);
        this.showGroup(groups[index]);
    }
    showGroup(group=null){
        if (group === null){
            group = this.current_group;
        }

        // Save current transformations since we don't want to reset the views
        // just because we chose a new one:
        let canvases = document.getElementsByClassName("view-canvas");
        let transform = null;
        if (canvases.length != 0){
            transform = canvases[0].getContext("2d").getTransform();
        }

        this.clear();
        this.current_group = group;

        let views = this.getCurrentViews();
        let id = 0;
        for (let view of views){
            let view_port = new ViewPort(id, this, view);
            // Add automatically the standard layers if they are applicable:
            for (let standard_layer of this.standard_layers){
                if (standard_layer[1] === null || standard_layer[1](view)){
                    view_port.addLayer(
                        new standard_layer[0](view_port, this, view)
                    );
                }
            }
            this.ports.push(view_port);
            id += 1;
        }
        this.updateSize();

        if (transform !== null){
            for (let canvas of document.getElementsByClassName("view-canvas")){
                canvas.getContext("2d").setTransform(
                    transform.a,
                    transform.b,
                    transform.c,
                    transform.d,
                    transform.e,
                    transform.f
                );
            }
        }
        this.render();
        this.showControls(this.show_controls);

        vars.config.view_groups = this.view_groups;
        save_config(vars.config);
    }
    updateSize(){
        // Views are always squared and we want to make sure we have enough
        // vertical space
        let size = Math.min(
            round_number(window.innerWidth / this.getCurrentViews().length),
            window.innerHeight - 100,
        );
        size -= 10;

        let column = 0;
        for (let view_port of this.ports){
            view_port.setSize(size, size);
            view_port.setPosition(size*column, 0);
            column += 1;
        }
    }
    clear(){
        let child = this.container.lastElementChild;
        while (child) {
            this.container.removeChild(child);
            child = this.container.lastElementChild;
        }
        this.ports = [];
    }
    addView(name, position=-1){
        this.view_groups[this.current_group].splice(position, 0, name);
        this.showGroup();
        this.render();
    }
    replaceView(position, name){
        this.view_groups[this.current_group][position] = name;
        this.showGroup();
        this.render();
    }
    removeView(position){
        this.view_groups[this.current_group].splice(position, 1);
        this.showGroup();
        this.render();
    }
    getCurrentViews(){
        let views = [];
        for (let view of this.view_groups[this.current_group]){
            views.push(this.views[view]);
        }
        return views;
    }
    render(layer=null){
        for (let view_port of this.ports){
            view_port.render(layer);
        }
    }
    addStandardLayer(layer_class, condition=null){
        /*Add a layer which will be automatically added to each new view port

        Args:
            layer_class: Must be a ViewLayer class.
            condition: Can be a function which accepts a view object. If the
                function returns true, the layer will be added to the ViewPort
                holding this view.
        */
        this.standard_layers.push(
            [layer_class, condition]
        );
    }
    getLayers(type=null, exclude=false){
        let layers = [];
        for (let port of this.ports){
            for (let layer of port.layers){
                if (type === null || layer.type == type){
                    layers.push(layer);
                }
            }
        }
        return layers;
    }
    showControls(show){
        let controls = document.getElementsByClassName("view-controls");
        for (let control of controls){
            if (show){
                control.style.visibility = "visible";
            } else {
                control.style.visibility = "hidden";
            }
        }
        this.show_controls = show;
    }
    toogleControls(){
        this.showControls(!vars.vm.show_controls);
    }
}

class ViewPort{
    /*The view port element*/
    constructor(id, vm, view){
        this.id = id;
        this.vm = vm;
        this.layers = [];

        let outer_container = document.createElement('div');
        outer_container.style.position = "relative";
        vm.container.appendChild(outer_container);
        this.container = document.createElement('div');
        this.container.style.position = "absolute";
        // this.container.style.width = "inherit";
        outer_container.appendChild(this.container);

        this.addControls(vm, id, view);
    }
    addControls(vm, id, view){
        this.controls = document.createElement('div');
        // this.controls.style.position = "absolute";
        this.controls.classList.add("view-controls");
        this.controls.style.width = "inherit";
        this.controls.style.height = "inherit";
        this.controls.style.top = "1px";
        this.controls.style.left = "1px";
        this.controls.style.border = "1px solid black";
        this.controls.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
        this.container.appendChild(this.controls);

        this.button_add = document.createElement('button');
        this.button_add.classList.add("view-controls");
        this.button_add.innerHTML = "+";
        this.button_add.style.right = "10px";
        this.button_add.style.top = "10px";
        this.button_add.onclick = () => {vm.addView(view.name, id);};
        this.controls.appendChild(this.button_add);

        this.button_remove = document.createElement('button');
        this.button_remove.classList.add("view-controls");
        this.button_remove.innerHTML = "-";
        this.button_remove.style.right = "50px";
        this.button_remove.style.top = "10px";
        this.button_remove.onclick = () => {vm.removeView(id);};
        this.controls.appendChild(this.button_remove);

        this.select_view = document.createElement('select');
        this.select_view.classList.add("view-controls");
        this.select_view.classList.add("with-arrow");
        this.select_view.innerHTML = "-";
        this.select_view.style.left = "10px";
        this.select_view.style.top = "10px";
        this.select_view.style.width = "130px";
        for(let view_name of Object.keys(vm.views)){
           var opt = document.createElement("option");
           opt.value= view_name;
           opt.innerHTML = view_name;
           if (view_name == view.name){
               opt.selected = true;
           }
           this.select_view.appendChild(opt);
        }
        this.select_view.onchange = () => {vm.replaceView(id, this.select_view.value);};
        this.controls.appendChild(this.select_view);

        this.description = document.createElement('p');
        this.description.classList.add("view-controls", "view-description");
        this.description.innerHTML = view.description;
        this.controls.appendChild(this.description);
    }
    setSize(width, height){
        this.container.style.width = width.toString()+"px";
        this.container.style.height = height.toString()+"px";
        for (let layer of this.layers){
            layer.sizeChanged(width, height);
        }
        this.description.style.maxWidth = (width-40).toString()+"px";
    }
    setPosition(x, y){
        this.container.style.left = x.toString()+"px";
        this.container.style.top = y.toString()+"px";

        for (let layer of this.layers){
            layer.positionChanged(x, y);
        }
    }
    addLayer(layer){
        this.container.appendChild(layer.container);
        this.layers.push(layer);
        layer.container.style.zIndex = this.layers.length;
    }
    render(){
        for (let layer of this.layers){
          layer.render();
        }
    }
    imageLocationChanged(image_location){
        for (let layer of this.layers){
            layer.imageLocationChanged(image_location);
        }
    }
}

class ViewLayer{
    /*Base class for view layers*/
    constructor(port, vm, view, type="base"){
        this.vm = vm;
        this.port = port;
        this.view = view;
        this.container = null;
        this.type = type
    }

    // empty methods:
    render(){
        /*
        Should be called when transformations inside the canvas happended (such
        as zooming or moving).

        */
    }
    sizeChanged(new_width, new_height){}
    positionChanged(new_x, new_y){}
    imageLocationChanged(){}
}

class CanvasLayer extends ViewLayer{
    constructor(port, vm, view, type){
        super(port, vm, view, type);

        let canvas = document.createElement('canvas');
        canvas.classList.add("view-canvas");

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

        this.container = canvas;
    }
    sizeChanged(width, height){
      this.container.style.width = width.toString()+"px";
      this.container.style.height = height.toString()+"px";
    }
}

class RGBLayer extends CanvasLayer{
    constructor(port, vm, view){
        super(port, vm, view, "rgb");
    }
    loadSource(){
        /*Load an image source if it was not loaded already*/
        if (this.vm.source.hasOwnProperty(this.view.name)){
          return;
        }

        this.vm.source[this.view.name] = new Image();
        this.vm.source[this.view.name].src =
            this.vm.view_url+this.vm.image_id+"/"+this.view.name;
        // this.image[name].onload = render_image.bind(null, i, true);
    }
    render(){
        this.loadSource();

        // Check whether the image has been loaded already
        let image = this.vm.source[this.view.name];
        if (!image.complete){
            setTimeout(() => {this.render();}, 100);
            return;
        }

        let canvas = this.container;
        let ctx = canvas.getContext('2d');

        let filters = this.vm.filters;
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

class BingLayer extends ViewLayer{
    constructor(port, vm, view){
        super(port, vm, view, "bingmap");

        let iframe = document.createElement('iframe');
        iframe.style.zIndex = 0;
        iframe.frameborder = 1;
        iframe.scrolling = "no";
        this.container = iframe;

        this.update();
    }
    update(){
        // Default location
        let location = this.vm.image_location[0]+"~"+this.vm.image_location[1];

        let url = "https://www.bing.com/maps/embed?";
        // container height and width are given in pixels (e.g. 410px). However,
        // bing only understand pure integers
        url += "h="+this.container.height.slice(0, -2);
        url += "&w="+this.container.width.slice(0, -2);
        url += "&cp="+location;
        url += "&lvl=12&typ=d&sty=a&src=SHELL&FORM=MBEDV8";
        this.container.src = url;
    }
    sizeChanged(width, height){
        this.container.width = width.toString()+"px";
        this.container.height = height.toString()+"px";
        this.container.style.width = width.toString()+"px";
        this.container.style.height = height.toString()+"px";

      this.update();
    }
    imageLocationChanged(image_location){
        this.update();
    }
}
