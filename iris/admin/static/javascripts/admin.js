async function open_page(page, options=null){
    let url = vars.url.admin + page;
    let response = null;
    if (options === null){
        response = await fetch(url);
    } else {
        response = await fetch(url, options);
    }

    let html = await response.text();
    get_object('admin-page-content').innerHTML = html;

    let tabs = document.getElementsByClassName("tablinks");
    for(let tab of tabs){
        tab.classList.remove("checked");
    }
    get_object('page-'+page).classList.add("checked");
}
