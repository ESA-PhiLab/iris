/*Instead of 2D arrays we are going to use flattened 1D arrays for perfomance
reasons, i.e. array_2d[y][x] is going to be array_1d[y*row_length+x]*/


let commands = {
    "previous_image": {
        "key": "Backspace",
        "description": "Save this image and open previous one"
    },
    "next_image": {
        "key": "Return",
        "description": "Save this image and open next one"
    },
    "save_mask": {
        "key": "S",
        "description": "Save this mask"
    },
    "undo": {
        "key": "U",
        "description": "Undo last modification"
    },
    "redo": {
        "key": "R",
        "description": "Redo modification"
    },
    "select_class": {
        "key": "1 .. 9",
        "description": "Select class for drawing"
    },
    "tool_move": {
        "key": "W",
        "description": "Pan your current view by dragging and moving the cursor"
    },
    "tool_reset_views": {
        "key": "Z",
        "description": "Reset the view in the canvases"
    },
    "tool_draw": {
        "key": "D",
        "description": "Draw pixels on the mask"
    },
    "tool_eraser": {
        "key": "E",
        "description": "Erase previously drawn pixels"
    },
    "reset_mask": {
        "key": "N",
        "description": "Clear the whole mask"
    },
    "predict_mask": {
        "key": "A",
        "description": "Use the AI to help you filling out the mask"
    },
    "toggle_mask": {
        "key": "Space",
        "description": "Toggle mask on/off"
    },
    "mask_final": {
        "key": "F",
        "description": "Show the final mask combined from your pixels and the predictions by the AI"
    },
    "mask_user": {
        "key": "G",
        "description": "Show your drawn pixels only"
    },
    "mask_errors": {
        "key": "H",
        "description": "Show where the AI failed to predict correctly"
    },
    // "mask_highlight_edges": {
    //     "key": "B", "description": "Highlight edges on the masks",
    // },
    "toggle_contrast": {
        "key": "C", 
        "description": "Toggle contrast on/off"
    },
    "toggle_invert": {
        "key": "I", 
        "description": "Toggle inversion on/off"
    },
    "brightness_up": {
        "key": "Arrow-Up", 
        "description": "Increase brightness (+10%)"
    },
    "brightness_down": {
        "key": "Arrow-Down", 
        "description": "Decrease brightness (-10%)"
    },
    "saturation_up": {
        "key": "Arrow-Right",
        "description": "Increase saturation (+50%)"
    },
    "saturation_down": {
        "key": "Arrow-Left",
        "description": "Decrease saturation (-50%)"
    },
    "reset_filters": {
        "key": "X",
        "description": "Reset all image filters"
    },
    "show_view_controls": {
        "key": "V",
        "description":"Toggle display of view controls on/off"
    },
    "next_view_group": {
        "key": "B",
        "description": "Switch to next group view"
    }
};

function newuser_help_popup(){
    // Open the help menu if the user is new (no saved masks):
    // Get just logged in flag from React store (ONLY source)
    const justLoggedIn = window.getJustLoggedInFromStore ? 
        window.getJustLoggedInFromStore() : false;
    
    if (!window.getJustLoggedInFromStore) {
        console.error('[IRIS] ❌ Just logged in store not available');
    }
    
    // Use React store as primary source, fallback to legacy vars
    const isNewUser = window.isNewUserFromStore ? window.isNewUserFromStore() : false;
    
    if (isNewUser && justLoggedIn == true){
        dialogue_help();
        
        // Set just_logged_in to false using React store as primary
        if (window.setJustLoggedInInStore) {
            window.setJustLoggedInInStore(false);
        } // Store-based just logged in management
    }
}
async function init_views(){
    show_loader("Loading views...");
    
    // Check if views-container exists (React ViewManager migration)
    const viewsContainer = get_object('views-container');
    const useLegacyViewManager = !!viewsContainer;
    
    // Use React store as primary source, fallback to legacy vars
    const mainUrl = window.getApiUrlFromStore ? window.getApiUrlFromStore('main') : '/';

    // Only create legacy ViewManager if container exists
    if (useLegacyViewManager) {
        const viewManager = new ViewManager(
            viewsContainer,
            window.getConfigSectionFromStore ? window.getConfigSectionFromStore('views') : [],
            window.getConfigSectionFromStore ? window.getConfigSectionFromStore('view_groups') : [],
            mainUrl+"image/",
            image_aspect_ratio = window.getImageAspectRatioFromStore ? window.getImageAspectRatioFromStore() : 1
        );

        // Store ViewManager instance in React store (only source)
        if (window.setViewManagerInStore) {
            window.setViewManagerInStore(viewManager);
        } else {
            console.error('[IRIS Migration] ❌ CRITICAL: setViewManagerInStore not available - React store required');
            throw new Error('React store not available for ViewManager - initialization failed');
        }

        // Add standard layers to all view ports if the view type is not "bingmap":
        viewManager.addStandardLayer(
            MaskLayer,
            (view) => view.type != "bingmap"
        );
        viewManager.addStandardLayer(
            PreviewLayer,
            (view) => view.type != "bingmap"
        );
    } else {
        // Create a minimal mock ViewManager for compatibility
        const mockViewManager = {
            setImage: () => {},
            showGroup: () => {},
            getLayers: () => [],
            updateViewDimensions: () => {},
            updateSize: () => {},
            render: () => {
                // Mock render - React ViewManager handles rendering
            },
            // Add filters property to match real ViewManager
            filters: {
                contrast: false,
                invert: false,
                brightness: 100,
                saturation: 100
            }
        };
        
        // Store mock ViewManager in React store (only source)
        if (window.setViewManagerInStore) {
            window.setViewManagerInStore(mockViewManager);
        } else {
            console.error('[IRIS Migration] ❌ CRITICAL: setViewManagerInStore not available - React store required');
            throw new Error('React store not available for ViewManager - initialization failed');
        }
    }

    // It much faster to change some pixel values on a sprite and draw it then
    // to the canvas once than redrawing each pixel to the canvas directly.
    // Hence, we use a hidden canvas for the mask:
    if (!window.createHiddenMaskCanvasFromStore) {
        console.error('[IRIS] ❌ CRITICAL: Hidden mask canvas store not available');
        throw new Error('React store required for hidden mask canvas');
    }
    
    // Use React store for hidden mask canvas creation
    const maskShape = window.getMaskShapeFromStore();
    if (!maskShape) {
        console.error('[IRIS] ❌ CRITICAL: No mask shape available for hidden canvas creation');
        throw new Error('Mask shape required for hidden canvas');
    }
    
    window.createHiddenMaskCanvasFromStore(maskShape[0], maskShape[1]);

    // Load mask (now properly awaited):
    await load_mask();

    // Get ViewManager from React store (only source)
    const viewManager = window.getViewManagerFromStore ? window.getViewManagerFromStore() : (() => {
        console.error('[IRIS Migration] ❌ CRITICAL: getViewManagerFromStore not available - React store required');
        throw new Error('React store not available for ViewManager');
    })();

    viewManager.setImage(
        window.getCurrentImageIdFromStore(), 
        window.getImageLocationFromStore()
    );
    viewManager.showGroup();

    set_tool(window.getCurrentToolFromStore ? window.getCurrentToolFromStore() : 'draw');
    const currentClass = window.getCurrentClassFromStore ? window.getCurrentClassFromStore() : 0;
    set_current_class(currentClass);

    init_events();
    init_toolbar_events();

    reset_views();

    hide_loader(); // Ensure loader is hidden after initialization
    newuser_help_popup();
}

