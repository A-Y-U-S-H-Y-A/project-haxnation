// Haxnation Backstage - front-end branding helpers
// (c) Haxnation. Loaded by every page in the portal.
(function () {
  const BRAND = 'HAXNATION';
  const TAGLINE = 'own the night.';
  function paint() {
    document.querySelectorAll('[data-brand]').forEach(function (el) {
      el.textContent = BRAND;
    });
    const t = document.querySelector('[data-tagline]');
    if (t) t.textContent = TAGLINE;
  }
  if (document.readyState !== 'loading') paint();
  else document.addEventListener('DOMContentLoaded', paint);
})();
