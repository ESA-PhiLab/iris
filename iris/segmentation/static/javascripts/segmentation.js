/*Instead of 2D arrays we are going to use flattened 1D arrays for perfomance
reasons, i.e. array_2d[y][x] is going to be array_1d[y*row_length+x]*/


let commands = {
    "previous_image": {
        "key": "Backspace", "description": "Save this image and open previous one",
    },
    "next_image": {
        "key": "Return", "description": "Save this image and open next one",
    },
    "save_mask": {
        "key": "S", "description": "Save this mask",
    },
    "undo": {
        "key": "U", "description": "Undo last modification",
    },
    "redo": {
        "key": "R", "description": "Redo modification",
    },
    'select_class': {
        "key": "1 .. 9", "description": "Select class for drawing",
    },
    'tool_move': {
        "key": "W", "description": "Pan your current view by dragging and moving the cursor",
    },
    'tool_reset_views': {
        "key": "Z", "description": "Reset the view in the canvases",
    },
    'tool_draw': {
        "key": "D", "description": "Draw pixels on the mask",
    },
    'tool_eraser': {
        "key": "E", "description": "Erase previously drawn pixels",
    },
    "reset_mask": {
        "key": "N", "description": "Clear the whole mask",
    },
    "predict_mask": {
        "key": "A", "description": "Use the AI to help you filling out the mask",
    },
    "toogle_mask": {
        "key": "Space", "description": "Toggle mask on/off",
    },
    "mask_final": {
        "key": "F", "description": "Show the final mask combined from your pixels and the predictions by the AI",
    },
    "mask_user": {
        "key": "G", "description": "Show your drawn pixels only",
    },
    "mask_errors": {
        "key": "H", "description": "Show where the AI failed to predict correctly",
    },
    // "mask_highlight_edges": {
    //     "key": "B", "description": "Highlight edges on the masks",
    // },
    "toggle_contrast": {
        "key": "C", "description": "Toggle contrast on/off",
    },
    "toggle_invert": {
        "key": "I", "description": "Toggle inversion on/off",
    },
    "brightness_up": {
        "key": "Arrow-Up", "description": "Increase brightness (+10%)",
    },
    "brightness_down": {
        "key": "Arrow-Down", "description": "Decrease brightness (-10%)",
    },
    "saturation_up": {
        "key": "Arrow-Right", "description": "Increase saturation (+50%)",
    },
    "saturation_down": {
        "key": "Arrow-Left", "description": "Decrease saturation (-50%)",
    },
    "reset_filters": {
        "key": "X", "description": "Reset all image filters",
    },
    "show_view_controls": {
        "key": "V", "description": "Toogle display of view controls on/off"
    },
    "next_view_group": {
        "key": "B", "description": "Switch to next group view"
    }
};

function init_segmentation(){
    show_loader("Fetching user information...");

    // Before we start, we check for the login, etc.
    vars.next_action = init_views;
    fetch_server_update(update_config=true);
}

async function init_views(){
    show_loader("Loading views...");
    vars.vm = new ViewManager(
        get_object('views-container'),
        vars.config.views, vars.config.view_groups,
        vars.url.main+"image/"
    );

    // Add standard layers to all view ports if the view type is not "bingmap":
    vars.vm.addStandardLayer(
        MaskLayer,
        (view) => view.type != "bingmap"
    )
    vars.vm.addStandardLayer(
        PreviewLayer,
        (view) => view.type != "bingmap"
    )

    // It much faster to change some pixel values on a sprite and draw it then
    // to the canvas once than redrawing each pixel to the canvas directly.
    // Hence, we use a hidden canvas for the mask:
    vars.hidden_mask = document.createElement('canvas');
    vars.hidden_mask.width = vars.mask_shape[0];
    vars.hidden_mask.height = vars.mask_shape[1];
    let hidden_ctx = vars.hidden_mask.getContext('2d');
    hidden_ctx.shadowOffsetX = 0;
    hidden_ctx.shadowOffsetY = 0;
    hidden_ctx.shadowBlur = 0;
    hidden_ctx.shadowColor = null;
    hidden_ctx.imageSmoothingEnabled = false;

    // Load mask:
    load_mask();

    vars.vm.setImage(vars.image_id, vars.image_location);
    vars.vm.showGroup();

    set_tool(vars.tool.type);
    set_current_class(vars.current_class);

    init_events();
    init_toolbar_events();

    reset_views();

    get_object("toolbar").style.visibility = "visible";
    get_object("statusbar").style.visibility = "visible";
}

function init_events(){
    document.body.onkeydown = key_down;
    document.body.onkeyup = key_up;
    document.body.onresize = () => vars.vm.updateSize();

    window.addEventListener('unload', (event) => {
      // Cancel the event as stated by the standard.
      event.preventDefault();

      save_mask();

      // Chrome requires returnValue to be set.
      event.returnValue = '';
      return '';
    });
}

function init_toolbar_events(){
    let toolbuttons = document.getElementsByClassName("toolbutton");
    for (let toolbutton of toolbuttons) {
        if (toolbutton.id === null){
            continue;
        }
        let command_id = toolbutton.id.substr(3);
        if (command_id in commands){
            let text = commands[command_id].description;

            if ('key' in commands[command_id]){
                text = '<span class="key">'+commands[command_id].key+'</span> ' + text;
            }

            toolbutton.onmouseenter = show_message.bind(null, text, null);
            toolbutton.onmouseleave = hide_message.bind(null);
        }
    }
}

