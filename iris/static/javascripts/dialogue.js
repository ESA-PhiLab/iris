function show_dialogue(type, content, blocking=false, title=null){
    // Make sure no loader blocks the screen:
    hide_loader();

    // Get the dialogue
    var dialogue = document.getElementById("dialogue");

    // Get the <span> element that closes the dialogue
    var close_button = document.getElementById("dialogue-close");

    // If blocking is true, we do not want a closing button
    if (blocking){
        close_button.style.display = 'none';
    } else {
        close_button.style.display = 'block';
    }

    // Set the content:
    var body = document.getElementById("dialogue-body");
    body.innerHTML = content;

    var header = document.getElementById("dialogue-header");
    var header_title = document.getElementById("dialogue-title");
    if (type == 'info'){
        header.style['background-color'] = '#5cb85c';
        header_title.innerHTML = 'Information';
    } else if (type == 'warning'){
        header.style['background-color'] = '#cdcd00';
        header_title.innerHTML = 'Warning';
    } else {
        header.style['background-color'] = '#f73939';
        header_title.innerHTML = 'Error';
    }

    if (title !== null){
        header_title.innerHTML = title;
    }

    // show the dialogue
    dialogue.style.display = "block";
}

function hide_dialogue(){
    var dialogue = document.getElementById("dialogue");
    dialogue.style.display = "none";
    var body = document.getElementById("dialogue-body");
    body.innerHTML = "";
}

function show_loader(text=null){
    var body = document.getElementById("loader-text");
    body.innerHTML = text;

    // show the dialogue
    var loader = document.getElementById("loader");
    loader.style.visibility = "visible";
}

function hide_loader(){
    var loader = document.getElementById("loader");
    loader.style.visibility = "hidden";
}

function show_message(text, timer=null){
    var message = document.getElementById("message");
    message.style.visibility = "visible";
    message.innerHTML = text;

    if (timer !== null){
        window.setTimeout(hide_message, timer);
    }
}

function hide_message(){
    var message = document.getElementById("message");
    message.style.visibility = "hidden";
}

function block_screen(){
    document.getElementById("block-screen").style.visibility = "visible";
}

function unblock_screen(){
    document.getElementById("block-screen").style.visibility = "hidden";
}
