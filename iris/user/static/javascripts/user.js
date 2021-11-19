// This requires diaglogue.js and a valid login_finished function!
// TODO: This is clearly not the way how one should do this. I should enforce a
// better programming style here.
async function dialogue_user(label_mode){
    let response = await fetch(vars.url.user+"show/current");

    if (response.status >= 400) {
        dialogue_login();
        return;
    }

    let content = await response.text();
    show_dialogue("info", content, false, title="User information");
}

async function dialogue_config(){
    let response = await fetch(vars.url.user+'config');
    let content = await response.text();

    show_dialogue("info", content, false, title="Preferences");
}

function dialogue_config_show_error(error){
    document.getElementById('dc-error').innerHTML = error;
    document.getElementById('dc-error').style.display = "block";
}

async function dialogue_config_save(){
    // Clear error message:
    document.getElementById('dc-error').style.display = "none";

    let bands = [];

    let include = document.getElementById('dcs-bands-include');
    for (let option of include.options){
        bands.push(option.value);
    }

    if (bands.length == 0){
        dialogue_config_show_error("[Segmentation] Need at least one band as input!");
        return;
    }

    ai_model_config = {
        "bands": bands,
        "n_estimators": parseInt(get_object('dcs-n_estimators').value),
        "max_depth": parseInt(get_object('dcs-max_depth').value),
        "n_leaves": parseInt(get_object('dcs-n_leaves').value),
        "train_ratio": get_object('dcs-train_ratio').value / 100,
        "max_train_pixels": parseInt(get_object('dcs-max_train_pixels').value),
        "use_edge_filter": get_object('dcs-use_edge_filter').checked,
        "use_meshgrid": get_object('dcs-use_meshgrid').checked,
        "meshgrid_cells": get_object('dcs-meshgrid_cells').value,
        "use_superpixels": get_object('dcs-use_superpixels').checked,
        "suppression_filter_size": parseInt(get_object('dcs-suppression_filter_size').value),
        "suppression_threshold": parseInt(get_object('dcs-suppression_threshold').value),
        "suppression_default_class": parseInt(get_object('dcs-suppression_default_class').value)
    }

    vars.config['segmentation']['ai_model'] = ai_model_config;

    save_config(vars.config);
}

function save_config(config){
    fetch(vars.url.user+'save_config', {
        method: "POST",
        body: JSON.stringify(config)
    })
}

function dialogue_config_include_bands(){
    let include = document.getElementById('dcs-bands-include');
    let exclude = document.getElementById('dcs-bands-exclude');
    let options = Array.from(exclude.selectedOptions);
    for (let option of options){
        include.appendChild(option);
    }
}

function dialogue_config_exclude_bands(){
    let include = document.getElementById('dcs-bands-include');
    let exclude = document.getElementById('dcs-bands-exclude');
    let options = Array.from(include.selectedOptions);
    for (let option of options){
        exclude.appendChild(option);
    }
}

function dialogue_login(){
    let content = `
    <table style="border: 0px;">
        <tr>
            <td><b>Username:</b></td>
            <td><input type=text id="login-username"></td>
        </tr>
        <tr>
            <td><b>Password:</b></td>
            <td><input type=password id="login-password"></td>
        </tr>
    </table>
    <p style="color: red; font-weight: bold;" id="login-error"></p>
    <button onclick="login();">Login</button>
    <button onclick="dialogue_register();">I have no account yet</button>
`;
    show_dialogue("info", content, true, title="Login");
}

async function login(){
    let username = get_object('login-username');
    let password = get_object('login-password');

    let response = await fetch(vars.url.user+"login", {
        method: "POST",
        body: JSON.stringify({
            "username": username.value,
            "password": password.value
        })
    });
    let message = await response.text();

    if (response.status >= 400) {
        get_object('login-error').innerHTML = message;
        return;
    }
    password.value = null;
    hide_dialogue();
    login_finished();
}

function dialogue_register(){
    let content = `
    <table style="border: 0px;">
        <tr>
            <td><b>Username:</b></td>
            <td><input type=text id="register-username"></td>
        </tr>
        <tr>
            <td><b>Password:</b></td>
            <td><input type=password id="register-password"></td>
        </tr>
        <tr>
            <td><b>Retype Password:</b></td>
            <td><input type=password id="register-password-again"></td>
        </tr>
        <tr>
            <td><b>E-Mail (optional for password recovery):</b></td>
            <td><input type=email id="register-email"></td>
        </tr>
    </table>
    <p style="color: red; font-weight: bold;" id="register-error"></p>
    <button onclick="register();">Register</button>
    <button onclick="dialogue_login();">I have already an account</button>
`;
    show_dialogue("info", content, true, title="Register");
}

async function register(){
    let username = get_object('register-username');
    let password = get_object('register-password');
    let password_again = get_object('register-password-again');
    let email = get_object('register-email');

    if (password.value != password_again.value){
        get_object('register-error').innerHTML = 'The passwords are not identical!';
        return;
    }

    let response = await fetch(vars.url.user+"register", {
        method: "POST",
        body: JSON.stringify({
            "username": username.value,
            "password": password.value,
            "email": email.value,
        })
    });

    let message = await response.text();
    if (response.status >= 400) {
        get_object('register-error').innerHTML = message;
        return;
    }
    password.value = null;
    hide_dialogue();
    login_finished();
}

async function logout(next=null){
    await fetch(vars.url.user+"logout");

    if (next !== null){
        next();
    } else {
        logout_finished();
    }
}

function login_finished(){

}
function logout_finished(){
    // Don't allow no login
    dialogue_login();
}
