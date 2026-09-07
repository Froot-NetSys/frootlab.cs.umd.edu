(function () {
  var menuButton = document.querySelector('.menu-toggle');
  var nav = document.getElementById('primary-nav');

  if (!menuButton || !nav) {
    return;
  }

  menuButton.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
})();