function key_down(event){
    let key = event.code;

    if (get_object('dialogue').style.display == "block"){
        // Don't allow any key events during an opened dialogue
    }else if (key == "Space"){
        show_mask(!vars.show_mask);
    } else if (key == "KeyS"){
        save_mask();
    } else if (key == "Enter"){
        save_mask(next_image);
    } else if (key == "Backspace"){
        save_mask(prev_image);
    } else if (key == "KeyU"){
        undo();
    } else if (key == "KeyR"){
        redo();
    } else if (key == "KeyC"){
        set_contrast(!vars.vm.filters.contrast);
    } else if (key == "KeyI"){
        set_invert(!vars.vm.filters.invert);
    } else if (key == "ArrowUp"){
        change_brightness(up=true);
    } else if (key == "ArrowDown"){
        change_brightness(up=false);
    } else if (key == "ArrowRight"){
        change_saturation(up=true);
    } else if (key == "ArrowLeft"){
        change_saturation(up=false);
    } else if (key == "KeyX"){
        reset_filters();
    } else if (key == "KeyY"){
        reset_views();
    } else if (key == "KeyA"){
        predict_mask();
    } else if (key == "KeyF"){
        set_mask_type("final");
    } else if (key == "KeyG"){
        set_mask_type("user");
    } else if (key == "KeyH"){
        set_mask_type("errors");
    } else if (key.startsWith("Digit") || key.startsWith("Numpad")){
        // Why do we subtract 1 from this? The class ids start with 0, so we
        // want to make the hotkey easier:
        var class_id = parseInt(key[key.length-1]) - 1;
        if (class_id < vars.classes.length){
            set_current_class(class_id);
        }
    } else if (key == "KeyD"){
        set_tool("draw");
    } else if (key == "KeyE"){
        set_tool("eraser");
    } else if (key == "KeyW"){
        set_tool("move");
    } else if (key == "KeyN"){
        dialogue_reset_mask();
    } else if (key == "KeyV"){
        vars.vm.toogleControls();
    } else if (key == "KeyB"){
        vars.vm.showNextGroup();
    } else if (event.shiftKey){
        vars.tool.resizing_mode = true;
    }
}

function key_up(event){
    vars.tool.resizing_mode = event.shiftKey;
}

function change_brightness(up){
    if (up){
        vars.vm.filters.brightness += 10;
        vars.vm.filters.brightness = Math.min(800, vars.vm.filters.brightness);
    } else {
        vars.vm.filters.brightness -= 10;
        vars.vm.filters.brightness = Math.max(0, vars.vm.filters.brightness);
    }
    vars.vm.render();
}
function change_saturation(up){
    if (up){
        vars.vm.filters.saturation += 20;
        vars.vm.filters.saturation = Math.min(800, vars.vm.filters.saturation);
    } else {
        vars.vm.filters.saturation -= 20;
        vars.vm.filters.saturation = Math.max(0, vars.vm.filters.saturation);
    }
    vars.vm.render();
}

function set_current_class(class_id){
    vars.current_class = class_id;
    var colour = vars.classes[class_id].colour;
    var css_colour = rgba2css(colour);
    get_object("tb_current_class").innerHTML = vars.classes[class_id].name;
    get_object("tb_select_class").style["background-color"] = css_colour;

    // Convenience - automatically change to drawing tool after selecting class:
    set_tool("draw");
}

function set_contrast(visible){
    vars.vm.filters.contrast = visible;

    if (vars.vm.filters.contrast){
        get_object("tb_toggle_contrast").classList.add("checked");
    } else {
        get_object("tb_toggle_contrast").classList.remove("checked");
    }

    vars.vm.render();
}

function set_invert(visible){
    vars.vm.filters.invert = visible;

    if (vars.vm.filters.invert){
        get_object("tb_toggle_invert").classList.add("checked");
    } else {
        get_object("tb_toggle_invert").classList.remove("checked");
    }

    vars.vm.render();
}

function set_tool(tool){
    get_object("tb_tool_"+vars.tool.type).classList.remove("checked");
    get_object("tb_tool_"+tool).classList.add("checked");

    vars.tool.type = tool;

    render_preview();
}

function get_tool_offset(){
    /*Since we have draw with a tool, this returns the offset of the tool sprite*/
    if (vars.tool.size == 1){
        return {'x': 0, 'y': 0}
    }

    return {
        'x': round_number(-vars.tool.size/2),
        'y': round_number(-vars.tool.size/2),
    };
}

function mouse_wheel(event){
    var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
    if (vars.tool.resizing_mode){
        // Change size of tool:
        vars.tool.size += delta * 0.5 * vars.tool.size;
        vars.tool.size = round_number(Math.max(
            1, Math.min(
                vars.tool.size, Math.max(...vars.mask_shape)
            )
        ));
        render_preview();
    } else {
        zoom(delta);
    }
}

function mouse_move(event){
    update_cursor_coords(this, event);
    if (
        (event.buttons == 2
        || event.buttons == 4
        || (event.buttons == 1 && vars.tool.type == 'move'))
        && vars.drag_start !== null
    ){
        move(
            vars.cursor_image[0]-vars.drag_start[0],
            vars.cursor_image[1]-vars.drag_start[1]
        );
    }

    // mouse left button must be pressed to draw
    if (event.buttons == 1 && vars.tool.type != 'move'){
        user_draws_on_mask();
    }

    // Show a preview of the pencil:
    render_preview();
}

