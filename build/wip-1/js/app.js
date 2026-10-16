/**
 * WIP 1 (Work In Progress, Main Queue) behaviour.
 * Framework-free: the project has no framework. Each module below owns one
 * interaction from the design spec's Interactions table or the development
 * standard's component contracts.
 */
(function () {
  'use strict';

  /* -------------------------------------------------------------------------
   * Pill tabs (WAI-ARIA tabs contract: roving tabindex, Left/Right arrows)
   * ---------------------------------------------------------------------- */
  function initTabs() {
    var tablist = document.querySelector('[role="tablist"]');
    if (!tablist) return;
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));

    function select(tab) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel && selected) panel.setAttribute('aria-labelledby', t.id);
      });
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () {
        select(tab);
      });
      tab.addEventListener('keydown', function (event) {
        var next;
        if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
        if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
        if (event.key === 'Home') next = tabs[0];
        if (event.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        event.preventDefault();
        select(next);
        next.focus();
      });
    });
  }

  /* -------------------------------------------------------------------------
   * Queue item expand / collapse (Collapse=On state, WIP 2)
   * ---------------------------------------------------------------------- */
  function initQueueExpand() {
    var toggles = document.querySelectorAll('.queue-item__number[aria-controls]');
    Array.prototype.forEach.call(toggles, function (toggle) {
      toggle.addEventListener('click', function () {
        var expanded = toggle.getAttribute('aria-expanded') === 'true';
        var tile = toggle.closest('.queue-item').querySelector('.order-tile');
        toggle.setAttribute('aria-expanded', String(!expanded));
        tile.classList.toggle('order-tile--expanded', !expanded);
      });
    });
  }

  /* -------------------------------------------------------------------------
   * Side nav disclosure (Services group chevron, nested sub nav)
   * ---------------------------------------------------------------------- */
  function initSideNavDisclosure() {
    var buttons = document.querySelectorAll('.side-nav__item[aria-expanded]');
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener('click', function () {
        var expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
      });
    });
  }

  /* -------------------------------------------------------------------------
   * Priority dropdown overlay (ON_CLICK on priority badge -> OVERLAY
   * priority dropdown, offset x -16 / y 25 from the badge). One menu element
   * is shared by every row and moved next to the badge that opened it.
   * ---------------------------------------------------------------------- */
  function initPriorityDropdown() {
    var menu = document.getElementById('priority-menu');
    if (!menu) return;
    var options = Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'));
    var opener = null;

    function close(returnFocus) {
      if (!opener) return;
      menu.hidden = true;
      opener.setAttribute('aria-expanded', 'false');
      if (returnFocus) opener.focus();
      opener = null;
      document.removeEventListener('pointerdown', onOutsidePointer);
    }

    function open(badge) {
      if (opener && opener !== badge) close(false);
      opener = badge;
      badge.parentNode.appendChild(menu);
      menu.hidden = false;
      badge.setAttribute('aria-expanded', 'true');
      options[0].focus();
      document.addEventListener('pointerdown', onOutsidePointer);
    }

    function onOutsidePointer(event) {
      if (menu.contains(event.target) || (opener && opener.contains(event.target))) return;
      close(false);
    }

    document.addEventListener('click', function (event) {
      var badge = event.target.closest('.priority-badge[aria-controls="priority-menu"]');
      if (!badge) return;
      if (opener === badge) {
        close(true);
      } else {
        open(badge);
      }
    });

    menu.addEventListener('keydown', function (event) {
      var index = options.indexOf(document.activeElement);
      var next;
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
        return;
      }
      if (event.key === 'ArrowDown') next = options[(index + 1) % options.length];
      if (event.key === 'ArrowUp') next = options[(index - 1 + options.length) % options.length];
      if (event.key === 'Home') next = options[0];
      if (event.key === 'End') next = options[options.length - 1];
      if (event.key === 'Tab') close(false);
      if (!next) return;
      event.preventDefault();
      next.focus();
    });

    options.forEach(function (option) {
      option.addEventListener('click', function () {
        var badge = opener;
        var oldPriority = badge.firstChild.textContent.trim();
        var newPriority = option.textContent.trim();
        close(false);
        openChangePriority(badge, oldPriority, newPriority);
      });
    });
  }

  /* -------------------------------------------------------------------------
   * Modals (native <dialog>: focus trap, Escape, focus return)
   * ---------------------------------------------------------------------- */
  function openDialog(dialog) {
    if (!dialog) return;
    dialog.returnValue = '';
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function openChangePriority(returnTo, oldPriority, newPriority) {
    var dialog = document.getElementById('change-priority-modal');
    if (!dialog) return;
    dialog.querySelector('[data-old-priority]').textContent = oldPriority;
    dialog.querySelector('[data-new-priority]').textContent = newPriority;
    openDialog(dialog);
    dialog.addEventListener('close', function onClose() {
      dialog.removeEventListener('close', onClose);
      if (returnTo) returnTo.focus();
    });
  }

  function initModalOpeners() {
    var openers = document.querySelectorAll('[data-opens]');
    Array.prototype.forEach.call(openers, function (opener) {
      opener.addEventListener('click', function () {
        openDialog(document.getElementById(opener.getAttribute('data-opens')));
      });
    });
  }

  // Close (X) buttons dismiss without submitting; a confirmed submit
  // ("Add To Flow", returnValue "confirm") navigates to Processes 2.
  // processes-2.html is a documented placeholder for that route.
  function initModalDismissAndConfirm() {
    var dialogs = document.querySelectorAll('dialog.modal');
    Array.prototype.forEach.call(dialogs, function (dialog) {
      Array.prototype.forEach.call(dialog.querySelectorAll('[data-dismiss]'), function (button) {
        button.addEventListener('click', function () {
          dialog.close();
        });
      });
      dialog.addEventListener('close', function () {
        if (dialog.returnValue === 'confirm') {
          window.location.assign('processes-2.html');
        }
      });
    });
  }

  initTabs();
  initQueueExpand();
  initSideNavDisclosure();
  initPriorityDropdown();
  initModalOpeners();
  initModalDismissAndConfirm();
})();
