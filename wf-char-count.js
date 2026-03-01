/*! MIT License | © 2026 Mykhailo Voloshyn, WebFolks.io */

(function () {
  "use strict";

  // ====== ATTRS ======
  const WRAP_ATTR = "data-wf-limit";
  const WRAP_VALUE = "wrap";

  const MODE_ATTR = "data-wf-limit-mode"; // "hard" | "soft"
  const CTA_ATTR = "data-wf-limit-cta";

  const COUNTER_ATTR = "data-wf-limit-counter";
  const COUNTER_FOR_ATTR = "data-wf-limit-for";
  const FIELD_KEY_ATTR = "data-wf-limit-key";

  const REMAINING_ATTR = "data-wf-limit-remaining";
  const MAX_ATTR = "data-wf-limit-max";
  const FORMAT_ATTR = "data-wf-limit-format"; // {remaining} {max} {used}

  const COUNTER_SHOW_ATTR = "data-wf-limit-counter-show"; // wrapper or counter-level
  const NATIVE_BUBBLE_ATTR = "data-wf-limit-native-bubble"; // "true" to show browser message

  // ====== INTERNAL ======
  const STORE_INIT_ATTR = "data-wf-limit-initialized";
  const STORE_MAX_ATTR = "data-wf-limit-max-store";
  const STORE_ORIG_MAXLEN_ATTR = "data-wf-limit-orig-maxlength";

  const WARN_AT_RATIO_DEFAULT = 0.2; // <=20% remaining => warn

  // ====== CSS ======
  function injectCSSOnce() {
    if (document.getElementById("wf-limit-styles")) return;

    const css = `
/* Counter show/hide */
.wf-limit__counter-hidden { display: none !important; }

/* Per-counter state colors */
[${COUNTER_ATTR}].wf-counter--ok   { color: inherit; opacity: .85; }
[${COUNTER_ATTR}].wf-counter--warn { color: #b45309; opacity: 1; }
[${COUNTER_ATTR}].wf-counter--over { color: #b91c1c; opacity: 1; }

/* CTA disabled */
.wf-limit__cta-disabled {
  pointer-events: none !important;
  opacity: .55 !important;
}

/* Highlighter (mirror behind field) */
.wf-limit__field-wrap { position: relative !important; }
.wf-limit__mirror {
  position: absolute !important;
  inset: 0 !important;
  pointer-events: none !important;
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  overflow: hidden !important;
  color: transparent !important;
}
.wf-limit__mirror--single { white-space: pre !important; }
.wf-limit__overflow { background: rgba(220, 38, 38, 0.22); }

.wf-limit__field {
  position: relative !important;
  background-color: transparent !important;
}
    `.trim();

    const style = document.createElement("style");
    style.id = "wf-limit-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ====== UTILS ======
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function parseRatio(val) {
    if (val == null) return null;
    const s = String(val).trim();
    if (!s) return null;

    if (s.endsWith("%")) {
      const n = parseFloat(s.slice(0, -1));
      if (!Number.isFinite(n)) return null;
      return Math.min(1, Math.max(0, n / 100));
    }

    const n = parseFloat(s);
    if (!Number.isFinite(n)) return null;
    return Math.min(1, Math.max(0, n));
  }

  function wantsNativeBubble(wrap) {
    return String(wrap.getAttribute(NATIVE_BUBBLE_ATTR) || "").toLowerCase() === "true";
  }

  // DEFAULT MODE = HARD
  function resolveMode(wrap, field) {
    if (field) {
      const fm = field.getAttribute(MODE_ATTR);
      if (fm) {
        const m = String(fm).toLowerCase();
        if (m === "hard" || m === "soft") return m;
      }
    }
    const wm = String(wrap.getAttribute(MODE_ATTR) || "hard").toLowerCase();
    return wm === "soft" ? "soft" : "hard";
  }

  function getFieldKey(field) {
    return (
      field.getAttribute(FIELD_KEY_ATTR) ||
      field.getAttribute("name") ||
      field.getAttribute("id") ||
      ""
    ).trim();
  }

  function getMax(field) {
    const stored = field.getAttribute(STORE_MAX_ATTR);
    if (stored) {
      const n = parseInt(stored, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }

    const ml = field.getAttribute("maxlength");
    if (!ml) return null;

    const max = parseInt(ml, 10);
    if (!Number.isFinite(max) || max <= 0) return null;

    field.setAttribute(STORE_MAX_ATTR, String(max));
    field.setAttribute(STORE_ORIG_MAXLEN_ATTR, String(max));
    return max;
  }

  function applyModeToField(wrap, field) {
    const mode = resolveMode(wrap, field);
    const max = getMax(field);
    if (!max) return;

    const orig = field.getAttribute(STORE_ORIG_MAXLEN_ATTR) || String(max);

    if (mode === "hard") field.setAttribute("maxlength", orig);
    else field.removeAttribute("maxlength");
  }

  function findFieldsWithMax(wrap) {
    const all = wrap.querySelectorAll("textarea, input");
    const result = [];

    all.forEach((el) => {
      if (
        el.matches(
          'input[type="hidden"], input[type="checkbox"], input[type="radio"], input[type="file"], input[type="range"], input[type="color"]'
        )
      ) return;

      const ml = el.getAttribute("maxlength") || el.getAttribute(STORE_MAX_ATTR);
      if (!ml) return;

      const max = parseInt(ml, 10);
      if (!Number.isFinite(max) || max <= 0) return;

      result.push(el);
    });

    return result;
  }

  function ensureFieldWrap(field) {
    const existing = field.closest(".wf-limit__field-wrap");
    if (existing) return existing;

    const wrap = document.createElement("div");
    wrap.className = "wf-limit__field-wrap";
    field.parentNode.insertBefore(wrap, field);
    wrap.appendChild(field);

    return wrap;
  }

  function copyFieldStylesToMirror(field, mirror, isSingleLine) {
    const cs = window.getComputedStyle(field);
    const props = [
      "fontFamily","fontSize","fontWeight","fontStyle","letterSpacing","textTransform",
      "lineHeight","textIndent","textAlign",
      "paddingTop","paddingRight","paddingBottom","paddingLeft",
      "borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth",
      "boxSizing",
    ];

    props.forEach((p) => { mirror.style[p] = cs[p]; });

    mirror.style.borderStyle = "solid";
    mirror.style.borderColor = "transparent";

    if (isSingleLine) {
      mirror.classList.add("wf-limit__mirror--single");
      mirror.style.overflow = "hidden";
    }
  }

  function buildMirror(field) {
    const fieldWrap = ensureFieldWrap(field);
    let mirror = fieldWrap.querySelector(".wf-limit__mirror");
    const isSingleLine = field.tagName === "INPUT";

    if (!mirror) {
      mirror = document.createElement("div");
      mirror.className = "wf-limit__mirror";
      fieldWrap.insertBefore(mirror, field);

      field.classList.add("wf-limit__field");

      if (field.tagName === "TEXTAREA") {
        field.addEventListener("scroll", () => {
          mirror.scrollTop = field.scrollTop;
          mirror.scrollLeft = field.scrollLeft;
        }, { passive: true });
      }
    }

    function sync() {
      copyFieldStylesToMirror(field, mirror, isSingleLine);
      mirror.style.width = field.clientWidth + "px";
      mirror.style.height = field.clientHeight + "px";
    }

    function render(max, softMode) {
      const val = field.value || "";
      const safeVal = val.replace(/\n$/g, "\n ");

      if (!softMode) {
        mirror.innerHTML = escapeHTML(safeVal);
        return;
      }

      const len = val.length;
      if (len <= max) {
        mirror.innerHTML = escapeHTML(safeVal);
        return;
      }

      const okPart = safeVal.slice(0, max);
      const overPart = safeVal.slice(max);

      mirror.innerHTML =
        escapeHTML(okPart) +
        '<span class="wf-limit__overflow">' + escapeHTML(overPart) + "</span>";
    }

    sync();

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => sync());
      ro.observe(field);
    } else {
      window.addEventListener("resize", sync);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => sync()).catch(() => {});
    }

    return { sync, render };
  }

  // ====== COUNTERS ======
  function getCounters(wrap) {
    return Array.from(wrap.querySelectorAll(`[${COUNTER_ATTR}]`));
  }

  function resolveCounterShowRatio(wrap, counterEl) {
    const own = counterEl.getAttribute(COUNTER_SHOW_ATTR);
    const wrapVal = wrap.getAttribute(COUNTER_SHOW_ATTR);
    return parseRatio(own != null ? own : wrapVal);
  }

  function setCounterState(counterEl, max, len) {
    const remaining = max - len;
    counterEl.classList.remove("wf-counter--ok", "wf-counter--warn", "wf-counter--over");

    if (remaining < 0) counterEl.classList.add("wf-counter--over");
    else if (max && (remaining / max) <= WARN_AT_RATIO_DEFAULT) counterEl.classList.add("wf-counter--warn");
    else counterEl.classList.add("wf-counter--ok");
  }

  function updateOneCounter(counterEl, max, len, showRatio) {
    if (!counterEl) return;

    if (showRatio != null) {
      const usedRatio = max ? len / max : 0;
      if (usedRatio >= showRatio) counterEl.classList.remove("wf-limit__counter-hidden");
      else counterEl.classList.add("wf-limit__counter-hidden");
    } else {
      counterEl.classList.remove("wf-limit__counter-hidden");
    }

    setCounterState(counterEl, max, len);

    const remaining = max - len;

    const remNode = counterEl.querySelector(`[${REMAINING_ATTR}]`);
    const maxNode = counterEl.querySelector(`[${MAX_ATTR}]`);
    if (remNode) remNode.textContent = String(remaining);
    if (maxNode) maxNode.textContent = String(max);

    const formatEl = counterEl.hasAttribute(FORMAT_ATTR)
      ? counterEl
      : counterEl.querySelector(`[${FORMAT_ATTR}]`);

    if (formatEl) {
      const tpl = formatEl.getAttribute(FORMAT_ATTR) || "";
      formatEl.textContent = tpl
        .replaceAll("{remaining}", String(remaining))
        .replaceAll("{max}", String(max))
        .replaceAll("{used}", String(len));
    }
  }

  function updateCountersForField(wrap, field, max, len, totalFieldsCount) {
    const counters = getCounters(wrap);
    if (!counters.length) return;

    const key = getFieldKey(field);

    counters.forEach((c) => {
      const forKey = (c.getAttribute(COUNTER_FOR_ATTR) || "").trim();
      const showRatio = resolveCounterShowRatio(wrap, c);

      if (totalFieldsCount > 1) {
        if (!forKey) return;
        if (!key || forKey !== key) return;
        updateOneCounter(c, max, len, showRatio);
        return;
      }

      if (!forKey || (key && forKey === key)) {
        updateOneCounter(c, max, len, showRatio);
      }
    });
  }

  // ====== CTA / SUBMIT ======
  function setCTAState(wrap, disable) {
    const ctas = wrap.querySelectorAll(`[${CTA_ATTR}]`);
    if (!ctas.length) return;

    ctas.forEach((cta) => {
      const isButton = cta.tagName === "BUTTON";
      const isSubmitInput = cta.tagName === "INPUT" && /submit|button/i.test(cta.type || "");

      if (disable) {
        cta.classList.add("wf-limit__cta-disabled");
        cta.setAttribute("aria-disabled", "true");
        if (isButton || isSubmitInput) cta.disabled = true;
      } else {
        cta.classList.remove("wf-limit__cta-disabled");
        cta.removeAttribute("aria-disabled");
        if (isButton || isSubmitInput) cta.disabled = false;
      }
    });
  }

  function attachSubmitBlockIfFormExists(wrap, controllers) {
    const form = wrap.matches("form") ? wrap : wrap.querySelector("form");
    if (!form) return;

    if (form.hasAttribute(STORE_INIT_ATTR + "-form")) return;
    form.setAttribute(STORE_INIT_ATTR + "-form", "1");

    form.addEventListener("submit", (e) => {
      let anyOverSoft = false;
      let firstOverField = null;

      controllers.forEach((c) => {
        const mode = resolveMode(wrap, c.field);
        if (mode !== "soft") return;

        const len = (c.field.value || "").length;
        if (len > c.max) {
          anyOverSoft = true;
          if (!firstOverField) firstOverField = c.field;
        }
      });

      if (!anyOverSoft) return;

      e.preventDefault();
      e.stopPropagation();

      if (wantsNativeBubble(wrap)) {
        controllers.forEach((c) => {
          const mode = resolveMode(wrap, c.field);
          if (mode !== "soft") {
            c.field.setCustomValidity("");
            return;
          }
          const len = (c.field.value || "").length;
          if (len > c.max) c.field.setCustomValidity("Too many characters.");
          else c.field.setCustomValidity("");
        });

        if (typeof form.reportValidity === "function") form.reportValidity();
      } else {
        if (firstOverField) firstOverField.focus();
      }
    }, true);
  }

  // ====== INIT WRAP ======
  function initWrap(wrap) {
    if (wrap.hasAttribute(STORE_INIT_ATTR)) return;

    const fields = findFieldsWithMax(wrap);
    if (!fields.length) return;

    wrap.setAttribute(STORE_INIT_ATTR, "1");

    fields.forEach((field) => applyModeToField(wrap, field));

    const controllers = fields.map((field) => {
      const max = getMax(field);
      if (!max) return null;

      const mirrorCtl = buildMirror(field);

      const c = { field, max, mirrorCtl, update: function () {} };

      const onAnyInput = () => c.update();
      field.addEventListener("input", onAnyInput);
      field.addEventListener("change", onAnyInput);
      field.addEventListener("keyup", onAnyInput);
      field.addEventListener("compositionend", onAnyInput);

      return c;
    }).filter(Boolean);

    function computeAnyOverSoft() {
      return controllers.some((c) => {
        const mode = resolveMode(wrap, c.field);
        if (mode !== "soft") return false;
        return ((c.field.value || "").length > c.max);
      });
    }

    function updateAggregateCTA() {
      setCTAState(wrap, computeAnyOverSoft());
    }

    controllers.forEach((c) => {
      c.update = function () {
        const mode = resolveMode(wrap, c.field);

        c.mirrorCtl.sync();

        const val = c.field.value || "";
        const len = val.length;

        c.mirrorCtl.render(c.max, mode === "soft");

        updateCountersForField(wrap, c.field, c.max, len, controllers.length);

        if (wantsNativeBubble(wrap) && mode === "soft") {
          if (len > c.max) c.field.setCustomValidity("Too many characters.");
          else c.field.setCustomValidity("");
        } else {
          c.field.setCustomValidity("");
        }

        updateAggregateCTA();
      };

      c.update();
    });

    attachSubmitBlockIfFormExists(wrap, controllers);

    window.addEventListener("resize", () => {
      controllers.forEach((c) => c.update());
    });
  }

  function initAll() {
    injectCSSOnce();
    document.querySelectorAll(`[${WRAP_ATTR}="${WRAP_VALUE}"]`).forEach(initWrap);
  }

  if (document.readyState === "complete") initAll();
  else window.addEventListener("load", initAll, { once: true });

})();