function mouse_down(event){
    update_cursor_coords(this, event);

    if (event.buttons == 1 && vars.tool.type != 'move'){
        user_draws_on_mask();
        vars.drag_start = null;
    } else if (
        event.buttons == 2
        || event.buttons == 4
        || (event.buttons == 1 && vars.tool.type == 'move')
    ){
        vars.drag_start = [...vars.cursor_image];
    }
}

function mouse_up(event){
    vars.drag_start = null;
}

function mouse_enter(event){
    update_cursor_coords(this, event);
    if (
        event.buttons == 2
        || event.buttons == 4
        || (event.buttons == 1 && vars.tool.type == 'move')
    ){
        vars.drag_start = [...vars.cursor_image];
    }
}

function zoom(delta){
    let factor = Math.pow(1.1, delta);

    for (let canvas of document.getElementsByClassName('view-canvas')){
        let ctx = canvas.getContext('2d');
        // This makes sure that we zoom onto the current cursor position:
        ctx.translate(...vars.cursor_image);
        ctx.scale(factor, factor);
        ctx.translate(-vars.cursor_image[0], -vars.cursor_image[1]);

        constrain_view(ctx, factor, 0, 0);
    }
    update_views();
}

function move(dx, dy){
    if (dx == 0 && dy == 0){
        return;
    }

    for (let canvas of document.getElementsByClassName('view-canvas')){
        let ctx = canvas.getContext('2d');
        ctx.translate(dx, dy);
        constrain_view(ctx, 1, dx, dy);
    }
    update_views();
}

function constrain_view(ctx, scale, dx, dy){
    let transforms = ctx.getTransform();

    if (transforms.a*scale < ctx.canvas.width / vars.image_shape[0]){
        // We don't want to allow any zooming outside of the image area and reset
        // it to the default view

        transforms.a = ctx.canvas.width / vars.image_shape[0];
        transforms.d = ctx.canvas.width / vars.image_shape[0];
        transforms.b = 0;
        transforms.c = 0;
        transforms.e = 0;
        transforms.f = 0;
    }

    let top_left = ctx.getCanvasCoords(0, 0);
    if (top_left.x > 0){
        transforms.e -= top_left.x;
    }
    if (top_left.y > 0){
        transforms.f -= top_left.y;
    }

    let bottom_right = ctx.getCanvasCoords(...vars.image_shape);
    if (bottom_right.x < ctx.canvas.width){
        transforms.e -= bottom_right.x - ctx.canvas.width;
    }
    if (bottom_right.y < ctx.canvas.height){
        transforms.f -= bottom_right.y - ctx.canvas.height;
    }

    ctx.setTransform(
        transforms.a, transforms.b, transforms.c,
        transforms.d, transforms.e, transforms.f
    );
}

function update_views(){
    /*Update all views in all canvases. Always required after a zooming or
    translation action.*/

    // The coordinate system has changed:
    let one_canvas = document.getElementsByClassName("view-canvas")[0];
    let image_coords = one_canvas.getContext("2d").getWorldCoords(
        ...vars.cursor_canvas
    );
    vars.cursor_image = [image_coords.x, image_coords.y];

    // Redraw everything:
    vars.vm.render();
}

function reset_views(){
    for (let canvas of document.getElementsByClassName('view-canvas')){
        let ctx = canvas.getContext('2d');
        ctx.setTransform(
            ctx.canvas.width / vars.image_shape[0], 0, 0,
            ctx.canvas.width / vars.image_shape[0], 0, 0
        );
    }
    update_views();
}

function update_cursor_coords(obj, event){
    // Update the current coords to image coordinate system:
    let rect = obj.getBoundingClientRect();
    let x = round_number(
        (event.clientX - rect.left) / (rect.right - rect.left) * obj.width
    );
    let y = round_number(
        (event.clientY - rect.top) / (rect.bottom - rect.top) * obj.height
    );

    vars.cursor_canvas = [x, y];
    let canvas = document.getElementsByClassName('view-canvas')[0];
    let image_coords = canvas.getContext("2d").getWorldCoords(x, y);
    vars.cursor_image = [
        round_number(image_coords.x), round_number(image_coords.y)
    ];
}

function update_drawn_pixels(){
    vars.n_user_pixels = {
        "total": 0
    };
    for (var i=0; i < vars.classes.length; i++){
        vars.n_user_pixels[i] = 0;
    }

    for (var i=0; i<vars.user_mask.length; i++){
        if (vars.user_mask[i]){
            vars.n_user_pixels[vars.mask[i]] += 1;
            vars.n_user_pixels.total += 1;
        }
    }
    get_object("drawn-pixels").innerHTML = nice_number(vars.n_user_pixels.total);

    var different_classes = 0;
    for (var i=0; i < vars.classes.length; i++){
        if (vars.n_user_pixels[i] > 10){
            different_classes += 1;
        }
    }

    get_object("different-classes").innerHTML = different_classes;

    if (different_classes >= 2){
        get_object("ai-recommendation").innerHTML = "Start the training!";
    } else {
        get_object("ai-recommendation").innerHTML = "Draw at least 10 pixels from two classes!";
    }
}

function discard_future(){
    // Delete everything ahead the current epoch in the history stack
    if (vars.history.current_epoch == vars.history.mask.length-1){
        return;
    }

    var start = vars.history.current_epoch+1;
    var n_elements = vars.history.mask.length - vars.history.current_epoch
    vars.history.mask.splice(start, n_elements);
    vars.history.user_mask.splice(start, n_elements);
}

