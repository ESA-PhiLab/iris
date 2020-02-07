// This requires diaglogue.js and a valid fetch_user_info function!

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
    <button onclick="dialogue_register();">Register</button>
`;
    show_dialogue("info", content, true, title="Login");
}

async function login(){
    let username = get_object('login-username');
    let password = get_object('login-password');

    let response = await fetch(vars.url.auth+"login", {
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
    <button onclick="dialogue_login();">Login</button>
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

    let response = await fetch(vars.url.auth+"register", {
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
    await fetch(vars.url.auth+"logout");

    if (next !== null){
        next();
    }
}
