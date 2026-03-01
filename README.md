# WF Character Limit Controller

Attribute-driven character limit & counter system for Webflow and HTML with hard/soft modes, overflow highlighting, and form control.

---

## ✨ Why WF Character Limit?

- **Vanilla JS, zero deps** – Drop it into any Webflow project or plain HTML site.  
- **Attribute-driven configuration** – Control behavior directly from Webflow custom attributes.  
- **Hard & Soft modes** – Enforce native `maxlength` or allow overflow with visual feedback.  
- **Real-time character counter** – Instantly updates `{remaining}`, `{used}`, and `{max}` while typing.  
- **Overflow highlighting** – In soft mode, only excess characters are visually marked.  
- **CTA control** – Automatically disables buttons or links when limits are exceeded.  
- **Form protection** – Blocks submission when soft fields exceed limits (optional native validation bubble).  
- **Multi-field support** – Manage multiple inputs and counters inside a single wrapper.  
- **Per-field overrides** – Override wrapper mode for specific inputs when needed.  
- **Threshold-based counter reveal** – Show counters only after a defined usage percentage.  
- **Flexible formatting** – Use template tokens or custom counter node structures.  
- **Webflow-friendly** – Works seamlessly with Webflow forms and styling system.  
- **Accessible by default** – Preserves native input behavior and validation semantics.  
- **Maintainable** – Clean architecture, minimal API surface, framework-independent.

---

### Attribute-Driven Character Limit System (Webflow-First)

WF Limit is a lightweight, attribute-driven solution for managing
character limits in `input` and `textarea` fields.

It supports:

-   Hard and Soft limit modes
-   Per-field mode override
-   Remaining character counters
-   Threshold-based counter reveal
-   Overflow highlighting (soft mode)
-   CTA disabling
-   Form submission blocking
-   Multi-field + multi-counter mapping
-   Native browser validation (optional)

------------------------------------------------------------------------

# 🚀 Quick Start

1.  Add the WF Limit script before `</body>`.
2.  Wrap your fields:

``` html
<div data-wf-limit="wrap">
  <textarea name="message" maxlength="300"></textarea>
  <div data-wf-limit-counter data-wf-limit-format="{remaining}/{max}"></div>
</div>
```

That's it.

The script activates automatically if at least one field inside the
wrapper has a valid `maxlength`.

------------------------------------------------------------------------

# 🧱 Activation Rule

WF Limit activates **only if**:

-   Inside `data-wf-limit="wrap"`
-   There is at least one `input` or `textarea`
-   That field has a valid numeric `maxlength` (\> 0)

If no valid `maxlength` exists, the script does nothing.

------------------------------------------------------------------------

# 🎛 Modes

## Default Mode: HARD

If no mode is specified, default is:

    hard

### Hard Mode

-   Enforces native `maxlength`
-   User cannot exceed limit
-   No overflow highlight
-   No CTA disable needed

### Soft Mode

    data-wf-limit-mode="soft"

-   Allows typing beyond limit
-   Overflow text highlighted
-   CTA disabled when over limit
-   Form submission blocked

------------------------------------------------------------------------

# 🔄 Mode Resolution Priority

Mode is resolved per field:

1.  `data-wf-limit-mode` on field
2.  `data-wf-limit-mode` on wrapper
3.  Default = `hard`

Example:

``` html
<div data-wf-limit="wrap" data-wf-limit-mode="soft">
  <input name="title" maxlength="60" data-wf-limit-mode="hard">
  <textarea name="description" maxlength="500"></textarea>
</div>
```

------------------------------------------------------------------------

# 🔢 Counter System

Mark any element as counter:

``` html
<div data-wf-limit-counter></div>
```

## Format Template

    data-wf-limit-format="Remaining: {remaining}/{max}"

Supported tokens:

-   `{remaining}`
-   `{max}`
-   `{used}`

Example:

``` html
<div data-wf-limit-counter data-wf-limit-format="{used}/{max}"></div>
```

------------------------------------------------------------------------

# 👥 Multi-Field Support

If multiple fields exist inside wrapper:

Counters must declare mapping:

    data-wf-limit-for="message"

Field key resolution order:

1.  `data-wf-limit-key`
2.  `name`
3.  `id`

------------------------------------------------------------------------

# 👁 Counter Reveal Threshold

Reveal counter only after X% usage:

    data-wf-limit-counter-show="80%"
    data-wf-limit-counter-show="0.8"

Can be placed on: - Wrapper (global) - Counter (overrides wrapper)

------------------------------------------------------------------------

# 🔘 CTA Disable

Mark buttons/links:

    data-wf-limit-cta

In Soft mode, if any field exceeds limit: - Button becomes disabled -
Non-button elements get `wf-limit__cta-disabled`

------------------------------------------------------------------------

# 🧾 Native Browser Validation

Disabled by default.

Enable per wrapper:

    data-wf-limit-native-bubble="true"

------------------------------------------------------------------------

# 🎨 Counter State Classes

You style these:

-   `wf-counter--ok`
-   `wf-counter--warn`
-   `wf-counter--over`

Example:

``` css
.wf-counter--warn { color: orange; }
.wf-counter--over { color: red; }
```

------------------------------------------------------------------------

# 🧠 Behavior Summary

  Mode   Can exceed?   Highlight   Disable CTA   Block Submit
  ------ ------------- ----------- ------------- --------------
  hard   No            No          No            No
  soft   Yes           Yes         Yes           Yes

------------------------------------------------------------------------

# 🛠 Best Practices (Webflow)

-   Always explicitly set `maxlength`
-   Prefer using `name` attributes for mapping
-   Use soft mode only when UX requires overflow highlight
-   Style counter using state classes
-   Avoid permanent `display:none`; use threshold system instead

------------------------------------------------------------------------

## 📝 License

[MIT](LICENSE.md)