function update_history(){
    vars.history.mask.push(vars.mask.slice());
    vars.history.user_mask.push(vars.user_mask.slice());

    if (vars.history.mask.length > vars.history.max_epochs){
        // Remove the oldest timestamp
        vars.history.mask.shift();
        vars.history.user_mask.shift();
    }
    vars.history.current_epoch = vars.history.mask.length - 1;
}

function undo(){
    if (vars.history.mask.length == 0){
        // There is no history saved
        return;
    }

    vars.history.current_epoch -= 1;
    vars.history.current_epoch = Math.max(
        vars.history.current_epoch, 0
    );

    vars.mask = vars.history.mask[vars.history.current_epoch].slice();
    vars.user_mask = vars.history.user_mask[vars.history.current_epoch].slice();

    update_drawn_pixels();
    reload_hidden_mask();
    render_mask();
}

function redo(){
    if (vars.history.mask.length == 0){
        // There is no history saved
        return;
    }

    vars.history.current_epoch += 1;
    vars.history.current_epoch = Math.min(
        vars.history.current_epoch, vars.history.mask.length-1
    );

    vars.mask = vars.history.mask[vars.history.current_epoch].slice();
    vars.user_mask = vars.history.user_mask[vars.history.current_epoch].slice();

    update_drawn_pixels();
    reload_hidden_mask();
    render_mask();
}

function user_draws_on_mask(){
    /*The user draws to the mask

    Returns:
        * list([x0, y0, xn, yn]) - bounding_box in canvas coordinates

    */

    // Just get one canvas
    let canvas = document.getElementsByClassName("view-canvas")[0];
    let ctx = canvas.getContext('2d');

    // Get the area we finally have to render (update) in canvas coordinates.
    // This increases the performances:
    let drawing_area = {
        'min_x': vars.image_shape[0],
        'min_y': vars.image_shape[1],
        'max_x': 0,
        'max_y': 0,
    };

    // Since the tools (like the painting brush) are centered on the cursor, all
    // tool pixels must be translated by an offset:
    let offset = get_tool_offset();

    // We go through each tool pixel (pixel where something should be drawn to)
    // and check whether it is inside the mask and canvas area. Hence, we need
    // to convert the tool pixels which are relative coordinates into mask and
    // canvas coordinates.

    // Get the bounding box mask coordinates:
    let x_start = vars.cursor_image[0] + offset.x,// - vars.mask_area[0],
        x_end = x_start + vars.tool.size;
    let y_start = vars.cursor_image[1] + offset.y,// - vars.mask_area[1],
        y_end = y_start + vars.tool.size;

    // Make sure we do not draw outside of the canvas. Hence, here we have the
    // canvas boundaries in image coordinates:
    let canvas_bounds = [
        ctx.getWorldCoords(0, 0),
        ctx.getWorldCoords(canvas.width, canvas.height)
    ];
    x_start = Math.max(round_number(canvas_bounds[0].x), x_start);
    x_end = Math.min(round_number(canvas_bounds[1].x), x_end);
    y_start = Math.max(round_number(canvas_bounds[0].y), y_start);
    y_end = Math.min(round_number(canvas_bounds[1].y), y_end);

    // Transform into mask coordinates:
    x_start -= vars.mask_area[0];
    x_end -= vars.mask_area[0];
    y_start -= vars.mask_area[1];
    y_end -= vars.mask_area[1];

    // Make sure we do not draw outside of the masking area:
    x_start = Math.max(0, x_start);
    x_end = Math.min(vars.mask_shape[0]-1, x_end);
    y_start = Math.max(0, y_start);
    y_end = Math.min(vars.mask_shape[1]-1, y_end);

    for (let x = x_start; x < x_end; x++) {
        for (let y = y_start; y < y_end; y++) {
            if (vars.tool.type == "eraser"){
                vars.user_mask[y*vars.mask_shape[0]+x] = 0;
            } else {
                vars.mask[y*vars.mask_shape[0]+x] = vars.current_class;
                vars.user_mask[y*vars.mask_shape[0]+x] = 1;
            }
        }
    }
    drawing_area = [x_start, y_start, x_end-x_start, y_end-y_start];

    // Now we draw on the hidden mask and render it
    if (vars.mask_type == 'final' || vars.mask_type == 'user'){
        var hidden_ctx = vars.hidden_mask.getContext('2d');
        hidden_ctx.clearRect(...drawing_area);

        if (vars.tool.type != "eraser"){
            hidden_ctx.fillStyle = rgba2css(get_current_class_colour());
            hidden_ctx.fillRect(...drawing_area);
        }

        // Render the current mask view:
        render_mask(drawing_area);
    }

    update_drawn_pixels();

    // Part of the history (undo-redo) system. When new pixels are drawn, we
    // delete all saved future elements in the history stack and add the
    // current masks to the history
    discard_future();
    update_history();

    vars.show_dialogue_before_next_image = true;
}

