(function () {
    var root = document.documentElement;
    var toggle = document.getElementById("theme-toggle");
    var burger = document.getElementById("nav-burger");
    var nav = document.getElementById("site-nav");

    var stored = null;
    try {
        stored = localStorage.getItem("theme");
    } catch (e) { /* ignore */ }
    if (stored) {
        root.setAttribute("data-theme", stored);
    }

    function renderIcon() {
        if (toggle) {
            toggle.textContent = root.getAttribute("data-theme") === "dark" ? "☾" : "☀";
        }
    }
    renderIcon();

    if (toggle) {
        toggle.addEventListener("click", function () {
            var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
            root.setAttribute("data-theme", next);
            try {
                localStorage.setItem("theme", next);
            } catch (e) { /* ignore */ }
            renderIcon();
        });
    }

    if (burger && nav) {
        burger.addEventListener("click", function () {
            nav.classList.toggle("open");
        });
    }
})();
