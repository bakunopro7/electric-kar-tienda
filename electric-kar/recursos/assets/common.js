/* electrick-Kar — interacciones comunes */
(function () {
  const KEY = "ek_cart_count";

  function getCount() { return parseInt(localStorage.getItem(KEY) || "3", 10); }
  function setCount(n) {
    localStorage.setItem(KEY, n);
    document.querySelectorAll("[data-cart-count]").forEach(el => { el.textContent = n; });
  }

  // Toast
  let toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
      "<span>" + msg + "</span>";
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  // Add to cart
  document.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    e.preventDefault();
    setCount(getCount() + (parseInt(btn.dataset.qty || "1", 10)));
    const name = btn.dataset.add || "Producto";
    toast(name + " agregado al carrito");
    if (btn.classList.contains("add-btn")) {
      const original = btn.innerHTML;
      btn.classList.add("added");
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      setTimeout(() => { btn.classList.remove("added"); btn.innerHTML = original; }, 1400);
    }
  });

  // Wishlist toggle
  document.addEventListener("click", function (e) {
    const w = e.target.closest(".card-wish");
    if (!w) return;
    e.preventDefault();
    w.classList.toggle("on");
    w.style.color = w.classList.contains("on") ? "var(--red)" : "";
    w.style.borderColor = w.classList.contains("on") ? "var(--red)" : "";
  });

  // Reveal on scroll
  function initReveal() {
    const els = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en, i) => {
        if (en.isIntersecting) {
          const delay = parseFloat(en.target.dataset.delay || 0);
          setTimeout(() => en.target.classList.add("in"), delay * 1000);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(el => io.observe(el));
  }

  document.addEventListener("DOMContentLoaded", function () {
    setCount(getCount());
    initReveal();
  });
})();