function reload_hidden_mask(){
    /*Update hidden mask on a offscreen canvas*/
    let ctx = vars.hidden_mask.getContext('2d');

    // Prepare the actual mask which will be drawn:
    let [mask, colours] = get_current_mask_and_colours();
    let sprite = ctx.createImageData(...vars.mask_shape);

    // We go through each pixel in the bounding box and redraw them:
    for (var y = 0; y < sprite.height; y++) {
        for (var x = 0; x < sprite.width; x++) {
            let offset = (y * sprite.width + x) * 4;
            let colour = colours[mask[y*vars.mask_shape[0]+x]];
            sprite.data[offset] = colour[0];
            sprite.data[offset + 1] = colour[1];
            sprite.data[offset + 2] = colour[2];
            sprite.data[offset + 3] = colour[3];
        }
    }

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    //(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight):
    ctx.putImageData(sprite, 0, 0);
}

function set_mask_type(type){
    get_object("tb_mask_"+vars.mask_type).classList.remove("checked");
    get_object("tb_mask_"+type).classList.add("checked");

    vars.mask_type = type;

    reload_hidden_mask();
    render_mask();
    show_mask(true);
}

function get_current_class_colour(){
    if (vars.mask_type == "user"){
        if ("user_colour" in vars.classes[vars.current_class]){
            return vars.classes[vars.current_class].user_colour;
        } else {
            return vars.classes[vars.current_class].colour;
        }
    } else { //  if (vars.mask_type == "user"){
        return vars.classes[vars.current_class].colour;
    }
}

function get_current_mask_and_colours(){
    if (vars.mask_type == "final"){
        var colours = [];
        for (var c of vars.classes){
            colours.push(c.colour);
        }
        return [vars.mask, colours]
    } else if (vars.mask_type == "user"){
        var colours = [
            [255, 255, 255,0], // no user pixel
        ];
        for (var c of vars.classes){
            if ("user_colour" in c){
                colours.push(c.user_colour);
            } else {
                colours.push(c.colour);
            }
        }
        var mask = new Uint8Array(vars.mask.length);
        for (var i=0; i<mask.length; i++){
            if (vars.user_mask[i]){
                mask[i] = vars.mask[i] + 1;
            } else {
                // User did not draw anything, so keep it transparent:
                mask[i] = 0;
            }
        }

        return [mask, colours]
    } else if (vars.mask_type == "errors"){ // error mask
        var colours = [
            [255, 255, 255,0], // no validation possible
            [0, 255, 0, 70], // correctly predicted
            [255, 70, 70, 255], // wrongly predicted
        ];
        return [vars.errors_mask, colours]
    }
}

function render_mask(bbox=null){
    /*Draw the mask onto the mask canvases.

    Args:
        bbox [x_0, y_0, x_n, y_n]: area in canvas coordinates that should
        be rendered. If given, this function only redraws this area.
        Otherwise (per default), it renders the whole mask in the current canvas
        area again.
    */

    // Render the new mask sprite to all canvases:
    for (let layer of vars.vm.getLayers("mask")) {
        layer.render(bbox);
    }
}

function render_preview(){
    for (let layer of vars.vm.getLayers("preview")) {
        layer.render();
    }
}

function dialogue_reset_mask(){
    var content = "<p>Are you sure you want to reset all your drawn pixels?</p>";
    content += "<button onclick='hide_dialogue();reset_mask();'>Reset</button>";
    content += "<button onclick='hide_dialogue();'>Cancel</button>";
    show_dialogue("warning", content);
}

function reset_mask(){
    vars.mask = new Uint8Array(vars.mask_shape[1]*vars.mask_shape[0]);
    vars.user_mask = new Uint8Array(vars.mask_shape[1]*vars.mask_shape[0]);

    vars.mask.fill(0);
    vars.user_mask.fill(0);

    reload_hidden_mask();
    render_mask();
    update_drawn_pixels();

    vars.show_dialogue_before_next_image = true;
}

function reset_filters(){
    vars.vm.filters.brightness = 100;
    vars.vm.filters.saturation = 100;
    set_contrast(false);
    set_invert(false);
    vars.vm.render();
}

// TODO: how to get the action_id without sending an additional request?
// async function activate_action(activate){
//     vars.activate_action = activate;
//
//     show_message("Mask is being activated...");
//
//     action_info = {
//         "active": activate
//     }
//
//     fetch(`${vars.url.main}set_action_info/${action_id}`, {
//         method: "POST",
//         body: JSON.stringify(action_info)
//     })
//
//     if (vars.activate_action){
//         get_object("tb_activate_action").classList.add("checked");
//     } else {
//         get_object("tb_activate_action").classList.remove("checked");
//     }
//     hide_message();
// }

function show_mask(visible){
    vars.show_mask = visible;
    var state = "none";
    if (vars.show_mask){
        state = "block";
    }
    for (let layer of vars.vm.getLayers("mask")){
        layer.container.style.display = state;
    }

    if (vars.show_mask){
        get_object("tb_toogle_mask").classList.add("checked");
    } else {
        get_object("tb_toogle_mask").classList.remove("checked");
    }
}

function login_finished(){
    fetch_server_update(update_config=true);
}

function logout_finished(){
    save_mask();
    goto_url(vars.url.segmentation+'?image_id='+vars.image_id);
}

