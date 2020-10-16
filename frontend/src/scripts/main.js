(() => {
  let secondary = require("../../src/scripts/secondary.js");
  let Session = require("../../../libcommon/libcommon.js").Session;

  const save_button = document.getElementById("save_button");
  save_button.addEventListener("click", () => {
    secondary.save_button_click();
  });

  const load_button = document.getElementById("load_button");
  load_button.addEventListener("click", () => {
    secondary.load_button_click();
  });

  window.addEventListener('popstate', (event) => {
    secondary.history_back(event);
  });

  secondary.setup_id();
})();
