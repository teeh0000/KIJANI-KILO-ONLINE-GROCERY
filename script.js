/* =========================================================
   KIJANI KILO | HEADER + FOOTER BEHAVIOUR
   ========================================================= */
(() => {
  'use strict';

  const header       = document.getElementById('siteHeader');
  const burger       = document.getElementById('burger');
  const mobileMenu   = document.getElementById('mobileMenu');
  const searchToggle = document.getElementById('searchToggle');
  const searchPanel  = document.getElementById('searchPanel');
  const searchInput  = document.getElementById('searchInput');
  const cartBadge    = document.getElementById('cartBadge');
  const dropdowns    = document.querySelectorAll('.has-dropdown');

  /* ---------------------------------------------------------
     1. Header: static at the top, floating island after scroll
     Two thresholds (40 down / 10 up) stop it flickering when
     you stop scrolling right on the edge.
     --------------------------------------------------------- */
  const FLOAT_AT = 40;
  const SETTLE_AT = 10;
  let floating = false;
  let ticking = false;

  const updateHeader = () => {
    const y = window.scrollY;
    if (!floating && y > FLOAT_AT) {
      floating = true;
      header.classList.add('is-floating');
    } else if (floating && y < SETTLE_AT) {
      floating = false;
      header.classList.remove('is-floating');
    }
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });

  updateHeader(); // correct state if the page loads already scrolled


  /* ---------------------------------------------------------
     2. Open/close helpers for the three pop-over panels
     --------------------------------------------------------- */
  const setMobileMenu = (open) => {
    mobileMenu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  const setSearch = (open) => {
    searchPanel.classList.toggle('open', open);
    searchToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      setMobileMenu(false);
      // wait for the panel to become visible before focusing
      setTimeout(() => searchInput.focus(), 60);
    }
  };

  const closeDropdowns = (except) => {
    dropdowns.forEach((dd) => {
      if (dd === except) return;
      dd.classList.remove('open');
      dd.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
    });
  };

  const closeAll = () => {
    setMobileMenu(false);
    setSearch(false);
    closeDropdowns();
  };


  /* ---------------------------------------------------------
     3. Event wiring
     --------------------------------------------------------- */
  burger.addEventListener('click', () => {
    const open = !mobileMenu.classList.contains('open');
    setSearch(false);
    setMobileMenu(open);
  });

  searchToggle.addEventListener('click', () => {
    setSearch(!searchPanel.classList.contains('open'));
  });

  dropdowns.forEach((dd) => {
    const toggle = dd.querySelector('.dropdown-toggle');
    toggle.addEventListener('click', () => {
      const open = !dd.classList.contains('open');
      closeDropdowns(dd);
      dd.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
  });

  // Close panels when a link inside the mobile menu is tapped
  mobileMenu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMobileMenu(false);
  });

  // Close when clicking anywhere outside the header
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav')) closeAll();
  });

  // Close with the Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });

  // If the window grows past the mobile breakpoint, tidy up
  window.matchMedia('(min-width: 1061px)').addEventListener('change', (e) => {
    if (e.matches) setMobileMenu(false);
  });

  // Search form: connect this to your real search page / API later
  searchPanel.addEventListener('submit', (e) => {
    e.preventDefault();
    const term = searchInput.value.trim();
    if (!term) return;
    // Example: window.location.href = `/shop?search=${encodeURIComponent(term)}`;
    console.log('Search for:', term);
    setSearch(false);
  });


  /* ---------------------------------------------------------
     4. Highlight the nav link of the section you are viewing
     (works with the #home, #shop, #offers... demo sections)
     --------------------------------------------------------- */
  const navLinks = document.querySelectorAll('.nav-links > ul > li > a[href^="#"], .mobile-menu a[href^="#"]');
  const sections = [...document.querySelectorAll('main > section[id]')];

  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = '#' + entry.target.id;
        navLinks.forEach((a) => {
          if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'page');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }


  /* ---------------------------------------------------------
     5. Cart badge: call this from your shop code
        KijaniKilo.setCartCount(3);
     --------------------------------------------------------- */
  window.KijaniKilo = {
    setCartCount(n) {
      const count = Math.max(0, Number(n) || 0);
      cartBadge.textContent = count > 99 ? '99+' : String(count);
      cartBadge.hidden = count === 0;
      cartBadge.classList.remove('bump');
      void cartBadge.offsetWidth;          // restart the animation
      if (count > 0) cartBadge.classList.add('bump');
    }
  };


  /* ---------------------------------------------------------
     6. Footer: current year
     --------------------------------------------------------- */
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();


  /* ---------------------------------------------------------
     7. Show how many items are in the crate on every page
     (the crate itself lives on shop.html)
     --------------------------------------------------------- */
  try {
    const saved = JSON.parse(localStorage.getItem('kk_crate') || '{}');
    const n = Object.keys(saved).length;
    if (n) window.KijaniKilo.setCartCount(n);
  } catch (e) { /* storage unavailable */ }
})();