async function fetch_server_update(update_config=true){
    let response = await fetch(vars.url.user+"get/current");
    if (response.status == 403) {
        dialogue_login();
        return;
    }
    let user = await response.json();

    // Get more information about the current image:
    response = await fetch(vars.url.main+"image_info/"+vars.image_id);
    if (response.status != 404) {
        image = await response.json();

        let info_box = '<div class="info-box-top" style="position: relative;">';
        info_box += clip_string(image.id, 20);
        let masks = image.segmentation.count;
        if (image.segmentation.current_user_score !== null){
            masks -= 1;
        }

        if (masks != 0){
            let text = '1 other mask';
            if (masks > 1){
                text = masks.toString() + ' other masks';
            }

            info_box += '<span style="position: absolute; right: -12px; top: -25px; align-text: right;" class="tag">'+text+'</span>';
        }
        info_box += '</div>';
        info_box += '<div class="info-box-bottom">image</div>';
        get_object('image-info').innerHTML = info_box;
    } else {
        return;
    }

    info_box = '<div class="info-box-top" style="position: relative;">';
    info_box += nice_number(user.segmentation.score);
    if (image.segmentation.current_user_score !== null){
        let image_score = image.segmentation.current_user_score;
        let colour = "red";
        if (image_score > 85){
            colour = "green";
        } else if (image_score > 70){
            colour = "";
        }
        image_score = image_score.toString();
        if (image.segmentation.current_user_score_unverified){
            image_score += '?';
        }
        info_box += '<span style="position: absolute; right: -12px; top: -25px; align-text: right;" class="tag '+colour+'">'+image_score+'</span>';
    }
    info_box += '</div>';
    info_box += '<div class="info-box-bottom">'+clip_string(user.name, 20)+'</div>';
    get_object('user-info').innerHTML = info_box;
    vars.user = user;

    if (update_config){
        vars.config = user.config;

        vars.mask_area = vars.config.segmentation.mask_area;
        vars.image_shape = vars.config.images.shape;
        vars.classes = vars.config.classes;

        // The size (shape) of the mask area:
        vars.mask_shape = [
            vars.mask_area[2] - vars.mask_area[0], vars.mask_area[3] - vars.mask_area[1]
        ];
    }

    if (user.admin){
        get_object('admin-button').style.display = "block";
    } else {
        get_object('admin-button').style.display = "none";
    }

    if (vars.next_action !== null){
        vars.next_action();
        vars.next_action = null;
    }

    // Check every 15 seconds the current state on the server:
    setTimeout(fetch_server_update, 15000);
}

async function dialogue_image(){
    let content = '<p><img src="'+vars.url.main+'thumbnail/'+vars.image_id+'?size=256x256" style="display: block; margin-left: auto; margin-right: auto;"/></p>';
    let response = await fetch(
        vars.url.main+'metadata/'+vars.image_id+'?safe_html=True'
    );

    content += '<div style="float: left;">';
    if (response.status >= 400){
        content += await response.text();
    } else {
        let metadata = await response.json();
        content += '<table>';

        // row and col are at the same the id for the row and column class, respectively
        for (const attribute in metadata){
            content += '<tr>';
            content += '<td><b>'+attribute+'</b></td>';

            if (attribute == "location"){
                let location = metadata[attribute]
                                .replace('[', '')
                                .replace(']', '')
                                .replace(' ', '')

                content += '<td>' + metadata[attribute];
                content += ' <a target="_blank" href="https://www.google.com/maps/search/?api=1&query='+location+'">Show on map</a></td>';
            } else {
                content += '<td>'+metadata[attribute]+'</td>';
            }

            content += '</tr>';
        }
        content += '</table>';
    }
    content += '</div>';

    show_dialogue(
        "info", content, false, "image: "+vars.image_id
    );
}

function dialogue_confusion_matrix(){
    if (vars.confusion_matrix === null){
        show_dialogue(
            "info",
            "You need to train the AI first before you can see a confusion matrix",
            false, "Confusion Matrix"
        );
        return;
    }

    let content = '<table class="confusion-matrix" style="float: left;">';
    content += '<tr class="first"><td class="upper-left">Real / Prediction</td>';

    for (let col_class of vars.classes){
        content += '<td class="first">'+col_class.name+'</td>';
    }

    content += '</tr>';

    // row and col are at the same the id for the row and column class, respectively
    for (var row=0; row<vars.classes.length; row++){
        content += '<tr>';
        content += '<td class="first">'+vars.classes[row].name+'</td>';
        for (var col=0; col<vars.classes.length; col++){
            content += '<td>'+nice_number(vars.confusion_matrix[row][col])+'</td>';
        }
        content += '</tr>';
    }
    content += '</table>';

    show_dialogue("info", content, false, "Confusion Matrix");
}

function dialogue_class_selection(){
    var content = "<p>Here is an overview about all classes:</p>";
    content += "<table>";
    content += "<th><td>Drawn pixels by user</td><td>Description</td></th>";

    for (var i=0; i<vars.classes.length; i++){
        var c = vars.classes[i]
        content += "<tr>";
        content += "<td><button style='background-color: "+rgba2css(c.colour)+"; width: 100%;' ";
        content += "onclick='set_current_class("+i+"); hide_dialogue();'>";
        content += c.name+"</button></td>";
        content += "<td style='text-align: center;'>"+vars.n_user_pixels[i]+"</td>";
        content += "<td>"+c.description+"</td>";
        content += "</tr>";
    }

    content += "</table>";

    show_dialogue("info", content, false, "Class selection");
}

async function dialogue_help(){
    let hotkeys = {};

    for (command of Object.values(commands)){
        if ("key" in command){
            hotkeys[command.key] = command.description;
        }
    }
    let response = await fetch(
        vars.url.help, {
            method: "POST",
            body: JSON.stringify({
                "hotkeys": hotkeys,
                "page": "Segmentation",
                "page_content": "segmentation/help.html"
            })
        }
    );
    let content = await response.text();
    show_dialogue("info", content, false, title="Help");
}

