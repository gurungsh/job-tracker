// Sets the theme on <html> before anything is drawn, so the page never flashes the wrong one (spec 010).
// The saved choice wins, otherwise the device's setting. Plain script: it runs before the app loads.
(function () {
  var theme = null;
  try {
    var stored = window.localStorage.getItem("job-tracker-theme");
    if (stored === "light" || stored === "dark") theme = stored;
  } catch {
    // Storage is blocked. Follow the device.
  }
  if (theme === null) {
    try {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      theme = "light";
    }
  }
  document.documentElement.setAttribute("data-theme", theme);
})();
