const Session = require("../../../libtowers/libtowers.js").Session;

const sessions = {};

function get(id) {
    if (!(id in sessions)) {
        sessions[id] = new Session(id, "Sample text");
    }
    console.log("GET" + id);
    console.log(sessions[id]);
    return sessions[id];
};

function put(id, data) {
    sessions[id] = data;
    console.log("PUT");
    console.log(data);
    return sessions[id];
};

function set_id(string) {
    document.getElementById("name").value = string;
}

function current_id() {
    return document.getElementById("name").value;
}

function setup_id() {
    set_id("1234");
    document.getElementById("name").value = current_id();
}

function load_button_click() {
    let session = get(current_id());
    document.getElementById("content").value = session.content;
}

function save_button_click() {
    let name = document.getElementById("name").value;
    set_id(name);
    let content = document.getElementById("content").value;
    let session = new Session(name, content);
    put(current_id(), session);
    document.getElementById("content").value = "";
}

function history_back(event) {
    set_id(event.state.id);
}

module.exports = {
    save_button_click,
    load_button_click,
    history_back,
    setup_id,
};