async function load_mask(){
    show_loader("Loading masks...");

    var results = await download(
        vars.url.segmentation+"load_mask/" + vars.image_id
    );

    if (results.response.status != 200 && results.response.status != 404) {
        hide_loader();

        let error = await results.response.text();
        show_dialogue(
            "error",
            "Could not load the mask from the server!\n" + error
        );
        return;
    }

    var mask_length = vars.mask_shape[1]*vars.mask_shape[0];
    vars.mask = new Uint8Array(mask_length);
    vars.user_mask = new Uint8Array(mask_length);
    vars.errors_mask = new Uint8Array(mask_length);
    vars.errors_mask.fill(0);

    if (results.response.status == 200){
        var data = results.data;
        vars.mask = data.slice(1, mask_length+1);
        vars.user_mask = data.slice(mask_length+1, 2*mask_length+1);
    } else if (results.response.status == 404) {
        // Just use the default mask
        vars.mask.fill(0);
        vars.user_mask.fill(0);
    }

    set_mask_type(vars.mask_type);
    hide_loader();
    update_drawn_pixels();

    // Part of the history (undo-redo) system. When new pixels are drawn, we
    // delete all saved future elements in the history stack and add the
    // current masks to the history
    discard_future();
    update_history();
}

async function download(url, init=null, html_object=null){
    if (init === null){
        var response = await fetch(url);
    } else {
        var response = await fetch(url, init);
    }

    if (response.status >= 400){
        if (response.status == 403) {
            dialogue_login();
        }
        return {
            "response": response,
            "data": null
        };
    }

    let header = response.headers.get("content-type");
    let data;
    if (header == "application/octet-stream"){
        const reader = response.body.getReader();
        let result = await reader.read();
        let received_bytes = 0;
        let chunks = [];

        while (!result.done) {
            const value = result.value;

            received_bytes += value.length;
            chunks.push(value);

            // get the next result
            result = await reader.read();
        }

        data = new Uint8Array(received_bytes);
        let position = 0;
        for(let chunk of chunks) {
          data.set(chunk, position); // (4.2)
          position += chunk.length;
        }
    } else {
        data = await response.json();
    }

    return {
        "response": response,
        "data": data
    };
}

async function dialogue_before_next_image(){
    if (!vars.show_dialogue_before_next_image){
        return;
    }

    show_loader("Making some checks...")
    let response = await fetch(`${vars.url.main}get_action_info/${vars.image_id}/segmentation`);
    if (response.status >= 400){
        // Continue without any dialogue
        vars.show_dialogue_before_next_image=false;
        next_image();
        return;
    }
    var action = await response.json();
    var difficulty_labels=['very easy', 'easy', 'okay', 'difficult', 'very difficult'];

    var content = `
    <p>How difficult was it to create this mask?</p>
    <div class="slider">
        <div class="slider-value">${difficulty_labels[action.difficulty-1]}</div>
        <input
            class="slider-widget"
            id="dbni-difficulty"
            type="range" min="1" max="5"
            value="${action.difficulty}"
            oninput="let difficulty_labels=['very easy', 'easy', 'okay', 'difficult', 'very difficult']; this.previousElementSibling.innerHTML = difficulty_labels[parseInt(this.value)-1];">
    </div>
    <p>Do you have any comments about this segmentation (max. 256 characters)?</p>
    <textarea id="dbni-notes" style="width: 100%">${action.notes}</textarea>
    <p><input id="dbni-complete_action" type="checkbox" ${((action.complete) ? 'checked' : '')}> I think this mask is complete and ready for evaluation.</p>
    <p>
    <button onclick='dialogue_before_next_image_save_and_continue(${action.id});'>Save and continue</button>
    <button onclick='hide_dialogue();'>Go back to the mask</button>
    </p>
`;
    show_dialogue("info", content, true, "Before you continue...");
}

function dialogue_before_next_image_save_and_continue(action_id){
    vars.show_dialogue_before_next_image=false;

    action_info = {
        "complete": get_object('dbni-complete_action').checked,
        "difficulty": parseInt(get_object('dbni-difficulty').value),
        "notes": get_object('dbni-notes').value
    }

    console.log('action',action_info.complete)

    fetch(`${vars.url.main}set_action_info/${action_id}`, {
        method: "POST",
        body: JSON.stringify(action_info)
    })

    next_image();
}

function save_mask(call_afterwards=null){
    show_message('Saving mask...');
    // Do not save any masks if they have not been loaded yet
    let abort_save = false;
    if (vars.mask === null
        || vars.user_mask === null
        || vars.n_user_pixels.total == 0
    ){
        if(call_afterwards !== null){
          call_afterwards();
        }
        return;
    }

    // Combine both masks together to one byte array only with padding magic
    // numbers 254 to make sure the transaction was done successfully
    var m_length = vars.mask_shape[0]*vars.mask_shape[1];
    var data = new Uint8Array(2*m_length+2);
    var padding = new Uint8Array([254]);
    data.set(padding);
    data.set(vars.mask, 1);
    data.set(vars.user_mask, m_length+1);
    data.set(padding, 2*m_length+1);

    fetch(vars.url.segmentation+"save_mask/" + vars.image_id, {
        method: "POST",
        body: data,
        headers: {
            "Content-Type": "application/octet-stream"
        }
    }).then((response) => {save_mask_finished(response, call_afterwards);});
}