function init_events(){
    document.body.onkeydown = key_down;
    document.body.onkeyup = key_up;
    document.body.onresize = () => {
        // PRIMARY: Use React store (ONE-WAY SYNC)
        if (window.viewManagerStore) {
            window.viewManagerStore.getState().updateSize();
        } else {
            // React store is required - no fallback
            console.error('[IRIS Migration] ❌ CRITICAL: React store not available for updateSize');
            throw new Error('React store not available for ViewManager');
        }
    };

    window.addEventListener('unload', (event) => {
      // Only save if there are unsaved changes
      if (window.segmentationStore) {
          const state = window.segmentationStore.getState();
          if (state.maskChanged) {
              // Use sendBeacon for reliable delivery during page unload
              // fetch() is unreliable during unload as the browser may cancel it
              const maskData = window.getMaskDataFromStore ? window.getMaskDataFromStore() : null;
              const userMaskData = window.getUserMaskDataFromStore ? window.getUserMaskDataFromStore() : null;
              const maskShape = window.getMaskShapeFromStore ? window.getMaskShapeFromStore() : null;
              const segmentationUrl = window.getApiUrlFromStore ? window.getApiUrlFromStore('segmentation') : null;
              const currentImageId = window.getCurrentImageIdFromStore ? window.getCurrentImageIdFromStore() : null;
              
              if (maskData && userMaskData && maskShape && segmentationUrl && currentImageId) {
                  const m_length = maskShape[0] * maskShape[1];
                  const data = new Uint8Array(2 * m_length + 2);
                  data.set(new Uint8Array([254]));
                  data.set(maskData, 1);
                  data.set(userMaskData, m_length + 1);
                  data.set(new Uint8Array([254]), 2 * m_length + 1);
                  
                  const blob = new Blob([data], { type: 'application/octet-stream' });
                  navigator.sendBeacon(segmentationUrl + "save_mask/" + currentImageId, blob);
              }
          }
      }
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
        // Use React store instead of vars
        if (window.segmentationStore) {
            window.segmentationStore.getState().toggleMask();
        } else {
            console.warn('Space key pressed but React store not available');
        }
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
        // PRIMARY: Use React store for filter operations (ONE-WAY SYNC)
        if (window.viewManagerStore) {
            const currentFilters = window.viewManagerStore.getState().filters;
            window.viewManagerStore.getState().setFilters({ contrast: !currentFilters.contrast });
        } else {
            // React store is required - no fallback
            console.error('[IRIS Migration] ❌ CRITICAL: React store not available for contrast filter');
            throw new Error('React store not available for filter operations');
        }
    } else if (key == "KeyI"){
        // PRIMARY: Use React store for filter operations (ONE-WAY SYNC)
        if (window.viewManagerStore) {
            const currentFilters = window.viewManagerStore.getState().filters;
            window.viewManagerStore.getState().setFilters({ invert: !currentFilters.invert });
        } else {
            // React store is required - no fallback
            console.error('[IRIS Migration] ❌ CRITICAL: React store not available for invert filter');
            throw new Error('React store not available for filter operations');
        }
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
        const classCount = window.getClassCountFromStore ? window.getClassCountFromStore() : 0;
        if (class_id < classCount){
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
        if (window.viewManagerStore) {
            window.viewManagerStore.getState().toggleControls();
        }
    } else if (key == "KeyB"){
        if (window.viewManagerStore) {
            window.viewManagerStore.getState().showNextGroup();
        }
    } else if (event.shiftKey){
        // Update tool resizing mode through React store (primary source)
        if (window.segmentationStore) {
            window.segmentationStore.getState().setToolResizingMode(true);
        } // Store-based resizing mode management
    }
}

function key_up(event){
    // Update tool resizing mode through React store (primary source)
    if (window.segmentationStore) {
        window.segmentationStore.getState().setToolResizingMode(event.shiftKey);
    } // Store-based resizing mode management
}

function change_brightness(up){
    // Use React store if available (new source of truth)
    if (window.segmentationStore) {
        window.segmentationStore.getState().changeBrightness(up);
        return;
    }
    
    console.log('[IRIS] Using brightness fallback, store not available');
    
    const viewManager = window.getViewManagerFromStore ? window.getViewManagerFromStore() : (() => {
        console.error('[IRIS Migration] ❌ CRITICAL: getViewManagerFromStore not available for brightness');
        throw new Error('React store not available for ViewManager');
    })();
    
    // Safety check: only proceed if ViewManager is initialized
    if (!viewManager || !viewManager.filters) {
        console.log('[IRIS] ViewManager not initialized, skipping brightness change');
        return;
    }
    
    if (up){
        viewManager.filters.brightness += 10;
        viewManager.filters.brightness = Math.min(800, viewManager.filters.brightness);
    } else {
        viewManager.filters.brightness -= 10;
        viewManager.filters.brightness = Math.max(0, viewManager.filters.brightness);
    }
    viewManager.render();
}
function change_saturation(up){
    if (window.segmentationStore) {
        window.segmentationStore.getState().changeSaturation(up);
        return;
    }
    console.error('segmentationStore not available for change_saturation');
}

function set_current_class(class_id){
    if (window.segmentationStore) {
        window.segmentationStore.getState().setCurrentClass(class_id);
        return; // Store handles everything including DOM updates
    }
    
    // Store-based class management
    const classColor = window.getClassColorFromStore ? window.getClassColorFromStore(class_id) : [255, 255, 255, 255];
    var css_colour = rgba2css(classColor);
    const className = window.getClassNameFromStore ? window.getClassNameFromStore(class_id) : `Class ${class_id}`;
    get_object("tb_current_class").innerHTML = className;
    get_object("tb_select_class").style["background-color"] = css_colour;

    // Convenience - automatically change to drawing tool after selecting class:
    set_tool("draw");
}

function set_contrast(visible){
    // Use React store if available (new source of truth)
    if (window.segmentationStore) {
        window.segmentationStore.getState().setContrast(visible);
        return;
    }
        
    const viewManager = window.getViewManagerFromStore ? window.getViewManagerFromStore() : (() => {
        console.error('[IRIS Migration] ❌ CRITICAL: getViewManagerFromStore not available for contrast');
        throw new Error('React store not available for ViewManager');
    })();
    
    // Safety check: only proceed if ViewManager is initialized
    if (!viewManager || !viewManager.filters) {
        console.log('[IRIS] ViewManager not initialized, skipping contrast change');
        return;
    }
    
    viewManager.filters.contrast = visible;

    if (viewManager.filters.contrast){
        get_object("tb_toggle_contrast").classList.add("checked");
    } else {
        get_object("tb_toggle_contrast").classList.remove("checked");
    }

    viewManager.render();
}

function set_invert(visible){
    // Use React store if available (new source of truth)
    if (window.segmentationStore) {
        window.segmentationStore.getState().setInvert(visible);
        return;
    }
    
    const viewManager = window.getViewManagerFromStore ? window.getViewManagerFromStore() : (() => {
        console.error('[IRIS Migration] ❌ CRITICAL: getViewManagerFromStore not available for invert');
        throw new Error('React store not available for ViewManager');
    })();
    
    // Safety check: only proceed if ViewManager is initialized
    if (!viewManager || !viewManager.filters) {
        console.log('[IRIS] ViewManager not initialized, skipping invert change');
        return;
    }
    
    viewManager.filters.invert = visible;

    if (viewManager.filters.invert){
        get_object("tb_toggle_invert").classList.add("checked");
    } else {
        get_object("tb_toggle_invert").classList.remove("checked");
    }

    viewManager.render();
}

function set_tool(tool){
    // Update through React store (ONLY source)
    if (!window.setCurrentToolInStore) {
        console.error('[IRIS] ❌ Tool store not available');
        return;
    }
    
    window.setCurrentToolInStore(tool);
    // Store handles everything including DOM updates
}

function get_tool_offset(){
    /*Since we have draw with a tool, this returns the offset of the tool sprite*/
    // Get tool size from React store (ONLY source)
    const toolSize = window.getToolSizeFromStore ? window.getToolSizeFromStore() : 1;
    
    if (!window.getToolSizeFromStore) {
        console.error('[IRIS] ❌ Tool size not available from store');
    }
    
    if (toolSize == 1){
        return {'x': 0, 'y': 0}
    }

    return {
        'x': round_number(-toolSize/2),
        'y': round_number(-toolSize/2),
    };
}

function mouse_wheel(event){
    var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
    
    // Get resizing mode from React store (ONLY source)
    const resizingMode = window.getToolResizingModeFromStore ? window.getToolResizingModeFromStore() : false;
    
    if (!window.getToolResizingModeFromStore) {
        console.error('[IRIS] ❌ Tool resizing mode not available from store');
    }
    
    if (resizingMode){
        // Change size of tool using React store (ONLY source)
        const currentSize = window.getToolSizeFromStore ? window.getToolSizeFromStore() : 1;
        
        if (!window.getToolSizeFromStore) {
            console.error('[IRIS] ❌ Tool size not available from store');
            return;
        }
        
        let newSize = currentSize + delta * 0.5 * currentSize;
        const maskShape = window.getMaskShapeFromStore();
        if (maskShape) {
            newSize = round_number(Math.max(
                1, Math.min(
                    newSize, Math.max(...maskShape)
                )
            ));
        } else {
            console.warn('[IRIS] No mask shape available, using fallback bounds');
            newSize = round_number(Math.max(1, Math.min(newSize, 100)));
        }
        
        // Update through React store (ONLY source)
        if (!window.segmentationStore) {
            console.error('[IRIS] ❌ Segmentation store not available');
            return;
        }
        
        window.segmentationStore.getState().setToolSize(newSize);
        render_preview();
    } else {
        zoom(delta);
    }
}

function mouse_move(event){
    update_cursor_coords(this, event);
    
    // Get current tool from React store (ONLY source)
    const currentTool = window.getCurrentToolFromStore ? window.getCurrentToolFromStore() : 'draw';
    
    if (!window.getCurrentToolFromStore) {
        console.error('[IRIS] ❌ Current tool not available from store');
    }
    
    if (
        (event.buttons == 2
        || event.buttons == 4
        || (event.buttons == 1 && currentTool == 'move'))
    ){
        // Get drag start from React store (ONLY source)
        const dragStart = window.getDragStartFromStore ? 
            window.getDragStartFromStore() : null;
        
        if (!window.getDragStartFromStore) {
            console.error('[IRIS] ❌ Drag start not available from store');
        }
        
        if (dragStart !== null) {
            // Get cursor image from React store (ONLY source)
            const cursorImage = window.getCursorImageFromStore ? 
                window.getCursorImageFromStore() : [0, 0];
            
            if (!window.getCursorImageFromStore) {
                console.error('[IRIS] ❌ Cursor image not available from store');
            }
            
            move(
                cursorImage[0]-dragStart[0],
                cursorImage[1]-dragStart[1]
            );
        }
    }

    // mouse left button must be pressed to draw
    if (event.buttons == 1 && currentTool != 'move'){
        user_draws_on_mask();
    }

    // Show a preview of the pencil:
    render_preview();
}

function mouse_down(event){
    update_cursor_coords(this, event);

    // Get current tool from React store (ONLY source)
    const currentTool = window.getCurrentToolFromStore ? window.getCurrentToolFromStore() : 'draw';
    
    if (!window.getCurrentToolFromStore) {
        console.error('[IRIS] ❌ Current tool not available from store');
    }

    if (event.buttons == 1 && currentTool != 'move'){
        user_draws_on_mask();
        
        // Clear drag start using React store (ONLY source)
        if (!window.setDragStartInStore) {
            console.error('[IRIS] ❌ Drag start store not available');
            return;
        }
        
        window.setDragStartInStore(null);
    } else if (
        event.buttons == 2
        || event.buttons == 4
        || (event.buttons == 1 && currentTool == 'move')
    ){
        // Get cursor image from React store (ONLY source)
        const cursorImage = window.getCursorImageFromStore ? 
            window.getCursorImageFromStore() : [0, 0];
        
        if (!window.getCursorImageFromStore) {
            console.error('[IRIS] ❌ Cursor image not available from store');
        }
        
        // Set drag start using React store (ONLY source)
        if (!window.setDragStartInStore) {
            console.error('[IRIS] ❌ Drag start store not available');
            return;
        }
        
        window.setDragStartInStore([...cursorImage]);
    }
}

function mouse_up(event){
    // Clear drag start using React store (ONLY source)
    if (!window.setDragStartInStore) {
        console.error('[IRIS] ❌ Drag start store not available');
        return;
    }
    
    window.setDragStartInStore(null);
    
    // Save history after drawing stroke completes (groups entire stroke into one undo/redo entry)
    // This is called here instead of in user_draws_on_mask() to avoid saving history for every pixel
    update_history();
}

function mouse_enter(event){
    update_cursor_coords(this, event);
    
    // Get current tool from React store (ONLY source)
    const currentTool = window.getCurrentToolFromStore ? window.getCurrentToolFromStore() : 'draw';
    
    if (!window.getCurrentToolFromStore) {
        console.error('[IRIS] ❌ Current tool not available from store');
    }
    
    if (
        event.buttons == 2
        || event.buttons == 4
        || (event.buttons == 1 && currentTool == 'move')
    ){
        // Get cursor image from React store (ONLY source)
        const cursorImage = window.getCursorImageFromStore ? 
            window.getCursorImageFromStore() : [0, 0];
        
        if (!window.getCursorImageFromStore) {
            console.error('[IRIS] ❌ Cursor image not available from store');
        }
        
        // Set drag start using React store (ONLY source)
        if (!window.setDragStartInStore) {
            console.error('[IRIS] ❌ Drag start store not available');
            return;
        }
        
        window.setDragStartInStore([...cursorImage]);
    }
}

function zoom(delta){
    // PRIMARY: Use React store (ONE-WAY SYNC)
    if (window.zoomCanvasFromStore) {
        window.zoomCanvasFromStore(delta);
        return;
    }
    
    let factor = Math.pow(1.1, delta);
    // Get cursor image from React store (ONLY source)
    const cursorImage = window.getCursorImageFromStore ? 
        window.getCursorImageFromStore() : [0, 0];
    
    if (!window.getCursorImageFromStore) {
        console.error('[IRIS] ❌ Cursor image not available from store for zoom fallback');
    }

    for (let canvas of document.getElementsByClassName('view-canvas')){
        let ctx = canvas.getContext('2d');
        ctx.translate(...cursorImage);
        ctx.scale(factor, factor);
        ctx.translate(-cursorImage[0], -cursorImage[1]);
        constrain_view(ctx, factor, 0, 0);
    }
    update_views();
}

function move(dx, dy){
    if (window.moveCanvasFromStore) {
        window.moveCanvasFromStore(dx, dy);
        return;
    }
}

function constrain_view(ctx, scale, dx, dy){
    let transforms = ctx.getTransform();

    // Get image shape from React store (ONLY source)
    const imageShape = window.getImageShapeFromStore();
    
    if (!imageShape) {
        console.error('[IRIS] ❌ No image shape available for constrain_view');
        return;
    }

    if (transforms.a*scale < ctx.canvas.width / imageShape[0]){
        // We don't want to allow any zooming outside of the image area and reset
        // it to the default view

        transforms.a = ctx.canvas.width / imageShape[0];
        transforms.d = ctx.canvas.height / imageShape[1];
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

    let bottom_right = ctx.getCanvasCoords(...imageShape);
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

    // PRIMARY: Use React store (ONE-WAY SYNC)
    if (window.updateViewsFromStore) {
        window.updateViewsFromStore();
        return;
    }

    // React store is required - no fallback
    console.error('[IRIS Migration] ❌ CRITICAL: React store not available for render');
    throw new Error('React store not available for ViewManager');
}

function reset_views(){
    // PRIMARY: Use React store (ONE-WAY SYNC)
    if (window.resetCanvasFromStore) {
        window.resetCanvasFromStore();
        return;
    }

    console.log('[IRIS] Using reset_views fallback (React canvas transformations not yet implemented)');
    
    // Get image shape from React store (ONLY source)
    const imageShape = window.getImageShapeFromStore();
    
    if (!imageShape) {
        console.error('[IRIS] ❌ No image shape available for reset_views');
        return;
    }
    
    for (let canvas of document.getElementsByClassName('view-canvas')){
        let ctx = canvas.getContext('2d');
        ctx.setTransform(
            ctx.canvas.width / imageShape[0], 0, 0,
            ctx.canvas.width / imageShape[0], 0, 0
        );
    }
    update_views();
    
    // Also update React store for consistency
    if (window.reactViewManager && window.reactViewManager.resetView) {
        window.reactViewManager.resetView();
    }
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

    // Update canvas coordinates through React store (ONLY source)
    if (!window.setCanvasMousePositionInStore) {
        console.error('[IRIS] ❌ Canvas mouse position store not available');
        return;
    }
    
    window.setCanvasMousePositionInStore(x, y);

    let canvas = document.getElementsByClassName('view-canvas')[0];
    let image_coords = canvas.getContext("2d").getWorldCoords(x, y);
    let newCursorImage = [
        round_number(image_coords.x), round_number(image_coords.y)
    ];
    
    // Update through React store (ONLY source)
    if (!window.setCursorImageInStore) {
        console.error('[IRIS] ❌ Cursor image store not available');
        return;
    }
    
    window.setCursorImageInStore(newCursorImage[0], newCursorImage[1]);
}

function update_drawn_pixels(){
    // Use React store (ONLY SOURCE)
    if (!window.updateUserPixelCountsInStore) {
        console.error('[IRIS Migration] ❌ CRITICAL: React store not available for pixel counting');
        throw new Error('React store required for pixel counting');
    }
    
    // Let React store calculate and update pixel counts
    const pixelCounts = window.updateUserPixelCountsInStore();
}

function discard_future(){
    // Use React store (ONLY SOURCE)
    if (!window.discardFutureInStore) {
        console.error('[IRIS Migration] ❌ CRITICAL: React store not available for discard future');
        throw new Error('React store required for history operations');
    }
    
    window.discardFutureInStore();
}

function update_history(){
    // Use React store (ONLY SOURCE)
    if (!window.updateHistoryInStore) {
        console.error('[IRIS Migration] ❌ CRITICAL: React store not available for history update');
        throw new Error('React store required for history operations');
    }
    
    window.updateHistoryInStore();
}

// CRITICAL: Render the entire mask to the hidden canvas
// This is needed after loading a mask from the server
function render_mask_to_hidden_canvas() {
    console.log('[IRIS] Rendering loaded mask to hidden canvas...');
    
    // Get hidden mask canvas from store (ONLY SOURCE)
    if (!window.getHiddenMaskContextFromStore) {
        console.error('[IRIS] ❌ CRITICAL: getHiddenMaskContextFromStore not available');
        throw new Error('React store required for hidden mask context');
    }
    
    const hidden_ctx = window.getHiddenMaskContextFromStore();
    if (!hidden_ctx) {
        console.error('[IRIS] Hidden mask context not available for rendering');
        throw new Error('Hidden mask context not available');
    }
    
    // Get mask shape from store (ONLY SOURCE)
    if (!window.getMaskShapeFromStore) {
        console.error('[IRIS] ❌ CRITICAL: getMaskShapeFromStore not available');
        throw new Error('React store required for mask shape');
    }
    
    const maskShape = window.getMaskShapeFromStore();
    if (!maskShape) {
        console.error('[IRIS] No mask shape available for rendering');
        throw new Error('Mask shape not available');
    }
    
    // Get mask data from store (ONLY SOURCE)
    if (!window.getMaskDataFromStore || !window.getUserMaskDataFromStore) {
        console.error('[IRIS] ❌ CRITICAL: Mask data accessors not available');
        throw new Error('React store required for mask data');
    }
    
    const maskData = window.getMaskDataFromStore();
    const userMaskData = window.getUserMaskDataFromStore();
    
    if (!maskData || !userMaskData) {
        console.error('[IRIS] No mask data available for rendering');
        throw new Error('Mask data not available');
    }
    
    // Get classes for colors from store (ONLY SOURCE)
    if (!window.getClassesFromStore) {
        console.error('[IRIS] ❌ CRITICAL: getClassesFromStore not available');
        throw new Error('React store required for classes');
    }
    
    const classes = window.getClassesFromStore();
    if (!classes) {
        console.error('[IRIS] No classes available for rendering');
        throw new Error('Classes not available');
    }
    
    // Clear the hidden canvas first
    hidden_ctx.clearRect(0, 0, maskShape[0], maskShape[1]);
    
    // Render each pixel that has been drawn by the user
    let pixelsRendered = 0;
    for (let y = 0; y < maskShape[1]; y++) {
        for (let x = 0; x < maskShape[0]; x++) {
            const index = y * maskShape[0] + x;
            
            // Only render pixels that the user has drawn (userMaskData[index] === 1)
            if (userMaskData[index] === 1) {
                const classId = maskData[index];
                
                // Get the color for this class
                if (classId >= 0 && classId < classes.length) {
                    const color = classes[classId].colour;
                    hidden_ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;
                    hidden_ctx.fillRect(x, y, 1, 1);
                    pixelsRendered++;
                }
            }
        }
    }
    
    console.log(`[IRIS] ✅ Mask rendered to hidden canvas: ${pixelsRendered} pixels`);
}

function undo(){
    console.log('[IRIS] 🔙 Undo called');
    
    // Use React store as ONLY source
    if (!window.undoInStore) {
        console.error('[IRIS] ❌ Store not available for undo');
        throw new Error('React store required for undo operation');
    }
    
    // Check if undo is possible
    if (window.canUndoFromStore && !window.canUndoFromStore()) {
        console.log('[IRIS] ⚠️ Cannot undo - no history available');
        return;
    }
    
    // Log current state before undo
    const maskDataBefore = window.getMaskDataFromStore ? window.getMaskDataFromStore() : null;
    const historyInfo = window.segmentationStore ? window.segmentationStore.getState() : null;
    console.log('[IRIS] 🔙 Before undo:', {
        historyLength: historyInfo?.maskHistory?.length,
        currentEpoch: historyInfo?.historyCurrentEpoch,
        maskDataLength: maskDataBefore?.length,
        firstFewPixels: maskDataBefore ? Array.from(maskDataBefore.slice(0, 20)) : null
    });
    
    console.log('[IRIS] 🔙 Calling undoInStore...');
    
    // Call store undo
    window.undoInStore();
    
    // Log state after undo
    const maskDataAfter = window.getMaskDataFromStore ? window.getMaskDataFromStore() : null;
    const historyInfoAfter = window.segmentationStore ? window.segmentationStore.getState() : null;
    console.log('[IRIS] 🔙 After undo:', {
        historyLength: historyInfoAfter?.maskHistory?.length,
        currentEpoch: historyInfoAfter?.historyCurrentEpoch,
        maskDataLength: maskDataAfter?.length,
        firstFewPixels: maskDataAfter ? Array.from(maskDataAfter.slice(0, 20)) : null,
        maskChanged: maskDataBefore && maskDataAfter ? (maskDataBefore[0] !== maskDataAfter[0]) : 'unknown'
    });
    
    console.log('[IRIS] 🔙 Store undo completed, scheduling render...');
    
    // CRITICAL: Use setTimeout to ensure store update completes before rendering
    // Zustand updates are synchronous, but we need to ensure the mask data is accessible
    setTimeout(() => {
        console.log('[IRIS] 🔙 Rendering after undo...');
        
        // Trigger legacy rendering functions with updated mask from store
        update_drawn_pixels();
        reload_hidden_mask();
        render_mask();
        
        console.log('[IRIS] ✅ Undo render complete');
    }, 0);

    // Notify React store that mask has changed
    if (!window.segmentationStore) {
        console.error('[IRIS] ❌ Segmentation store not available for undo');
        return;
    }
    
    const store = window.segmentationStore.getState();
    store.setMaskChanged(true);
    store.setShowDialogueBeforeNextImage(true);
}

function redo(){
    console.log('[IRIS] 🔜 Redo called');
    
    // Use React store as ONLY source
    if (!window.redoInStore) {
        console.error('[IRIS] ❌ Store not available for redo');
        throw new Error('React store required for redo operation');
    }
    
    // Check if redo is possible
    if (window.canRedoFromStore && !window.canRedoFromStore()) {
        console.log('[IRIS] ⚠️ Cannot redo - no future history available');
        return;
    }
    
    console.log('[IRIS] 🔜 Calling redoInStore...');
    
    // Call store redo
    window.redoInStore();
    
    console.log('[IRIS] 🔜 Store redo completed, scheduling render...');
    
    // CRITICAL: Use setTimeout to ensure store update completes before rendering
    // Zustand updates are synchronous, but we need to ensure the mask data is accessible
    setTimeout(() => {
        console.log('[IRIS] 🔜 Rendering after redo...');
        
        // Trigger legacy rendering functions with updated mask from store
        update_drawn_pixels();
        reload_hidden_mask();
        render_mask();
        
        console.log('[IRIS] ✅ Redo render complete');
    }, 0);

    // Notify React store that mask has changed
    if (!window.segmentationStore) {
        console.error('[IRIS] ❌ Segmentation store not available for redo');
        return;
    }
    
    const store = window.segmentationStore.getState();
    store.setMaskChanged(true);
    store.setShowDialogueBeforeNextImage(true);
}

// CRITICAL: Helper function for efficient mask pixel updates during drawing
function updateMaskPixels(updates) {
    /*
    Updates mask pixels efficiently using React store (ONLY SOURCE)
    
    Args:
        updates: Array of {x, y, maskValue, userMaskValue} objects
    */
    if (!updates || updates.length === 0) return;
    
    // Get mask shape from store
    const maskShape = window.getMaskShapeFromStore();
    
    if (!window.getMaskDataFromStore || !window.getUserMaskDataFromStore || 
        !window.setMaskDataInStore || !window.setUserMaskDataInStore) {
        console.error('[IRIS Migration] ❌ CRITICAL: React store not available for mask updates');
        throw new Error('React store required for mask operations');
    }
    
    const maskData = window.getMaskDataFromStore();
    const userMaskData = window.getUserMaskDataFromStore();
    
    if (!maskData || !userMaskData || !maskShape) {
        console.error('[IRIS Migration] ❌ Mask data not available from store');
        throw new Error('Mask data not available');
    }
    
    // Create copies for batch update
    const newMaskData = new Uint8Array(maskData);
    const newUserMaskData = new Uint8Array(userMaskData);
    
    // Apply all updates
    updates.forEach(({x, y, maskValue, userMaskValue}) => {
        if (x >= 0 && x < maskShape[0] && y >= 0 && y < maskShape[1]) {
            const index = y * maskShape[0] + x;
            if (maskValue !== undefined) {
                newMaskData[index] = maskValue;
            }
            if (userMaskValue !== undefined) {
                newUserMaskData[index] = userMaskValue;
            }
        }
    });
    
    // Update store with new data (ONLY SOURCE)
    window.setMaskDataInStore(newMaskData, maskShape[0], maskShape[1]);
    window.setUserMaskDataInStore(newUserMaskData);
}

function user_draws_on_mask(){
    /*The user draws to the mask

    Returns:
        * list([x0, y0, xn, yn]) - bounding_box in canvas coordinates

    */

    // Just get one canvas
    let canvas = document.getElementsByClassName("view-canvas")[0];
    let ctx = canvas.getContext('2d');

    // Get image shape from React store (ONLY source)
    const imageShape = window.getImageShapeFromStore();
    
    if (!imageShape) {
        console.error('[IRIS] ❌ No image shape available for user_draws_on_mask');
        return;
    }

    // Get the area we finally have to render (update) in canvas coordinates.
    // This increases the performances:
    let drawing_area = {
        'min_x': imageShape[0],
        'min_y': imageShape[1],
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
    // Get tool size from React store (ONLY source)
    const toolSize = window.getToolSizeFromStore ? window.getToolSizeFromStore() : 1;
    
    if (!window.getToolSizeFromStore) {
        console.error('[IRIS] ❌ Tool size not available from store');
        return;
    }
    
    // Get cursor image from React store (ONLY source)
    const cursorImage = window.getCursorImageFromStore ? window.getCursorImageFromStore() : [0, 0];
    
    if (!window.getCursorImageFromStore) {
        console.error('[IRIS] ❌ Cursor image not available from store');
        return;
    }
    
    let x_start = cursorImage[0] + offset.x,
        x_end = x_start + toolSize;
    let y_start = cursorImage[1] + offset.y,
        y_end = y_start + toolSize;

    // For round brushes, we need to ensure the bounding box encompasses the full circle
    // The current bounding box is based on the square tool size, which should work for circles too
    // since the circle fits within the square, but let's make sure the center calculation is correct

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
    const maskArea = window.getMaskAreaFromStore ? window.getMaskAreaFromStore() : null;
    
    if (!maskArea) {
        console.error('[IRIS] ❌ Mask area not available for coordinate transformation');
        return;
    }
    
    x_start -= maskArea[0];
    x_end -= maskArea[0];
    y_start -= maskArea[1];
    y_end -= maskArea[1];

    // Get mask shape from store for bounds checking
    const maskShape = window.getMaskShapeFromStore();
    if (!maskShape) {
        console.error('[IRIS Migration] ❌ No mask shape available for drawing bounds check');
        return;
    }

    // Make sure we do not draw outside of the masking area:
    x_start = Math.max(0, x_start);
    x_end = Math.min(maskShape[0]-1, x_end);
    y_start = Math.max(0, y_start);
    y_end = Math.min(maskShape[1]-1, y_end);

    // Get current tool from React store (ONLY source)
    const currentTool = window.getCurrentToolFromStore ? window.getCurrentToolFromStore() : 'draw';
    
    if (!window.getCurrentToolFromStore) {
        console.error('[IRIS] ❌ Current tool not available from store');
        return;
    }

    // Get tool shape from React store (ONLY source)
    const toolShape = window.getToolShapeFromStore ? window.getToolShapeFromStore() : 'square';
    
    if (!window.getToolShapeFromStore) {
        console.error('[IRIS] ❌ Tool shape not available from store');
    }

    // Draw pixels based on tool shape
    if (toolShape === 'round') {
        // Special case: 1-pixel brush - square and round are identical
        if (toolSize === 1) {
            // Use simple single-pixel logic for both square and round
            const x = x_start;
            const y = y_start;
            const pixelUpdates = [];
            
            if (currentTool == "eraser"){
                pixelUpdates.push({x, y, maskValue: 0, userMaskValue: 0});
            } else {
                // Get current class from React store (ONLY source)
                if (!window.getCurrentClassFromStore) {
                    console.error('[IRIS] ❌ Store not available for current class in drawing');
                    throw new Error('React store required for current class');
                }
                const currentClass = window.getCurrentClassFromStore();
                pixelUpdates.push({x, y, maskValue: currentClass, userMaskValue: 1});
            }
            
            // Apply batch update
            updateMaskPixels(pixelUpdates);
        }
        // Special case: 3-pixel brush - use cross pattern (center + 4 adjacent pixels)
        else if (toolSize === 3) {
            // Cross pattern: center pixel + 4 adjacent pixels (no corners)
            const centerX = Math.floor((x_start + x_end) / 2);
            const centerY = Math.floor((y_start + y_end) / 2);
            
            // Define cross pattern relative to center
            const crossPattern = [
                {dx: 0, dy: 0},   // center
                {dx: -1, dy: 0},  // left
                {dx: 1, dy: 0},   // right
                {dx: 0, dy: -1},  // top
                {dx: 0, dy: 1}    // bottom
            ];
            
            // Collect pixel updates for batch processing
            const pixelUpdates = [];
            for (const {dx, dy} of crossPattern) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                // Check bounds
                if (x >= x_start && x < x_end && y >= y_start && y < y_end) {
                    if (currentTool == "eraser"){
                        pixelUpdates.push({x, y, maskValue: 0, userMaskValue: 0});
                    } else {
                        // Get current class from React store (ONLY source)
                        if (!window.getCurrentClassFromStore) {
                            console.error('[IRIS] ❌ Store not available for current class in cross pattern drawing');
                            throw new Error('React store required for current class');
                        }
                        const currentClass = window.getCurrentClassFromStore();
                        pixelUpdates.push({x, y, maskValue: currentClass, userMaskValue: 1});
                    }
                }
            }
            
            // Apply batch update
            updateMaskPixels(pixelUpdates);
        }
        // Special case: 5-pixel brush - use diamond pattern (center + cross + diagonals at distance 1)
        else if (toolSize === 5) {
            // Diamond pattern: center + 4 adjacent + 4 diagonal neighbors
            const centerX = Math.floor((x_start + x_end) / 2);
            const centerY = Math.floor((y_start + y_end) / 2);
            
            // Define diamond pattern relative to center
            const diamondPattern = [
                {dx: 0, dy: 0},   // center
                // Cross (distance 1)
                {dx: -1, dy: 0},  // left
                {dx: 1, dy: 0},   // right
                {dx: 0, dy: -1},  // top
                {dx: 0, dy: 1},   // bottom
                // Diagonals (distance 1)
                {dx: -1, dy: -1}, // top-left
                {dx: 1, dy: -1},  // top-right
                {dx: -1, dy: 1},  // bottom-left
                {dx: 1, dy: 1},   // bottom-right
                // Extended cross (distance 2)
                {dx: -2, dy: 0},  // far left
                {dx: 2, dy: 0},   // far right
                {dx: 0, dy: -2},  // far top
                {dx: 0, dy: 2}    // far bottom
            ];
            
            for (const {dx, dy} of diamondPattern) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                // Check bounds
                if (x >= x_start && x < x_end && y >= y_start && y < y_end) {
                    // Use React store (ONLY SOURCE)
                    if (!window.setMaskPixelInStore || !window.setUserMaskPixelInStore) {
                        console.error('[IRIS Migration] ❌ CRITICAL: React store not available for diamond pattern drawing');
                        throw new Error('React store required for mask operations');
                    }
                    
                    if (currentTool == "eraser"){
                        window.setMaskPixelInStore(x, y, 0);
                        window.setUserMaskPixelInStore(x, y, 0);
                    } else {
                        const currentClass = window.getCurrentClassFromStore ? window.getCurrentClassFromStore() : (() => {
                            console.error('[IRIS Migration] ❌ CRITICAL: getCurrentClassFromStore not available');
                            throw new Error('React store required for current class');
                        })();
                        window.setMaskPixelInStore(x, y, currentClass);
                        window.setUserMaskPixelInStore(x, y, 1);
                    }
                }
            }
        }
        // Regular round brush: use circular drawing logic for sizes > 5
        else {
            // Calculate the center of the brush in image coordinates (before mask transformation)
            const brushCenterX = cursorImage[0] + offset.x + toolSize / 2;
            const brushCenterY = cursorImage[1] + offset.y + toolSize / 2;
            const radius = toolSize / 2;
            
            // Iterate through bounding box and check if each pixel is within the circle
            const pixelUpdates = [];
            for (let x = x_start; x < x_end; x++) {
                for (let y = y_start; y < y_end; y++) {
                    // Convert mask coordinates back to image coordinates for distance calculation
                    const maskArea = window.getMaskAreaFromStore ? window.getMaskAreaFromStore() : null;
                    
                    if (!maskArea) {
                        console.error('[IRIS] ❌ Mask area not available for distance calculation');
                        continue;
                    }
                    
                    const imageX = x + maskArea[0];
                    const imageY = y + maskArea[1];
                    
                    // Calculate distance from brush center
                    const dx = imageX - brushCenterX;
                    const dy = imageY - brushCenterY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Only draw if pixel is within the circle
                    if (distance <= radius) {
                        if (currentTool == "eraser"){
                            pixelUpdates.push({x, y, maskValue: 0, userMaskValue: 0});
                        } else {
                            // Get current class from React store (ONLY source)
                            if (!window.getCurrentClassFromStore) {
                                console.error('[IRIS] ❌ Store not available for current class in circle drawing');
                                throw new Error('React store required for current class');
                            }
                            const currentClass = window.getCurrentClassFromStore();
                            pixelUpdates.push({x, y, maskValue: currentClass, userMaskValue: 1});
                        }
                    }
                }
            }
            
            // Apply batch update
            updateMaskPixels(pixelUpdates);
        }
    } else {
        // Square brush: use original rectangular drawing logic
        const pixelUpdates = [];
        for (let x = x_start; x < x_end; x++) {
            for (let y = y_start; y < y_end; y++) {
                if (currentTool == "eraser"){
                    pixelUpdates.push({x, y, maskValue: 0, userMaskValue: 0});
                } else {
                    // Get current class from React store (ONLY source)
                    if (!window.getCurrentClassFromStore) {
                        console.error('[IRIS] ❌ Store not available for current class in single pixel drawing');
                        throw new Error('React store required for current class');
                    }
                    const currentClass = window.getCurrentClassFromStore();
                    pixelUpdates.push({x, y, maskValue: currentClass, userMaskValue: 1});
                }
            }
        }
        
        // Apply batch update
        updateMaskPixels(pixelUpdates);
    }
    drawing_area = [x_start, y_start, x_end-x_start, y_end-y_start];

    // Now we draw on the hidden mask and render it
    // Get mask type from React store (ONLY source)
    if (!window.getMaskTypeFromStore) {
        console.error('[IRIS] ❌ CRITICAL: Store not available for mask type');
        throw new Error('React store required for mask type');
    }
    const maskType = window.getMaskTypeFromStore();
    
    if (maskType == 'final' || maskType == 'user'){
        // Get hidden mask context from React store (ONLY source)
        if (!window.getHiddenMaskContextFromStore) {
            console.error('[IRIS] ❌ CRITICAL: Store not available for hidden mask context');
            throw new Error('React store required for hidden mask');
        }
        
        const hidden_ctx = window.getHiddenMaskContextFromStore();
        if (!hidden_ctx) {
            console.error('[IRIS] ❌ Hidden mask context not available from store');
            throw new Error('Hidden mask context not available');
        }
        
        if (toolShape === 'round') {
            // Special case: 1-pixel brush - square and round are identical
            if (toolSize === 1) {
                const x = x_start;
                const y = y_start;
                
                // Get current class from React store (ONLY source)
                if (!window.getCurrentClassFromStore) {
                    console.error('[IRIS] ❌ Store not available for current class in 1-pixel canvas drawing');
                    throw new Error('React store required for current class');
                }
                const currentClass = window.getCurrentClassFromStore();
                
                if (currentTool == "eraser" || currentClass == 0){
                    hidden_ctx.clearRect(x, y, 1, 1);
                } else {
                    // First clear to prevent double-application, then fill
                    hidden_ctx.clearRect(x, y, 1, 1);
                    hidden_ctx.fillStyle = rgba2css(get_current_class_colour());
                    hidden_ctx.fillRect(x, y, 1, 1);
                }
            }
            // Special case: 3-pixel brush - use cross pattern
            else if (toolSize === 3) {
                const centerX = Math.floor((x_start + x_end) / 2);
                const centerY = Math.floor((y_start + y_end) / 2);
                
                // Define cross pattern relative to center
                const crossPattern = [
                    {dx: 0, dy: 0},   // center
                    {dx: -1, dy: 0},  // left
                    {dx: 1, dy: 0},   // right
                    {dx: 0, dy: -1},  // top
                    {dx: 0, dy: 1}    // bottom
                ];
                
                for (const {dx, dy} of crossPattern) {
                    const x = centerX + dx;
                    const y = centerY + dy;
                    
                    // Get current class from React store (ONLY source)
                    if (!window.getCurrentClassFromStore) {
                        console.error('[IRIS] ❌ Store not available for current class in 3-pixel cross canvas drawing');
                        throw new Error('React store required for current class');
                    }
                    const currentClass = window.getCurrentClassFromStore();
                    
                    // Check bounds
                    if (x >= x_start && x < x_end && y >= y_start && y < y_end) {
                        if (currentTool == "eraser" || currentClass == 0){
                            hidden_ctx.clearRect(x, y, 1, 1);
                        } else {
                            // First clear to prevent double-application, then fill
                            hidden_ctx.clearRect(x, y, 1, 1);
                            hidden_ctx.fillStyle = rgba2css(get_current_class_colour());
                            hidden_ctx.fillRect(x, y, 1, 1);
                        }
                    }
                }
            }
            // Special case: 5-pixel brush - use diamond pattern
            else if (toolSize === 5) {
                const centerX = Math.floor((x_start + x_end) / 2);
                const centerY = Math.floor((y_start + y_end) / 2);
                
                // Define diamond pattern relative to center
                const diamondPattern = [
                    {dx: 0, dy: 0},   // center
                    // Cross (distance 1)
                    {dx: -1, dy: 0},  // left
                    {dx: 1, dy: 0},   // right
                    {dx: 0, dy: -1},  // top
                    {dx: 0, dy: 1},   // bottom
                    // Diagonals (distance 1)
                    {dx: -1, dy: -1}, // top-left
                    {dx: 1, dy: -1},  // top-right
                    {dx: -1, dy: 1},  // bottom-left
                    {dx: 1, dy: 1},   // bottom-right
                    // Extended cross (distance 2)
                    {dx: -2, dy: 0},  // far left
                    {dx: 2, dy: 0},   // far right
                    {dx: 0, dy: -2},  // far top
                    {dx: 0, dy: 2}    // far bottom
                ];
                
                for (const {dx, dy} of diamondPattern) {
                    const x = centerX + dx;
                    const y = centerY + dy;
                    
                    // Get current class from React store (ONLY source)
                    if (!window.getCurrentClassFromStore) {
                        console.error('[IRIS] ❌ Store not available for current class in 5-pixel diamond canvas drawing');
                        throw new Error('React store required for current class');
                    }
                    const currentClass = window.getCurrentClassFromStore();
                    
                    // Check bounds
                    if (x >= x_start && x < x_end && y >= y_start && y < y_end) {
                        if (currentTool == "eraser" || currentClass == 0){
                            hidden_ctx.clearRect(x, y, 1, 1);
                        } else {
                            // First clear to prevent double-application, then fill
                            hidden_ctx.clearRect(x, y, 1, 1);
                            hidden_ctx.fillStyle = rgba2css(get_current_class_colour());
                            hidden_ctx.fillRect(x, y, 1, 1);
                        }
                    }
                }
            }
            // Regular round brush: use circular drawing logic for sizes > 5
            else {
                const brushCenterX = cursorImage[0] + offset.x + toolSize / 2;
                const brushCenterY = cursorImage[1] + offset.y + toolSize / 2;
                const radius = toolSize / 2;
                
                if (currentTool == "eraser"){
                    // For eraser, we need to clear pixels within the circle
                    for (let x = x_start; x < x_end; x++) {
                        for (let y = y_start; y < y_end; y++) {
                            // Convert mask coordinates back to image coordinates for distance calculation
                            const maskArea = window.getMaskAreaFromStore ? window.getMaskAreaFromStore() : null;
                            
                            if (!maskArea) {
                                console.error('[IRIS] ❌ Mask area not available for distance calculation');
                                continue;
                            }
                            
                            const imageX = x + maskArea[0];
                            const imageY = y + maskArea[1];
                            
                            // Calculate distance from brush center
                            const dx = imageX - brushCenterX;
                            const dy = imageY - brushCenterY;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            // Only clear if pixel is within the circle
                            if (distance <= radius) {
                                hidden_ctx.clearRect(x, y, 1, 1);
                            }
                        }
                    }
                } else {
                    // For drawing, check if we're drawing "clear" class (0) or a real class
                    // Get current class from React store (ONLY source)
                    if (!window.getCurrentClassFromStore) {
                        console.error('[IRIS] ❌ Store not available for current class in circular brush canvas drawing');
                        throw new Error('React store required for current class');
                    }
                    const currentClass = window.getCurrentClassFromStore();
                    
                    if (currentClass == 0) {
                        // Clear class: clear pixels within the circle
                        for (let x = x_start; x < x_end; x++) {
                            for (let y = y_start; y < y_end; y++) {
                                // Convert mask coordinates back to image coordinates for distance calculation
                                const maskArea = window.getMaskAreaFromStore ? window.getMaskAreaFromStore() : null;
                                
                                if (!maskArea) {
                                    console.error('[IRIS] ❌ Mask area not available for distance calculation');
                                    continue;
                                }
                                
                                const imageX = x + maskArea[0];
                                const imageY = y + maskArea[1];
                                
                                // Calculate distance from brush center
                                const dx = imageX - brushCenterX;
                                const dy = imageY - brushCenterY;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                
                                // Only clear if pixel is within the circle
                                if (distance <= radius) {
                                    hidden_ctx.clearRect(x, y, 1, 1);
                                }
                            }
                        }
                    } else {
                        // Real class: first clear the circular area, then fill with class color
                        // This prevents double-application and ensures consistent opacity
                        for (let x = x_start; x < x_end; x++) {
                            for (let y = y_start; y < y_end; y++) {
                                // Convert mask coordinates back to image coordinates for distance calculation
                                const imageX = x + maskArea[0];
                                const imageY = y + maskArea[1];
                                
                                // Calculate distance from brush center
                                const dx = imageX - brushCenterX;
                                const dy = imageY - brushCenterY;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                
                                // Only modify if pixel is within the circle
                                if (distance <= radius) {
                                    // First clear the pixel to prevent double-application
                                    hidden_ctx.clearRect(x, y, 1, 1);
                                    // Then fill with the class color
                                    hidden_ctx.fillStyle = rgba2css(get_current_class_colour());
                                    hidden_ctx.fillRect(x, y, 1, 1);
                                }
                            }
                        }
                    }
                }
            }
            
            render_mask(); // Full re-render for round brushes
        } else {
            // Square brush: use original rectangular drawing logic for partial updates
            hidden_ctx.clearRect(...drawing_area);

            if (currentTool != "eraser"){
                hidden_ctx.fillStyle = rgba2css(get_current_class_colour());
                hidden_ctx.fillRect(...drawing_area);
            }
            
            render_mask(drawing_area); // Optimized partial re-render for square brushes
        }
    }

    update_drawn_pixels();

    // Discard future history when drawing (undo-redo system)
    // Note: update_history() is called in mouse_up() to group entire strokes
    discard_future();

    // Set flag to show confirmation dialog before navigating away
    if (!window.segmentationStore) {
        console.error('[IRIS] ❌ Segmentation store not available for user_draws_on_mask');
        return;
    }
    
    const store = window.segmentationStore.getState();
    store.setShowDialogueBeforeNextImage(true);
    // IMPORTANT: Mark mask as changed so it gets saved properly
    store.setMaskChanged(true);
}

function reload_hidden_mask(){
    /*Update hidden mask on a offscreen canvas*/
    
    // Get hidden mask context from React store (ONLY source)
    if (!window.getHiddenMaskContextFromStore) {
        console.error('[IRIS] ❌ CRITICAL: Store not available for hidden mask context');
        throw new Error('React store required for hidden mask');
    }
    
    const ctx = window.getHiddenMaskContextFromStore();
    if (!ctx) {
        console.error('[IRIS] ❌ Hidden mask context not available from store');
        throw new Error('Hidden mask context not available');
    }
    
    // Safety check: ensure mask data is available from store
    const maskShape = window.getMaskShapeFromStore();
    const maskData = window.getMaskDataFromStore();
    if (!maskShape || !maskData) {
        console.error('[IRIS] ❌ Mask data not available for reload_hidden_mask');
        throw new Error('Mask data not available');
    }

    // Prepare the actual mask which will be drawn:
    let [mask, colours] = get_current_mask_and_colours();
    let sprite = ctx.createImageData(...maskShape);

    // We go through each pixel in the bounding box and redraw them:
    for (var y = 0; y < sprite.height; y++) {
        for (var x = 0; x < sprite.width; x++) {
            let offset = (y * sprite.width + x) * 4;
            let colour = colours[mask[y*maskShape[0]+x]];
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
    // Use React store as ONLY source
    if (!window.segmentationStore) {
        console.error('[IRIS] ❌ CRITICAL: Store not available for set_mask_type');
        throw new Error('React store required for mask type operations');
    }
    
    window.segmentationStore.getState().setMaskType(type);
    // Store handles everything including DOM updates
}

function get_current_class_colour(){
    // Get current class from React store (ONLY source)
    if (!window.getCurrentClassFromStore) {
        console.error('[IRIS] ❌ CRITICAL: Store not available for current class');
        throw new Error('React store required for current class');
    }
    const currentClass = window.getCurrentClassFromStore();
    
    // Get mask type from React store (ONLY source)
    if (!window.getMaskTypeFromStore) {
        console.error('[IRIS] ❌ CRITICAL: Store not available for mask type');
        throw new Error('React store required for mask type');
    }
    const maskType = window.getMaskTypeFromStore();
    
    if (maskType == "user"){
        // Get class info from React store (ONLY source)
        if (!window.getClassFromStore) {
            console.error('[IRIS] ❌ Class store not available');
            return [255, 255, 255, 255]; // Default white color
        }
        
        const classInfo = window.getClassFromStore(currentClass);
        if (!classInfo) {
            console.error('[IRIS] ❌ Class info not found for class:', currentClass);
            return [255, 255, 255, 255]; // Default white color
        }
        
        if ("user_colour" in classInfo){
            return classInfo.user_colour;
        } else if (classInfo.colour) {
            return classInfo.colour;
        } else {
            console.error('[IRIS] ❌ No colour found in class info');
            return [255, 255, 255, 255]; // Default white color
        }
    } else {
        // Get class color from React store (ONLY source)
        if (!window.getClassColorFromStore) {
            console.error('[IRIS] ❌ Class color store not available');
            return [255, 255, 255, 255]; // Default white color
        }
        
        const classColor = window.getClassColorFromStore(currentClass);
        if (!classColor) {
            console.error('[IRIS] ❌ Class color not found for class:', currentClass);
            return [255, 255, 255, 255]; // Default white color
        }
        
        return classColor;
    }
}

function get_current_mask_and_colours(){
    // Use React store as ONLY source (no fallbacks)
    if (!window.getMaskDataFromStore || !window.getUserMaskDataFromStore || 
        !window.getMaskTypeFromStore || !window.getClassesFromStore) {
        console.error('[IRIS] ❌ CRITICAL: Store not available for get_current_mask_and_colours');
        throw new Error('React store required for mask operations');
    }
    
    const maskData = window.getMaskDataFromStore();
    const userMaskData = window.getUserMaskDataFromStore();
    const maskType = window.getMaskTypeFromStore();
    const classes = window.getClassesFromStore();
    
    if (!maskData || !classes) {
        console.error('[IRIS] ❌ Mask data or classes not available from store');
        throw new Error('Mask data not available');
    }

    if (maskType == "final"){
        var colours = [];
        for (var c of classes){
            colours.push(c.colour);
        }
        return [maskData, colours]
    } else if (maskType == "user"){
        var colours = [
            [255, 255, 255,0], // no user pixel
        ];
        for (var c of classes){
            if ("user_colour" in c){
                colours.push(c.user_colour);
            } else {
                colours.push(c.colour);
            }
        }
        var mask = new Uint8Array(maskData.length);
        for (var i=0; i<mask.length; i++){
            if (userMaskData[i]){
                mask[i] = maskData[i] + 1;
            } else {
                // User did not draw anything, so keep it transparent:
                mask[i] = 0;
            }
        }

        return [mask, colours]
    } else if (maskType == "errors"){ // error mask
        // Get errors mask from React store (ONLY source)
        if (!window.getErrorsMaskDataFromStore) {
            console.error('[IRIS] ❌ CRITICAL: Store not available for errors mask');
            throw new Error('React store required for errors mask');
        }
        const errorsMask = window.getErrorsMaskDataFromStore();
        
        var colours = [
            [255, 255, 255,0], // no validation possible
            [0, 255, 0, 70], // correctly predicted
            [255, 70, 70, 255], // wrongly predicted
        ];
        return [errorsMask, colours]
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

    // PRIMARY: Use React store (ONE-WAY SYNC)
    if (window.renderMaskFromStore) {
        window.renderMaskFromStore(bbox);
        return;
    }

    // React store is required - no fallback
    console.error('[IRIS Migration] ❌ CRITICAL: React store not available for render_mask');
    throw new Error('React store not available for ViewManager');
}

function render_preview(){
    // PRIMARY: Use React store (ONE-WAY SYNC)
    if (window.renderPreviewFromStore) {
        window.renderPreviewFromStore();
        return;
    }

    // React store is required - no fallback
    console.error('[IRIS Migration] ❌ CRITICAL: React store not available for render_preview');
    throw new Error('React store not available for ViewManager');
}

function reset_mask(){
    // Use React store as ONLY source (no fallbacks)
    if (!window.getMaskShapeFromStore || !window.setMaskDataInStore || !window.setUserMaskDataInStore) {
        console.error('[IRIS] ❌ CRITICAL: Store not available for reset_mask');
        throw new Error('React store required for reset mask');
    }
    
    const maskShape = window.getMaskShapeFromStore();
    if (!maskShape) {
        console.error('[IRIS] ❌ No mask shape available from store for reset_mask');
        throw new Error('Mask shape not available');
    }
    
    // Create new empty mask arrays
    const newMaskData = new Uint8Array(maskShape[0] * maskShape[1]);
    const newUserMaskData = new Uint8Array(maskShape[0] * maskShape[1]);
    newMaskData.fill(0);
    newUserMaskData.fill(0);
    
    // Update React store with reset mask data (ONLY source)
    window.setMaskDataInStore(newMaskData, maskShape[0], maskShape[1]);
    window.setUserMaskDataInStore(newUserMaskData);
    
    console.log('[IRIS] ✅ Reset mask using React store');

    reload_hidden_mask();
    render_mask();
    update_drawn_pixels();

    // Set flag to show confirmation dialog before navigating away
    if (!window.segmentationStore) {
        console.error('[IRIS] ❌ Segmentation store not available for reset_mask');
        return;
    }
    
    const store = window.segmentationStore.getState();
    store.setShowDialogueBeforeNextImage(true);
    // IMPORTANT: Mark mask as changed so it gets saved properly
    store.setMaskChanged(true);
}

function reset_filters(){
    // PRIMARY: Use React store (ONE-WAY SYNC)
    if (window.resetFiltersFromStore) {
        window.resetFiltersFromStore();
        return;
    }
    
    // React store is required - no fallback
    console.error('[IRIS Migration] ❌ CRITICAL: React store not available for reset filters');
    throw new Error('React store not available for filter operations');
}

function show_mask(visible){
    // MIGRATION COMPLETE: Use React store as source of truth
    // The store syncs to DOM via React effect in segmentation-app.tsx
    if (window.segmentationStore) {
        window.segmentationStore.getState().setShowMask(visible);
        return; // React handles everything
    }
    
    // FALLBACK: Should never reach here if React loaded properly
    console.warn('show_mask() called but React store not available yet');
}

function login_finished(){
    // REMOVED: fetch_server_update call - React now handles config loading directly
    console.log('🔧 login_finished called - React will handle reinitialization');
}

function logout_finished(){
    save_mask();
    
    // Get segmentation URL from React store (ONLY source)
    if (!window.getApiUrlFromStore) {
        console.error('[IRIS] ❌ API URL store not available for logout_finished');
        return;
    }
    
    const segmentationUrl = window.getApiUrlFromStore('segmentation');
    if (!segmentationUrl) {
        console.error('[IRIS] ❌ No segmentation URL available for logout_finished');
        return;
    }

    const currentImageId = window.getCurrentImageIdFromStore();
    if (!currentImageId) {
        console.error('[IRIS] ❌ No current image ID available for logout_finished');
        return;
    }
    goto_url(segmentationUrl + '?image_id=' + currentImageId);
}

// REMOVED: async function fetch_server_update - React now handles config loading directly
// This function has been replaced by useConfigLoader hook in React

async function load_mask(){
    // PHASE 2: Check React store first (new source of truth)
    if (window.segmentationStore) {
        const store = window.segmentationStore.getState();
        const currentImageId = window.getCurrentImageIdFromStore();
        if (!currentImageId) {
            console.error('[IRIS] ❌ No current image ID available for load_mask');
            return;
        }
        
        if (currentImageId) {
            try {
                await store.loadMaskForImage(currentImageId);
                return; // Store handles everything
            } catch (error) {
                console.error('[IRIS] Store load_mask failed:', error);
                // Fall back to legacy behavior on error
            }
        } else {
            console.error('[IRIS] No current image ID available for load_mask');
            return;
        }
    }
    
    console.log('[IRIS] Using load_mask fallback, store not available');
    await legacyLoadMask();
}

async function legacyLoadMask(){
    show_loader("Loading masks...");

    // Get segmentation URL from React store (ONLY source)
    if (!window.getApiUrlFromStore) {
        console.error('[IRIS] ❌ API URL store not available for legacyLoadMask');
        hide_loader();
        return;
    }
    
    const segmentationUrl = window.getApiUrlFromStore('segmentation');
    if (!segmentationUrl) {
        console.error('[IRIS] ❌ No segmentation URL available for legacyLoadMask');
        hide_loader();
        return;
    }

    const currentImageId = window.getCurrentImageIdFromStore();
    if (!currentImageId) {
        console.error('[IRIS] ❌ No current image ID available for legacyLoadMask');
        return;
    }

    const maskUrl = segmentationUrl + "load_mask/" + currentImageId;

    var results = await download(maskUrl, { cache: 'no-store' });

    if (results.response.status != 200 && results.response.status != 404) {
        hide_loader();

        let error = await results.response.text();
        show_dialogue(
            "error",
            "Could not load the mask from the server!\n" + error
        );
        return;
    }

    // Get mask shape from React store
    const maskShape = window.getMaskShapeFromStore();
    if (!maskShape) {
        console.error('[IRIS Migration] ❌ No mask shape available from store');
        hide_loader();
        show_dialogue("error", "Could not load mask: mask dimensions not available");
        return;
    }
    
    var mask_length = maskShape[1] * maskShape[0];
    
    // Initialize mask arrays
    var maskData = new Uint8Array(mask_length);
    var userMaskData = new Uint8Array(mask_length);
    var errorsMaskData = new Uint8Array(mask_length);
    errorsMaskData.fill(0);

    if (results.response.status == 200){
        var data = results.data;
        maskData = data.slice(1, mask_length+1);
        userMaskData = data.slice(mask_length+1, 2*mask_length+1);
    } else if (results.response.status == 404) {
        // Just use the default mask
        maskData.fill(0);
        userMaskData.fill(0);
    }

    // Update React store (ONLY source)
    if (!window.setMaskDataInStore || !window.setUserMaskDataInStore || !window.setErrorsMaskDataInStore) {
        console.error('[IRIS] ❌ CRITICAL: Store not available for mask loading');
        throw new Error('React store required for mask operations');
    }
    
    if (window.setMaskDataInStore && window.setUserMaskDataInStore && window.setErrorsMaskDataInStore) {
        try {
            window.setMaskDataInStore(maskData, maskShape[0], maskShape[1]);
            window.setUserMaskDataInStore(userMaskData);
            window.setErrorsMaskDataInStore(errorsMaskData);
        } catch (error) {
            console.error('[IRIS] ❌ React store mask loading failed:', error);
        }
    } else {
        console.warn('[IRIS] ⚠️ React store not available for mask loading');
    }

    // Get mask type from React store (ONLY source)
    if (!window.getMaskTypeFromStore) {
        console.error('[IRIS] ❌ CRITICAL: Store not available for mask type in reload_mask');
        throw new Error('React store required for mask type');
    }
    const maskType = window.getMaskTypeFromStore();
    set_mask_type(maskType);
    
    hide_loader();
    
    // Notify React components that mask data is loaded
    window.dispatchEvent(new CustomEvent('iris-mask-loaded'));
    
    update_drawn_pixels();

    // Part of the history (undo-redo) system. When new pixels are drawn, we
    // delete all saved future elements in the history stack and add the
    // current masks to the history (IMMEDIATE for mask loading)
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
        let received_bytes = 0;
        let chunks = [];

        while (true) {
            const result = await reader.read();

            if (result.value) {
                received_bytes += result.value.length;
                chunks.push(result.value);
            }

            if (result.done) break;
        }

        data = new Uint8Array(received_bytes);
        let position = 0;
        for(let chunk of chunks) {
          data.set(chunk, position);
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
    // Check store for dialogue flag
    const shouldShowDialogue = window.segmentationStore 
        ? window.segmentationStore.getState().showDialogueBeforeNextImage
        : false;
    
    if (!window.segmentationStore) {
        console.error('[IRIS] ❌ Segmentation store not available for dialogue_before_next_image');
    }
    
    if (!shouldShowDialogue){
        return;
    }

    show_loader("Making some checks...")
    
    // Use React store as primary source, fallback to legacy vars
    const mainUrl = window.getApiUrlFromStore ? window.getApiUrlFromStore('main') : '/';

    if (!mainUrl) {
        console.error('[IRIS Migration] ❌ No main URL available for dialogue_before_next_image');
        hide_loader();
        return;
    }

    const currentImageId = window.getCurrentImageIdFromStore();
    if (!currentImageId) {
        console.error('[IRIS] ❌ No current image ID available for dialogue_before_next_image');
        return;
    }

    let response = await fetch(`${mainUrl}get_action_info/${currentImageId}/segmentation`);
    if (response.status >= 400){
        // Continue without any dialogue
        hide_loader(); // Fix: Hide the loader before continuing
        if (!window.segmentationStore) {
            console.error('[IRIS] ❌ Segmentation store not available');
            return;
        }
        
        window.segmentationStore.getState().setShowDialogueBeforeNextImage(false);
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
    // Clear the dialogue flag
    if (!window.segmentationStore) {
        console.error('[IRIS] ❌ Segmentation store not available');
        return;
    }
    
    window.segmentationStore.getState().setShowDialogueBeforeNextImage(false);

    action_info = {
        "complete": get_object('dbni-complete_action').checked,
        "difficulty": parseInt(get_object('dbni-difficulty').value),
        "notes": get_object('dbni-notes').value
    }

    // Get main URL from React store (ONLY source)
    if (!window.getApiUrlFromStore) {
        console.error('[IRIS] ❌ API URL store not available for action info');
        return;
    }
    
    const mainUrlForActionInfo = window.getApiUrlFromStore('main');
    if (!mainUrlForActionInfo) {
        console.error('[IRIS] ❌ No main URL available for action info');
        return;
    }

    console.log('action',action_info.complete)

    fetch(`${mainUrlForActionInfo}set_action_info/${action_id}`, {
        method: "POST",
        body: JSON.stringify(action_info)
    })

    // Check if there's a pending navigation from dropdown
    if (window.pendingNavigationImageId) {
        const imageId = window.pendingNavigationImageId;
        window.pendingNavigationImageId = null; // Clear it
        const url = `/segmentation/?image_id=${encodeURIComponent(imageId)}`;
        goto_url(url);
    } else {
        // Normal next image navigation
        next_image();
    }
}

function save_mask(call_afterwards=null){
    // PHASE 2: Check React store first (new source of truth)
    if (window.segmentationStore) {
        const store = window.segmentationStore.getState();
        store.saveCurrentMask().then(() => {
            if (call_afterwards !== null) {
                call_afterwards();
            }
        }).catch((error) => {
            console.error('[IRIS] Store save_mask failed:', error);
            // Fall back to legacy behavior on error
            legacySaveMask(call_afterwards);
        });
        return;
    }
    
    console.log('[IRIS] Using save_mask fallback, store not available');
    legacySaveMask(call_afterwards);
}

function legacySaveMask(call_afterwards=null){
    show_message('Saving mask...');
    
    // Get mask data from React store (ONLY SOURCE)
    if (!window.getMaskDataFromStore || !window.getUserMaskDataFromStore) {
        console.error('[IRIS] ❌ React store not available for saving');
        show_dialogue("error", "Cannot save mask: React store not available");
        if (call_afterwards !== null) {
            call_afterwards();
        }
        return Promise.reject(new Error('React store not available'));
    }
    
    const maskData = window.getMaskDataFromStore();
    const userMaskData = window.getUserMaskDataFromStore();
    
    // Do not save any masks if they have not been loaded yet
    if (maskData === null || userMaskData === null){
        console.error('[IRIS] ❌ Mask data is null, cannot save');
        if(call_afterwards !== null){
          call_afterwards();
        }
        return Promise.resolve();
    }

    // Combine both masks together to one byte array with padding magic
    // numbers 254 to make sure the transaction was done successfully
    const maskShape = window.getMaskShapeFromStore();
    if (!maskShape) {
        console.error('[IRIS] No mask shape available for save operation');
        if (call_afterwards !== null) {
            call_afterwards();
        }
        return Promise.reject(new Error('No mask shape'));
    }
    
    var m_length = maskShape[0] * maskShape[1];
    var data = new Uint8Array(2*m_length+2);
    var padding = new Uint8Array([254]);
    data.set(padding);
    data.set(maskData, 1);
    data.set(userMaskData, m_length+1);
    data.set(padding, 2*m_length+1);

    const segmentationUrl = window.getApiUrlFromStore ? window.getApiUrlFromStore('segmentation') : null;
    if (!segmentationUrl) {
        console.error('[IRIS] ❌ No segmentation URL available for legacySaveMask');
        if (call_afterwards !== null) {
            call_afterwards();
        }
        return Promise.reject(new Error('No segmentation URL'));
    }

    const currentImageId = window.getCurrentImageIdFromStore();
    if (!currentImageId) {
        console.error('[IRIS] ❌ No current image ID available for legacySaveMask');
        if (call_afterwards !== null) {
            call_afterwards();
        }
        return Promise.reject(new Error('No current image ID'));
    }

    return fetch(segmentationUrl + "save_mask/" + currentImageId, {
        method: "POST",
        body: data,
        headers: {
            "Content-Type": "application/octet-stream"
        }
    }).then(async (response) => {
        await save_mask_finished(response, call_afterwards);
        if (response.status !== 200) {
            throw new Error(`Save failed with status ${response.status}`);
        }
    });
}

async function save_mask_finished(response, call_afterwards){
    // Note: fetch_server_update() removed - React handles config updates directly
    // Mask saving doesn't require config reload, just success/error handling

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
    // PHASE 2: Check React store first (new source of truth)
    if (window.segmentationStore) {
        const store = window.segmentationStore.getState();
        try {
            await store.predictMask();
            return; // Store handles everything
        } catch (error) {
            console.error('[IRIS] Store predict_mask failed:', error);
            // Fall back to legacy behavior on error
        }
    }
    
    console.log('[IRIS] Using predict_mask fallback, store not available');
    await legacyPredictMask();
}

async function legacyPredictMask(){
    // PHASE 1: Use React store for AI training validation (primary source)
    let validationResult;
    if (window.validateAITrainingDataFromStore) {
        try {
            validationResult = window.validateAITrainingDataFromStore();
            
            if (!validationResult.isValid) {
                return; // React store handles error display
            }
        } catch (error) {
            console.error('[IRIS Migration] ❌ React store AI validation failed:', error);
        }
    } else {
        console.warn('[IRIS Migration] ⚠️ React store AI validation not available, using legacy fallback');
    }
    
    // Get pixel counts from React store (ONLY source)
    if (!window.getUserPixelCountsFromStore) {
        console.error('[IRIS] ❌ User pixel counts store not available');
        hide_loader();
        return;
    }
    
    const pixelCounts = window.getUserPixelCountsFromStore();
    if (!pixelCounts) {
        console.error('[IRIS] ❌ No pixel counts available');
        hide_loader();
        return;
    }
    
    // Get class count from React store (ONLY source)
    if (!window.getClassCountFromStore) {
        console.error('[IRIS] ❌ Class count store not available');
        throw new Error('React store required for class count');
    }
    const classCount = window.getClassCountFromStore();
    
    // Get user classes from validation result or calculate from pixel counts
    let user_classes;
    if (validationResult && validationResult.classPixelCounts) {
        user_classes = Object.keys(validationResult.classPixelCounts)
            .map(key => parseInt(key))
            .filter(classId => validationResult.classPixelCounts[classId] > 10);
    } else {
        user_classes = [];
        
        for (var i=0; i < classCount; i++){
            if (pixelCounts[i] > 10){
                user_classes.push(i);
            }
        }
        if (user_classes.length < 2){
            // This validation is now handled by React store, just return
            // The React store will show the modern error modal
            return;
        }
    }

    show_loader("Prepare training data...");

    // Get mask data from React store (ONLY source)
    if (!window.getMaskDataFromStore || !window.getUserMaskDataFromStore) {
        console.error('[IRIS] ❌ Mask data store not available for legacyPredictMask');
        hide_loader();
        return;
    }
    
    let maskData, userMaskData;
    try {
        maskData = window.getMaskDataFromStore();
        userMaskData = window.getUserMaskDataFromStore();
    } catch (error) {
        console.error('[IRIS] ❌ Failed to get mask data from store:', error);
        hide_loader();
        return;
    }

    if (!maskData || !userMaskData) {
        console.error('[IRIS] ❌ No mask data available for legacyPredictMask');
        hide_loader();
        return;
    }

    // Get all the user pixels
    let all_user_pixels = new Array();
    let all_user_labels = new Array();
    for (var i=0; i<=userMaskData.length; i++){
        // Only add the user pixel if there are enough pixels from that class:
        if (userMaskData[i] && pixelCounts[maskData[i]] > 10){
            all_user_pixels.push(i);
            all_user_labels.push(maskData[i]);
        }
    }

    // Sample training points (we do not want to train the model on all points):
    let all_indices = Array(all_user_pixels.length).fill().map((_, i) => i);
    var rng = new RNG(42);
    rng.shuffle(all_indices);

    // We need to keep track of how many pixels we already have sampled.
    // Furthermore, we keep also a ratio of pixels as testing dataset:
    let n_samples = {};
    let test_n_samples = {};
    
    // Get AI model config from React store (ONLY source)
    const aiModel = window.getConfigSectionFromStore ? 
        window.getConfigSectionFromStore('segmentation')?.ai_model : null;
    
    if (!window.getConfigSectionFromStore) {
        console.error('[IRIS] ❌ Config store not available for AI model');
    }

    if (!aiModel) {
        console.error('[IRIS] ❌ No AI model config available for legacyPredictMask');
        hide_loader();
        return;
    }

    for (let user_class of user_classes){
        // Set the current number of samples (0) and the maximum
        // Use pixel counts from React store (primary) or legacy vars (fallback)
        const classPixelCount = pixelCounts[user_class] || 0;
        
        n_samples[user_class] = {
            "current": 0,
            "max": Math.min(
                round_number(classPixelCount * aiModel.train_ratio),
                aiModel.max_train_pixels
            )
        };
        test_n_samples[user_class] = {
            "current": 0,
            "max": Infinity
        };
    }

    // Here we decide whether we send a pixel for training to the server or keep
    // it here as testing dataset:
    let test_indices = new Array();
    let train_user_pixels = new Array();
    let train_user_labels = new Array();
    let test_user_pixels = new Array();
    let test_user_labels = new Array();
    for (let i of all_indices){
        let class_id = all_user_labels[i];
        if (n_samples[class_id].current < n_samples[class_id].max){
            train_user_pixels.push(all_user_pixels[i]);
            train_user_labels.push(class_id);
            n_samples[class_id].current += 1;
        } else {
            test_indices.push(i);
            test_user_pixels.push(all_user_pixels[i]);
            test_user_labels.push(class_id);
            test_n_samples[class_id].current += 1;
        }
    }

    show_loader("Train AI...");
    
    // Get segmentation URL from React store (ONLY source)
    if (!window.getApiUrlFromStore) {
        console.error('[IRIS] ❌ API URL store not available for legacyPredictMask');
        hide_loader();
        return;
    }
    
    const segmentationUrl = window.getApiUrlFromStore('segmentation');
    if (!segmentationUrl) {
        console.error('[IRIS] ❌ No segmentation URL available for legacyPredictMask');
        hide_loader();
        return;
    }

    if (!segmentationUrl) {
        console.error('[IRIS Migration] ❌ No segmentation URL available for legacyPredictMask');
        hide_loader();
        return;
    }

    const currentImageId = window.getCurrentImageIdFromStore();
    if (!currentImageId) {
        console.error('[IRIS] ❌ No current image ID available for legacyPredictMask');
        return;
    }

    let results = await download(
            segmentationUrl + "predict_mask/" + currentImageId,
            {
                method: "POST",
                body: JSON.stringify({
                    "user_pixels": train_user_pixels,
                    "user_labels": train_user_labels
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
    let cm = createArray(classCount, classCount);
    fill2DArray(cm, 0);

    // Create errors mask through React store (ONLY source)
    // Reuse maskData from earlier in the function
    const maskLength = maskData?.length;
    
    if (!maskLength) {
        console.error('[IRIS] ❌ No mask data available for errors mask');
        hide_loader();
        return;
    }
    
    const newErrorsMask = new Uint8Array(maskLength);
    newErrorsMask.fill(0);
    
    // Set errors mask through React store (ONLY source)
    if (!window.setErrorsMaskDataInStore) {
        console.error('[IRIS] ❌ Store not available for errors mask');
        hide_loader();
        return;
    }
    window.setErrorsMaskDataInStore(newErrorsMask);

    let tp = {};
    for (let user_class of user_classes){
        tp[user_class] = 0;
    }
    
    // Get current errors mask from React store for pixel updates
    let currentErrorsMask;
    if (window.getErrorsMaskDataFromStore) {
        currentErrorsMask = window.getErrorsMaskDataFromStore();
    } else {
        console.error('[IRIS] ❌ CRITICAL: Store not available for errors mask');
        throw new Error('React store required for errors mask');
    }
    
    if (!currentErrorsMask) {
        console.error('[IRIS Migration] legacyPredictMask: No errors mask available for pixel setting');
        return;
    }
    
    // Create a copy for modification
    const updatedErrorsMask = new Uint8Array(currentErrorsMask);
    
    for (let i of test_indices){
        let mask_index = all_user_pixels[i];
        cm[all_user_labels[i]][results.data[mask_index]] += 1;
        if (all_user_labels[i] == results.data[mask_index]){
            tp[all_user_labels[i]] += 1;

            // Correct:
            updatedErrorsMask[mask_index] = 1;
        } else {
            // Incorrect:
            updatedErrorsMask[mask_index] = 2;
        }
    }
    
    // Update through React store (primary source)
    if (window.setErrorsMaskDataInStore) {
        window.setErrorsMaskDataInStore(updatedErrorsMask);
    } else {
        console.error('[IRIS] ❌ CRITICAL: Store not available for errors mask update');
        throw new Error('React store required for errors mask');
    }
    let acc_prod = user_classes.length;
    let acc_sum = 0;
    for (let label of user_classes){
        let acc = tp[label] / test_n_samples[label].current;
        acc_prod *= acc;
        acc_sum += acc;
    }

    // CRITICAL: Set the confusion matrix through React store (primary source) with fallback to legacy vars
    if (window.createConfusionMatrixFromStore && window.setConfusionMatrixInStore) {
        // Get class names from React store (ONLY source)
        if (!window.getClassesFromStore) {
            console.error('[IRIS] ❌ Classes store not available for confusion matrix');
            return; // Cannot create confusion matrix without class names
        }
        
        const classNames = window.getClassesFromStore().map(cls => cls.name);
        
        // Create structured confusion matrix object
        const confusionMatrixObj = window.createConfusionMatrixFromStore(cm, tp, user_classes, classNames);
        
        // Set in React store (primary source)
        window.setConfusionMatrixInStore(confusionMatrixObj);
    } else {
        console.error('[IRIS] ❌ Confusion matrix store not available - cannot save confusion matrix');
    }

    update_ai_box(acc_prod / acc_sum, cm, tp, user_classes);

    // Apply prediction results using React store (ONLY SOURCE)
    if (!window.getMaskDataFromStore || !window.getUserMaskDataFromStore || !window.setMaskDataInStore) {
        console.error('[IRIS Migration] ❌ CRITICAL: React store not available for prediction application');
        hide_loader();
        throw new Error('React store required for AI prediction');
    }
    
    const currentMaskData = window.getMaskDataFromStore();
    const currentUserMaskData = window.getUserMaskDataFromStore();
    const maskShape = window.getMaskShapeFromStore();
    
    if (!currentMaskData || !currentUserMaskData || !maskShape) {
        console.error('[IRIS Migration] ❌ Mask data not available from store for prediction');
        hide_loader();
        throw new Error('Mask data not available');
    }
    
    const newMaskData = new Uint8Array(currentMaskData);

    // Only update the mask where the user did not draw to
    let aiPixelsApplied = 0;
    for (var i = 0; i < results.data.length; i++) {
        if (!currentUserMaskData[i]){
            newMaskData[i] = results.data[i];
            aiPixelsApplied++;
        }
    }

    console.log(`[IRIS] AI Prediction: Applied ${aiPixelsApplied} AI-predicted pixels`);

    // Update store with prediction results
    window.setMaskDataInStore(newMaskData, maskShape[0], maskShape[1]);
    
    reload_hidden_mask();
    render_mask();

    // Part of the history (undo-redo) system. When new pixels are drawn, we
    // delete all saved future elements in the history stack and add the
    // current masks to the history (IMMEDIATE for AI predictions)
    discard_future();
    update_history();

    hide_loader();

    // Set dialogue flag in store
    if (!window.segmentationStore) {
        console.error('[IRIS] ❌ Segmentation store not available for AI prediction');
        return;
    }
    
    window.segmentationStore.getState().setShowDialogueBeforeNextImage(true);
}



function update_ai_box(score, cm, tp, user_classes){
    // CRITICAL: Don't update AI score DOM directly when React is available
    // React AIScore component handles this via the store
    if (!window.segmentationStore) {
        // Fallback: Update DOM directly only if React store not available
        console.warn('[IRIS Migration] ⚠️ FALLBACK: Updating AI score DOM directly - React store not available');
        get_object("ai-score").innerHTML = round_number(score*100) + "%";
    } else {
        console.log('[IRIS Migration] ✅ Skipping AI score DOM update - React AIScore component handles this');
    }

    let recommendation = "Draw more training pixels!";

    let min_acc = 1;
    let worst_label = null;

    // CRITICAL: Get accuracy stats from React store (primary source) with fallback to legacy calculation
    let accuracyStats = null;
    if (window.getAccuracyStatsFromStore) {
        accuracyStats = window.getAccuracyStatsFromStore();
        if (accuracyStats) {
            min_acc = accuracyStats.worstAccuracy;
            worst_label = accuracyStats.worstClass;
            console.log('[IRIS Migration] ✅ Using accuracy stats from React store');
        }
    }
    
    // Fallback to legacy calculation if React store not available
    if (!accuracyStats) {
        console.warn('[IRIS Migration] ⚠️ FALLBACK: getAccuracyStatsFromStore not available, using legacy calculation');
        
        // Get pixel counts from React store (ONLY source)
        if (!window.getUserPixelCountsFromStore) {
            console.error('[IRIS] ❌ User pixel counts store not available for accuracy calculation');
            // Continue without accuracy stats
        } else {
            const pixelCounts = window.getUserPixelCountsFromStore();
            if (!pixelCounts) {
                console.error('[IRIS] ❌ No pixel counts available for accuracy calculation');
                // Continue without accuracy stats
            } else {
                // Calculate accuracy for each class
                for (let label of user_classes){
                    let acc = tp[label] / (pixelCounts[label]);
                    if (acc < min_acc){
                        min_acc = acc;
                        worst_label = label;
                    }
                }
            }
        }
    }
    if (worst_label !== null){
        // Get class name from React store (ONLY source)
        if (!window.getClassNameFromStore) {
            console.error('[IRIS] ❌ Class name store not available');
            recommendation = "Could you provide more training pixels for <b>Class " + worst_label + "</b>";
        } else {
            const className = window.getClassNameFromStore(worst_label);
            if (!className) {
                console.error('[IRIS] ❌ Class name not found for label:', worst_label);
                recommendation = "Could you provide more training pixels for <b>Class " + worst_label + "</b>";
            } else {
                recommendation = "Could you provide more training pixels for <b>"+className+"</b>";
            }
        }
    }

    get_object("ai-recommendation").innerHTML = recommendation;
}

// REMOVED: window.init_segmentation - React now handles initialization directly

// CRITICAL: Expose legacy functions to window object for React canvas integration
// These exports MUST be at the end of the file to ensure all functions are defined first
window.mouse_wheel = mouse_wheel;
window.mouse_move = mouse_move;
window.mouse_down = mouse_down;
window.mouse_up = mouse_up;
window.mouse_enter = mouse_enter;
window.zoom = zoom;
window.update_cursor_coords = update_cursor_coords;
window.user_draws_on_mask = user_draws_on_mask;
window.render_preview = render_preview;
window.get_tool_offset = get_tool_offset;
window.legacySaveMask = legacySaveMask;
window.load_mask = load_mask;
window.legacyLoadMask = legacyLoadMask;
window.init_views = init_views;
