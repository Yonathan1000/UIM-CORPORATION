/* ============================================================
   UIM CORPORATION — JavaScript
   GSAP ScrollTrigger + Video Scrubbing + Animations
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap !== 'undefined') {
    if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
    if (typeof ScrollToPlugin !== 'undefined') gsap.registerPlugin(ScrollToPlugin);
  }

  // ---- NAVBAR ----
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 80);
  });

  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });

  // Close mobile menu on link click
  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // ---- ACTIVE NAV LINK TRACKING ----
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[data-section]');

  function updateActiveNav() {
    const scrollPos = window.scrollY + 200;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.dataset.section === id);
        });
      }
    });
  }
  window.addEventListener('scroll', updateActiveNav);

  // ---- HERO SCROLL-DRIVEN BUILD (TRUE GSAP PHYSICS SCRUB) ----
  const heroStage = document.querySelector('.hero-scroll-stage');
  const heroVideo = document.getElementById('heroVideo');
  const phases = document.querySelectorAll('.phase-content');
  const hudLabel = document.getElementById('hudLabel');
  const hudPercent = document.getElementById('hudPercent');
  const hudOverlay = document.querySelector('.hud-overlay');

  const phaseData = [
    { name: 'FASE 1 : INICIO', start: 0, end: 0.14 },
    { name: 'FASE 2 : CIMIENTOS', start: 0.14, end: 0.28 },
    { name: 'FASE 3 : ESTRUCTURA', start: 0.28, end: 0.42 },
    { name: 'FASE 4 : FACHADA', start: 0.42, end: 0.56 },
    { name: 'FASE 5 : EXTERIOR', start: 0.56, end: 0.70 },
    { name: 'FASE 6 : INTERIORES', start: 0.70, end: 0.84 },
    { name: 'FASE 7 : ENTREGA', start: 0.84, end: 0.94 },
  ];

  let targetVideoTime = 0;
  let isVideoSeeking = false;
  let rafId = null;

  // Preload video directly into in-memory Blob for instant seeking without network lag
  if (heroVideo) {
    heroVideo.pause();

    const primeFirstFrame = () => {
      if (heroVideo.currentTime === 0) {
        heroVideo.currentTime = 0.001;
      }
    };
    heroVideo.addEventListener('loadeddata', primeFirstFrame, { once: true });
    if (heroVideo.readyState >= 2) primeFirstFrame();

    fetch('assets/hero-construction.mp4')
      .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.blob();
      })
      .then(blob => {
        const currentTime = heroVideo.currentTime || 0.001;
        const blobUrl = URL.createObjectURL(blob);
        heroVideo.src = blobUrl;
        heroVideo.addEventListener('loadedmetadata', () => {
          heroVideo.currentTime = currentTime;
        }, { once: true });
        heroVideo.load();
      })
      .catch(() => {
        // Fallback to static src
      });

    heroVideo.addEventListener('seeked', () => {
      isVideoSeeking = false;
      if (heroVideo.duration && Math.abs(heroVideo.currentTime - targetVideoTime) > 0.05) {
        isVideoSeeking = true;
        if (heroVideo.fastSeek) heroVideo.fastSeek(targetVideoTime);
        else heroVideo.currentTime = targetVideoTime;
      }
    });
  }

  function applyVideoSeek() {
    if (!heroVideo || !heroVideo.duration) return;
    if (!isVideoSeeking) {
      isVideoSeeking = true;
      if (heroVideo.fastSeek) {
        heroVideo.fastSeek(targetVideoTime);
      } else {
        heroVideo.currentTime = targetVideoTime;
      }
    }
  }

  if (heroVideo && heroVideo.readyState >= 1) {
    setupVideoScrub();
  } else if (heroVideo) {
    heroVideo.addEventListener('loadedmetadata', setupVideoScrub);
    setTimeout(() => {
      if (!heroVideo.duration) setupPhasesOnly();
    }, 1500);
  } else {
    setupPhasesOnly();
  }

  function setupVideoScrub() {
    const duration = heroVideo.duration || 8;
    const playhead = { frame: 0, progress: 0 };

    // Tween playhead with scrub: 1.8 for true physics-based weighted inertia & latency
    gsap.to(playhead, {
      frame: duration,
      progress: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: heroStage,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.8, // Generous, buttery cinematic latency requested by user
        onUpdate: () => {
          targetVideoTime = playhead.frame;
          if (!rafId) {
            rafId = requestAnimationFrame(() => {
              applyVideoSeek();
              rafId = null;
            });
          }
          updatePhases(playhead.progress);
        }
      }
    });
  }

  function setupPhasesOnly() {
    const playhead = { progress: 0 };
    gsap.to(playhead, {
      progress: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: heroStage,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.8,
        onUpdate: () => {
          updatePhases(playhead.progress);
        }
      }
    });
  }

  function updatePhases(progress) {
    // If we're past 95% of hero, HIDE all phases immediately so Phase 7 never lingers!
    if (progress >= 0.95 || progress < 0) {
      phases.forEach(phase => phase.classList.remove('active'));
      if (hudOverlay) hudOverlay.classList.add('hidden');
      return;
    }

    // Update HUD
    const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));
    hudPercent.textContent = percent + '%';

    // Find active phase
    let activeIndex = -1;
    for (let i = 0; i < phaseData.length; i++) {
      if (progress >= phaseData[i].start && progress < phaseData[i].end) {
        activeIndex = i;
        break;
      }
    }

    if (activeIndex >= 0) {
      hudLabel.textContent = phaseData[activeIndex].name;
      if (hudOverlay) hudOverlay.classList.remove('hidden');
    } else {
      if (hudOverlay) hudOverlay.classList.add('hidden');
    }

    // Show/hide phases
    phases.forEach((phase) => {
      const phaseIndex = parseInt(phase.dataset.phase) - 1;
      if (activeIndex >= 0 && phaseIndex === activeIndex) {
        phase.classList.add('active');
      } else {
        phase.classList.remove('active');
      }
    });
  }

  // Show/hide HUD and phases based on hero visibility
  ScrollTrigger.create({
    trigger: heroStage,
    start: 'top top',
    end: 'bottom bottom',
    onLeave: () => {
      hudOverlay?.classList.add('hidden');
      phases.forEach(p => p.classList.remove('active'));
    },
    onLeaveBack: () => {
      updatePhases(0);
    },
    onEnterBack: () => {
      hudOverlay?.classList.remove('hidden');
      updatePhases(0.90);
    },
  });

  // ---- REPLAY BUTTON ----
  const replayBtn = document.getElementById('replayBtn');
  replayBtn?.addEventListener('click', () => {
    if (typeof gsap !== 'undefined' && gsap.plugins?.scrollTo) {
      gsap.to(window, {
        scrollTo: { y: 0 },
        duration: 2.5,
        ease: 'power2.inOut'
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // ---- ANIMATE ON SCROLL ----
  const animElements = document.querySelectorAll('.animate-on-scroll');
  const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animElements.forEach(el => observer.observe(el));

  // ---- STAT COUNTER ANIMATION ----
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  statNumbers.forEach(stat => {
    ScrollTrigger.create({
      trigger: stat,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        const target = parseInt(stat.dataset.target);
        gsap.to(stat, {
          innerText: target,
          duration: 2,
          ease: 'power2.out',
          snap: { innerText: 1 },
          onUpdate: function () {
            stat.textContent = Math.round(parseFloat(stat.textContent));
          }
        });
      }
    });
  });

  // ---- HORIZONTAL SCROLL PROJECTS ----
  const projectsTrack = document.getElementById('projectsTrack');
  const projectsSlider = document.querySelector('.projects-slider');

  if (projectsTrack && projectsSlider) {
    const getScrollDistance = () => {
      return Math.max(400, projectsSlider.scrollWidth - window.innerWidth + 180);
    };

    gsap.to(projectsSlider, {
      x: () => -getScrollDistance(),
      ease: 'none',
      scrollTrigger: {
        trigger: projectsTrack,
        start: 'center center',
        end: () => `+=${Math.round(getScrollDistance() * 1.25)}`,
        pin: true,
        scrub: 1.2,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      }
    });
  }

  // ---- TESTIMONIALS SLIDER ----
  const testimonialCards = document.querySelectorAll('.testimonial-card');
  const dots = document.querySelectorAll('.dot');
  const prevBtn = document.getElementById('prevTest');
  const nextBtn = document.getElementById('nextTest');
  let currentTestimonial = 0;

  function showTestimonial(index) {
    testimonialCards.forEach(card => card.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    currentTestimonial = ((index % testimonialCards.length) + testimonialCards.length) % testimonialCards.length;
    testimonialCards[currentTestimonial].classList.add('active');
    dots[currentTestimonial].classList.add('active');
  }

  prevBtn?.addEventListener('click', () => showTestimonial(currentTestimonial - 1));
  nextBtn?.addEventListener('click', () => showTestimonial(currentTestimonial + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => showTestimonial(i)));

  // Auto-advance testimonials
  let testInterval = setInterval(() => showTestimonial(currentTestimonial + 1), 5000);
  const testimonialsSlider = document.getElementById('testimonialsSlider');
  testimonialsSlider?.addEventListener('mouseenter', () => clearInterval(testInterval));
  testimonialsSlider?.addEventListener('mouseleave', () => {
    testInterval = setInterval(() => showTestimonial(currentTestimonial + 1), 5000);
  });

  // ---- CONTACT FORM ----
  const contactForm = document.getElementById('contactForm');
  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);
    // Placeholder: In production, send to backend/API
    alert('¡Gracias por contactarnos! Nos comunicaremos contigo pronto.');
    contactForm.reset();
  });

  // ---- SMOOTH SCROLL FOR ANCHOR LINKS ----
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      const target = document.querySelector(href);
      if (target) {
        const offset = (href === '#proyectos' || href === '#nosotros') ? 80 : 60;
        const targetPos = target.getBoundingClientRect().top + window.scrollY - offset;
        if (typeof gsap !== 'undefined' && gsap.plugins && gsap.plugins.scrollTo) {
          gsap.to(window, {
            scrollTo: { y: targetPos, autoKill: false },
            duration: 1.2,
            ease: 'power2.inOut',
            onComplete: () => ScrollTrigger.refresh()
          });
        } else {
          window.scrollTo({ top: targetPos });
        }
      }
    });
  });

  // ---- STAGGER ANIMATIONS for service cards ----
  gsap.utils.toArray('.service-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        once: true,
      },
      y: 60,
      opacity: 0,
      duration: 0.8,
      delay: i * 0.15,
      ease: 'power2.out',
    });
  });

  // ---- STAGGER ANIMATIONS for process steps ----
  gsap.utils.toArray('.process-step').forEach((step, i) => {
    gsap.from(step, {
      scrollTrigger: {
        trigger: step,
        start: 'top 85%',
        once: true,
      },
      y: 40,
      opacity: 0,
      duration: 0.7,
      delay: i * 0.2,
      ease: 'power2.out',
    });
  });

  // ---- PARALLAX on stats background ----
  const statsBg = document.querySelector('.stats-bg-overlay');
  if (statsBg) {
    gsap.to(statsBg, {
      y: -60,
      ease: 'none',
      scrollTrigger: {
        trigger: '.section-stats',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      }
    });
  }

  // Refresh all ScrollTrigger dimensions once images and fonts are loaded
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });
  // Also refresh after a brief delay for any dynamic layout settlements
  setTimeout(() => {
    ScrollTrigger.refresh();
  }, 1000);
});