async function save_mask_finished(response, call_afterwards){
    fetch_server_update();

    if (response.status === 200) {
        show_message('Mask saved', 1000);
        if(call_afterwards !== null){
          call_afterwards();
        }
    } else {
        let error = await response.text();
        show_dialogue(
            "error",
            "<p>Could not save the mask due to an internal problem!</p>" + error
        )
    }
}

async function predict_mask(){
    var user_classes = [];
    for (var i=0; i < vars.classes.length; i++){
        if (vars.n_user_pixels[i] > 10){
            user_classes.push(i);
        }
    }
    if (user_classes.length < 2){
        // This means there is only one class with enough training pixels:
        show_dialogue(
            "warning", "You need to draw at least 10 pixels for more than one class to use the AI."
        );
        return;
    }

    show_loader("Prepare training data...");

    // Get all the user pixels
    let all_user_pixels = new Array();
    let all_user_labels = new Array();
    for (var i=0; i<=vars.user_mask.length; i++){
        // Only add the user pixel if there are enough pixels from that class:
        if (vars.user_mask[i] && vars.n_user_pixels[vars.mask[i]] > 10){
            all_user_pixels.push(i);
            all_user_labels.push(vars.mask[i]);
        }
    }

    // Sample training points (we do not want to train the model on all points):
    let all_indices = Array(all_user_pixels.length).fill().map((_, i) => i);
    var rng = new RNG(42);
    rng.shuffle(all_indices);

    // We need to keep track of how many pixels we already have sampled.
    // Furthermore, we keep also a ratio of pixels as testing dataset:
    let n_samples = {};
    for (let user_class of user_classes){
        // Set the current number of samples (0) and the maximum
        n_samples[user_class] = {
            "current": 0,
            "max": Math.min(
                round_number(vars.n_user_pixels[user_class]*vars.config.segmentation.ai_model.train_ratio),
                vars.config.segmentation.ai_model.max_train_pixels
            )
        };
    }

    // Here we decide whether we send a pixel for training to the server or keep
    // it here as testing dataset:
    let test_indices = new Array();
    let train_user_pixels = new Array();
    let train_user_labels = new Array();
    for (let i of all_indices){
        let class_id = all_user_labels[i];
        if (n_samples[class_id].current < n_samples[class_id].max){
            train_user_pixels.push(all_user_pixels[i]);
            train_user_labels.push(class_id);
            n_samples[class_id].current += 1;
        } else {
            // We will remember that we need these pixels later for testing:
            test_indices.push(i);
        }
    }

    show_loader("Train AI...");
    let results = await download(
            vars.url.segmentation+"predict_mask/" + vars.image_id,
            {
                method: "POST",
                body: JSON.stringify({
                    "user_pixels": train_user_pixels,
                    "user_labels": train_user_labels,
                })
            }
        );

    show_loader("Process results...");
    if (results.response.status >= 500) {
        hide_loader();
        console.log("Could not predict the mask! Code: " + results.response.status);
        show_dialogue(
            "error",
            "<p>Could not predict the mask due to a server problem!</p>"
        )
        return;
    }

    // Calculate confusion matrix and harmonic mean of accuracies:
    let cm = createArray(vars.classes.length, vars.classes.length);
    fill2DArray(cm, 0);

    vars.errors_mask = new Uint8Array(vars.mask.length);
    vars.errors_mask.fill(0);

    let tp = {};
    for (let user_class of user_classes){
        tp[user_class] = 0;
    }
    for (let i of all_indices){
        let mask_index = all_user_pixels[i];
        cm[all_user_labels[i]][results.data[mask_index]] += 1;

        if (all_user_labels[i] == results.data[mask_index]){
            tp[all_user_labels[i]] += 1;

            // Correct:
            // vars.errors_mask[mask_index] = 1;
        } else {
            // Incorrect:
            vars.errors_mask[mask_index] = 2;
        }
    }
    let acc_prod = user_classes.length;
    let acc_sum = 0;
    for (let label of user_classes){
        let acc = tp[label] / (vars.n_user_pixels[label]);
        acc_prod *= acc;
        acc_sum += acc;
    }

    // Set the confusion matrix
    vars.confusion_matrix = cm;

    update_ai_box(acc_prod / acc_sum, cm, tp, user_classes);

    for (var i = 0; i < results.data.length; i++) {
        // Only update the mask where the user did not draw to.
        if (!vars.user_mask[i]){
            vars.mask[i] = results.data[i];
        }
    }
    reload_hidden_mask();
    render_mask();

    // Part of the history (undo-redo) system. When new pixels are drawn, we
    // delete all saved future elements in the history stack and add the
    // current masks to the history
    discard_future();
    update_history();

    hide_loader();

    vars.show_dialogue_before_next_image = true;
}



function update_ai_box(score, cm, tp, user_classes){
    get_object("ai-score").innerHTML = round_number(score*100) + "%";

    let recommendation = "Draw more training pixels!";

    let min_acc = 1;
    let worst_label = null;

    for (let label of user_classes){
        let acc = tp[label] / (vars.n_user_pixels[label]);
        if (acc < min_acc){
            min_acc = acc;
            worst_label = label;
        }
    }
    if (worst_label !== null){
        recommendation = "Could you provide more training pixels for <b>"+vars.classes[worst_label].name+"</b>?";
    }

    get_object("ai-recommendation").innerHTML = recommendation;
}
