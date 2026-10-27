/**
 * CLR 0 (Customizer, Customize tab, colors flow start) behaviour.
 * Framework-free: the project has no framework. Each module below owns one
 * interaction from the design spec's Interactions table or the development
 * standard's component contracts.
 */
(function () {
  'use strict';

  var forEach = Array.prototype.forEach;

  /* -------------------------------------------------------------------------
   * Hover-only reactions need a touch and keyboard path. Calls `toggle` on a
   * click that came from touch, pen, or keyboard activation (detail 0); a
   * mouse click is ignored because the mouse already has hover.
   * ---------------------------------------------------------------------- */
  function onNonMouseClick(element, toggle) {
    var pointerType = null;
    element.addEventListener('pointerdown', function (event) {
      pointerType = event.pointerType;
    });
    element.addEventListener('click', function (event) {
      var fromKeyboard = event.detail === 0 && pointerType === null;
      var fromTouch = pointerType === 'touch' || pointerType === 'pen';
      pointerType = null;
      if (fromKeyboard || fromTouch) toggle();
    });
  }

  /* -------------------------------------------------------------------------
   * Organization select: placeholder colour while nothing is chosen
   * ---------------------------------------------------------------------- */
  function initOrganizationSelect() {
    var select = document.getElementById('organization');
    if (!select) return;

    function update() {
      select.classList.toggle('is-placeholder', select.value === '');
    }

    select.addEventListener('change', update);
    update();
  }

  /* -------------------------------------------------------------------------
   * Colors In Use tiles (ON_HOVER -> Hover=On variant). Hover and keyboard
   * focus are handled in CSS; a tap or keyboard activation toggles the same
   * variant (is-active). A mouse click does not pin it.
   * Tiles with click wiring (the Orange tile opens the picker) are excluded.
   * ---------------------------------------------------------------------- */
  function initColorTiles() {
    var tiles = document.querySelectorAll('.color-tile:not(.color-tile--add):not([aria-controls])');
    forEach.call(tiles, function (tile) {
      onNonMouseClick(tile, function () {
        tile.classList.toggle('is-active');
      });
    });
  }

  /* -------------------------------------------------------------------------
   * Generic popover: open on trigger click, close on Escape, click outside,
   * or Tab out; focus moves into the popover and back to the trigger.
   * ---------------------------------------------------------------------- */
  function createPopover(trigger, popover, options) {
    var isOpen = false;

    function onOutsidePointer(event) {
      if (popover.contains(event.target) || trigger.contains(event.target)) return;
      close(false);
    }

    function open() {
      isOpen = true;
      popover.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('pointerdown', onOutsidePointer);
      if (options.onOpen) options.onOpen();
    }

    function close(returnFocus) {
      if (!isOpen) return;
      isOpen = false;
      popover.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', onOutsidePointer);
      if (returnFocus) trigger.focus();
    }

    trigger.addEventListener('click', function () {
      if (isOpen) {
        close(true);
      } else {
        open();
      }
    });

    popover.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      } else if (event.key === 'Tab') {
        close(false);
      }
    });

    return { open: open, close: close };
  }

  /* -------------------------------------------------------------------------
   * Color picker overlay (ON_CLICK on the Orange tile -> OVERLAY color picker,
   * offset -152 / 36 from the tile, CLOSE_ON_CLICK_OUTSIDE). The tiles are
   * native radios, so Arrow keys move the selection.
   * ---------------------------------------------------------------------- */
  function initColorPicker() {
    var picker = document.getElementById('color-picker');
    var trigger = document.querySelector('[aria-controls="color-picker"]');
    if (!picker || !trigger) return;

    createPopover(trigger, picker, {
      onOpen: function () {
        var current = picker.querySelector('input:checked') || picker.querySelector('input');
        if (current) current.focus();
      }
    });
  }

  /* -------------------------------------------------------------------------
   * Brand Location listbox (ON_CLICK on the Location field -> OVERLAY Brand
   * Location, offset 0 / 56, CLOSE_ON_CLICK_OUTSIDE). WAI-ARIA listbox keys:
   * Arrow Up/Down, Home/End move; Enter/Space choose; Escape closes.
   * ---------------------------------------------------------------------- */
  function initLocationListbox() {
    var trigger = document.getElementById('location');
    var list = document.getElementById('location-list');
    var value = document.getElementById('location-value');
    if (!trigger || !list || !value) return;

    var options = Array.prototype.slice.call(list.querySelectorAll('[role="option"]'));

    function selectedIndex() {
      for (var i = 0; i < options.length; i += 1) {
        if (options[i].getAttribute('aria-selected') === 'true') return i;
      }
      return 0;
    }

    function focusOption(index) {
      options.forEach(function (option, i) {
        option.tabIndex = i === index ? 0 : -1;
      });
      options[index].focus();
    }

    var popover = createPopover(trigger, list, {
      onOpen: function () {
        focusOption(selectedIndex());
      }
    });

    function choose(index) {
      options.forEach(function (option, i) {
        option.setAttribute('aria-selected', String(i === index));
      });
      var name = options[index].querySelector('[data-option-name]') || options[index];
      value.textContent = name.textContent;
      popover.close(true);
    }

    list.addEventListener('keydown', function (event) {
      var index = options.indexOf(document.activeElement);
      var next;
      if (event.key === 'ArrowDown') next = Math.min(index + 1, options.length - 1);
      if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = options.length - 1;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (index >= 0) choose(index);
        return;
      }
      if (next === undefined) return;
      event.preventDefault();
      focusOption(next);
    });

    options.forEach(function (option, index) {
      option.addEventListener('click', function () {
        choose(index);
      });
    });
  }

  /* -------------------------------------------------------------------------
   * Body / Sleeves rows (ON_HOVER -> OVERLAY body hover / sleeve hover on the
   * jersey, shown only while hovered). Keyboard focus shows the same overlay;
   * a tap or keyboard activation toggles it (is-active). A mouse click does
   * not pin it.
   * ---------------------------------------------------------------------- */
  function initHighlightRows() {
    var rows = document.querySelectorAll('[data-highlight]');
    forEach.call(rows, function (row) {
      var overlay = document.getElementById(row.getAttribute('data-highlight'));
      if (!overlay) return;

      function show() {
        overlay.hidden = false;
      }

      function hide() {
        if (!row.classList.contains('is-active')) overlay.hidden = true;
      }

      row.addEventListener('mouseenter', show);
      row.addEventListener('mouseleave', hide);
      row.addEventListener('focus', function () {
        if (row.matches(':focus-visible')) show();
      });
      row.addEventListener('blur', hide);
      onNonMouseClick(row, function () {
        var active = row.classList.toggle('is-active');
        overlay.hidden = !active;
      });
    });
  }

  /* -------------------------------------------------------------------------
   * View thumbnails: default view-switcher behaviour (not prototyped). The
   * pressed thumbnail's image becomes the main jersey view.
   * ---------------------------------------------------------------------- */
  function initViewThumbs() {
    var main = document.getElementById('jersey-view');
    var buttons = document.querySelectorAll('.view-thumbs__item');
    if (!main || !buttons.length) return;

    forEach.call(buttons, function (button) {
      button.addEventListener('click', function () {
        var image = button.querySelector('img');
        main.src = image.getAttribute('src');
        main.alt = 'Astros set-in full button jersey, ' + button.getAttribute('data-view');
        forEach.call(buttons, function (other) {
          other.setAttribute('aria-pressed', String(other === button));
        });
      });
    });
  }

  initOrganizationSelect();
  initColorTiles();
  initColorPicker();
  initLocationListbox();
  initHighlightRows();
  initViewThumbs();
})();
