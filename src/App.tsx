import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
const BottleScene = lazy(() => import('./BottleScene'));
const SolarScene = lazy(() => import('./SolarScene'));
gsap.registerPlugin(ScrollTrigger);

const chapters = [
  { number: '01', name: 'The arrival', id: 'arrival' },
  { number: '02', name: 'The philosophy', id: 'philosophy' },
  { number: '03', name: 'The solar chamber', id: 'chamber' },
  { number: '04', name: 'The composition', id: 'composition' },
  { number: '05', name: 'The object', id: 'artifact' },
  { number: '06', name: 'The end of light', id: 'end' },
];

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true" className="arrow">{diagonal ? '↗' : '↓'}</span>;
}

function Lines({ lines, className = '' }: { lines: string[]; className?: string }) {
  return <span className={`reveal-lines ${className}`}>{lines.map((line, i) => <span className="line-mask" key={i}><span className="line-inner">{line}</span></span>)}</span>;
}

function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState('');
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!matchMedia('(pointer:fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const moveX = gsap.quickTo(ring.current, 'x', { duration: .45, ease: 'power3' });
    const moveY = gsap.quickTo(ring.current, 'y', { duration: .45, ease: 'power3' });
    const move = (event: MouseEvent) => { moveX(event.clientX); moveY(event.clientY); setActive(true); };
    const hover = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-cursor],a,button');
      setLabel(target?.dataset.cursor || (target ? '↗' : ''));
    };
    document.addEventListener('mousemove', move); document.addEventListener('mouseover', hover);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseover', hover); };
  }, []);
  return <div ref={ring} className={`cursor ${active ? 'cursor-visible' : ''} ${label ? 'cursor-expanded' : ''}`}><span>{label}</span></div>;
}

function SoundToggle() {
  const [on, setOn] = useState(false);
  const audioRef = useRef<{ context: AudioContext; gain: GainNode } | null>(null);
  useEffect(() => () => { audioRef.current?.context.close(); }, []);
  async function toggle() {
    if (!audioRef.current) {
      const context = new AudioContext();
      const gain = context.createGain(); gain.gain.value = 0; gain.connect(context.destination);
      [55, 82.41, 110.13].forEach((frequency, index) => {
        const oscillator = context.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        const level = context.createGain(); level.gain.value = [.14, .035, .028][index];
        oscillator.connect(level); level.connect(gain); oscillator.start();
      });
      const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
      const samples = buffer.getChannelData(0); let last = 0;
      for (let i = 0; i < samples.length; i++) { last = (last + Math.random() * .04 - .02) / 1.02; samples[i] = last; }
      const noise = context.createBufferSource(); noise.buffer = buffer; noise.loop = true;
      const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 240;
      noise.connect(filter); filter.connect(gain); noise.start();
      audioRef.current = { context, gain };
    }
    await audioRef.current.context.resume();
    audioRef.current.gain.gain.setTargetAtTime(on ? 0 : .5, audioRef.current.context.currentTime, .8);
    setOn(!on);
  }
  return <button className={`sound-toggle ${on ? 'sound-on' : ''}`} onClick={toggle} aria-label={`Turn ambient sound ${on ? 'off' : 'on'}`} aria-pressed={on}><span className="sound-bars"><i /><i /><i /><i /></span><span>SOUND {on ? 'ON' : 'OFF'}</span></button>;
}

function ArtifactDialog({ close, mode = 'artifact' }: { close: () => void; mode?: 'artifact' | 'contact' }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); const el = dialog.current; return () => el?.close(); }, []);
  return <dialog className="artifact-dialog" aria-labelledby="artifact-dialog-title" ref={dialog} onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <button className="dialog-close" onClick={close} aria-label="Close artifact details">CLOSE <span>×</span></button>
    <span className="eyebrow orange">{mode === 'contact' ? 'A NOTE FROM THE ATELIER' : 'THE COLLECTION / ARTIFACT 001'}</span>
    <h2 id="artifact-dialog-title">{mode === 'contact' ? <>Stay in<br />the <em>afterglow.</em></> : <>One last<br /><em>impossible</em><br />moment.</>}</h2>
    <p className="dialog-intro">{mode === 'contact' ? 'An independent digital exhibition exploring the space between scent, light, and memory. The exhibition lives here; this conceptual house has no official social profile or commercial contact.' : 'A fragrance imagined at the edge of night. A sculptural vessel for the warmth that remains.'}</p>
    {mode === 'artifact' && <dl><div><dt>EXPRESSION</dt><dd>Extrait de parfum</dd></div><div><dt>VOLUME</dt><dd>50 ml / 1.7 fl. oz.</dd></div><div><dt>COMPOSITION</dt><dd>Solar resin · Black iris · Mineral smoke</dd></div></dl>}
    <p className="concept-note">AFTERLIGHT is a fictional fragrance house.<br />An independent exploration of scent, light, and digital craft.</p>
    <button className="text-link" onClick={close}>RETURN TO THE EXHIBITION <Arrow diagonal /></button>
  </dialog>;
}

type Artwork = { src: string; title: string; note: string };
function ArtworkDialog({ artwork, close }: { artwork: Artwork; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); const element = dialog.current; return () => element?.close(); }, []);
  return <dialog ref={dialog} className="artwork-dialog" aria-labelledby="artwork-title" onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <button className="dialog-close" onClick={close} aria-label="Close artwork">CLOSE <span>×</span></button>
    <img src={artwork.src} alt={artwork.title} />
    <div className="artwork-caption"><span className="eyebrow orange">THE AFTERLIGHT MATERIAL STUDIES</span><h2 id="artwork-title">{artwork.title}</h2><p>{artwork.note}</p><span className="eyebrow">AN OLFACTORY EXPERIMENT / 001</span></div>
  </dialog>;
}

function InView({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const el = useRef<HTMLDivElement>(null); const [visible, setVisible] = useState(false);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { const bounds = el.current?.getBoundingClientRect(); if (bounds) setVisible(bounds.bottom > -180 && bounds.top < innerHeight + 180); });
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    const timer = setTimeout(check, 800);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); window.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, []);
  return <div ref={el} className={className}>{visible && <Suspense fallback={<span className="canvas-loading">FORMING LIGHT</span>}>{children}</Suspense>}</div>;
}

export default function App() {
  const root = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'artifact' | 'contact'>('artifact');
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [chapter, setChapter] = useState(0);
  const [solarProgress, setSolarProgress] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const reduced = useRef(matchMedia('(prefers-reduced-motion: reduce)').matches);

  useLayoutEffect(() => {
    const initialHash = location.hash;
    const ctx = gsap.context(() => {
      if (!reduced.current) {
        const intro = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
        intro.fromTo('.entrance-line', { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: .8 })
          .to('.entrance-line', { opacity: 0, duration: .6 }, .75)
          .fromTo('.hero-eclipse', { opacity: 0, scale: .86 }, { opacity: .88, scale: 1, duration: 2.3 }, .35)
          .fromTo('.hero-title .line-inner', { yPercent: 115, rotate: 4 }, { yPercent: 0, rotate: 0, stagger: .16, duration: 1.7 }, .7)
          .fromTo('.hero-bottle', { opacity: 0, y: 75 }, { opacity: 1, y: 0, duration: 2 }, 1.1)
          .fromTo('.hero-meta, .hero-bottom, .site-header', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1 }, 1.5);

        gsap.to('.hero-eclipse', { yPercent: 24, scale: 1.15, ease: 'none', scrollTrigger: { trigger: '#arrival', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.hero-title', { yPercent: 35, ease: 'none', scrollTrigger: { trigger: '#arrival', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.utils.toArray<HTMLElement>('.reveal-lines:not(.hero-title)').forEach(element => {
          gsap.fromTo(element.querySelectorAll('.line-inner'), { yPercent: 110, rotate: 2 }, { yPercent: 0, rotate: 0, duration: 1.25, stagger: .12, ease: 'power4.out', scrollTrigger: { trigger: element, start: 'top 87%' } });
        });
        gsap.utils.toArray<HTMLElement>('.image-reveal').forEach(element => {
          gsap.fromTo(element, { clipPath: 'inset(0 30% 0 30%)' }, { clipPath: 'inset(0 0% 0 0%)', duration: 1.8, ease: 'power3.inOut', scrollTrigger: { trigger: element, start: 'top 85%' } });
          gsap.fromTo(element.querySelector('img'), { scale: 1.22, yPercent: -5 }, { scale: 1, yPercent: 5, ease: 'none', scrollTrigger: { trigger: element, start: 'top bottom', end: 'bottom top', scrub: 1.5 } });
        });
        gsap.to('.philosophy', { backgroundColor: '#d9c7ac', ease: 'none', scrollTrigger: { trigger: '#philosophy', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.product-heading', { yPercent: 15, ease: 'none', scrollTrigger: { trigger: '#artifact', start: 'top bottom', end: 'bottom top', scrub: true } });
        gsap.fromTo('.horizon-glow', { scaleX: .2, opacity: .1 }, { scaleX: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '#end', start: 'top 65%', end: 'bottom bottom', scrub: 1 } });
      }
      ScrollTrigger.create({ trigger: '#chamber', start: reduced.current ? 'top 35%' : 'top top', end: reduced.current ? 'bottom 65%' : '+=260%', pin: !reduced.current, anticipatePin: 1, onUpdate: self => setSolarProgress(self.progress) });
      chapters.forEach((scene, index) => ScrollTrigger.create({ id: `chapter-${scene.id}`, trigger: `#${scene.id}`, start: 'top 48%', end: 'bottom 48%', onEnter: () => setChapter(index), onEnterBack: () => setChapter(index) }));
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => setScrollProgress(self.progress) });
    }, root);
    const refresh = () => {
      ScrollTrigger.refresh();
      const initialChapter = chapters.find(scene => `#${scene.id}` === initialHash);
      if (initialChapter && location.hash === initialHash) {
        const trigger = ScrollTrigger.getById(`chapter-${initialChapter.id}`);
        if (trigger) { window.scrollTo({ top: initialChapter.id === 'arrival' ? 0 : trigger.start + innerHeight * .48, behavior: 'instant' }); ScrollTrigger.update(); }
      }
    };
    const timer = setTimeout(() => ScrollTrigger.refresh(), 2000);
    document.fonts.ready.then(refresh);
    return () => { clearTimeout(timer); ctx.revert(); };
  }, []);

  useEffect(() => {
    const element = menuRef.current;
    if (!element) return;
    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    gsap.killTweensOf(element);
    gsap.killTweensOf(element.querySelectorAll('.menu-link-inner'));
    if (menuOpen) {
      setMenuVisible(true);
      document.body.classList.add('menu-active');
      gsap.fromTo(element, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: reduced.current ? 0 : .9, ease: 'power4.inOut' });
      gsap.fromTo(element.querySelectorAll('.menu-link-inner'), { yPercent: 110 }, { yPercent: 0, stagger: .06, duration: reduced.current ? 0 : 1, delay: .25, ease: 'power4.out' });
      focusTimer = setTimeout(() => element.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true }), 100);
    } else {
      document.body.classList.remove('menu-active');
      gsap.to(element, { clipPath: 'inset(0 0 100% 0)', duration: reduced.current ? 0 : .65, ease: 'power4.inOut', onComplete: () => setMenuVisible(false) });
    }
    const key = (event: KeyboardEvent) => {
      if (!menuOpen) return;
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus({ preventScroll: true }); }
      if (event.key === 'Tab') {
        const items = [menuButton.current, ...Array.from(element.querySelectorAll<HTMLAnchorElement>('a'))].filter(Boolean) as HTMLElement[];
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { clearTimeout(focusTimer); gsap.killTweensOf(element); gsap.killTweensOf(element.querySelectorAll('.menu-link-inner')); document.removeEventListener('keydown', key); document.body.classList.remove('menu-active'); };
  }, [menuOpen]);

  function navigate(event: React.MouseEvent, id: string) {
    event.preventDefault(); setMenuOpen(false);
    const element = document.getElementById(id);
    if (!element) return;
    const target = ScrollTrigger.getById(`chapter-${id}`);
    window.scrollTo({ top: id === 'arrival' ? 0 : target?.start ? target.start + window.innerHeight * .48 : element.getBoundingClientRect().top + window.scrollY, behavior: reduced.current ? 'instant' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
  }

  function magnet(event: React.MouseEvent<HTMLElement>) {
    if (reduced.current || !matchMedia('(pointer:fine)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    gsap.to(event.currentTarget, { x: (event.clientX - rect.left - rect.width / 2) * .15, y: (event.clientY - rect.top - rect.height / 2) * .2, duration: .5, ease: 'power3.out' });
  }

  function exploreImage(event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) {
    if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const image = event.currentTarget.querySelector('img');
    const title = event.currentTarget.dataset.title || 'The anatomy of warmth';
    if (image) setArtwork({ src: image.src, title, note: image.alt });
  }

  const phase = solarProgress < .32 ? 0 : solarProgress < .59 ? 1 : solarProgress < .79 ? 2 : 3;

  return <div ref={root} className="experience">
    <a className="skip-link" href="#philosophy">Skip to the philosophy</a>
    <div className="grain" aria-hidden="true" />
    <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} />
    <Cursor />
    <header className={`site-header ${menuOpen ? 'menu-is-open' : ''} ${chapter > 0 && !menuOpen ? 'header-scrolled' : ''}`}>
      <a className="wordmark" href="#arrival" onClick={e => navigate(e, 'arrival')} aria-label="AFTERLIGHT home"><span className="brand-orbit" />AFTERLIGHT<span className="wordmark-star">®</span></a>
      <span className="header-caption">AN EXPLORATION OF LIGHT & MEMORY</span>
      <button ref={menuButton} className="menu-button" aria-expanded={menuOpen} aria-controls="full-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}><span>{menuOpen ? 'CLOSE' : 'MENU'}</span><span className="menu-icon"><i /><i /></span></button>
    </header>

    <div ref={menuRef} id="full-menu" role="dialog" aria-label="Exhibition navigation" aria-modal={menuOpen} className={`fullscreen-menu ${menuVisible ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
      <div className="menu-sun" />
      <span className="eyebrow menu-prelude">THE AFTERLIGHT EXHIBITION</span>
      <nav>{chapters.map(scene => <a href={`#${scene.id}`} onClick={e => navigate(e, scene.id)} key={scene.id}><span className="menu-number">{scene.number}</span><span className="menu-link-mask"><span className="menu-link-inner">{scene.name}</span></span><span className="menu-arrow">↗</span></a>)}</nav>
      <div className="menu-footer"><span>EST. AFTER THE END OF LIGHT</span><span>THE LAST SUNSET, BOTTLED.</span></div>
    </div>

    <aside className="chapter-rail" aria-label="Current chapter"><span>{chapters[chapter].number}</span><i /><span>06</span></aside>

    <main>
      <section className="hero" id="arrival" aria-label="AFTERLIGHT — The last sunset, bottled" onMouseMove={event => { if (!reduced.current && matchMedia('(pointer:fine)').matches) { const bounds = event.currentTarget.getBoundingClientRect(); gsap.to('.hero-eclipse', { x: (event.clientX / bounds.width - .5) * 24, y: (event.clientY / bounds.height - .5) * 12, duration: 1.6, ease: 'power3.out', overwrite: 'auto' }); } }}>
        <div className="entrance-line" aria-hidden="true" />
        <div className="hero-eclipse" aria-hidden="true" />
        <div className="hero-atmosphere" aria-hidden="true" />
        <div className="hero-meta eyebrow"><span><i className="live-dot" /> OLFACTORY ARTIFACT / 001</span><span>EST. AFTER THE END OF LIGHT</span></div>
        <h1 className="hero-title reveal-lines" aria-label="AFTERLIGHT"><span className="line-mask"><span className="line-inner">AFTER</span></span><span className="line-mask"><span className="line-inner">LIGHT<span className="title-star">*</span></span></span></h1>
        <InView className="hero-bottle"><BottleScene variant="hero" /></InView>
        <div className="hero-vertical eyebrow">A MEMORY OF WARMTH. A MOMENT BEYOND TIME.</div>
        <div className="hero-bottom">
          <div className="hero-tagline"><span className="eyebrow orange">CAPTURED AT THE EDGE OF NIGHT</span><p>The last sunset,<br /><em>bottled.</em></p></div>
          <a className="scroll-invitation" href="#philosophy" onClick={e => navigate(e, 'philosophy')}><span className="scroll-orbit"><Arrow /></span><span>SCROLL TO<br />EXPERIENCE</span></a>
          <div className="hero-edition"><span className="eyebrow">EXTRAIT DE PARFUM</span><span className="edition-number">50 <small>ML</small></span><span className="eyebrow">ONE IMPOSSIBLE MOMENT.</span></div>
        </div>
        <div className="hero-footnote eyebrow"><span>AN OLFACTORY EXPERIMENT</span><SoundToggle /><span>SCENE 01 — THE ARRIVAL</span></div>
      </section>

      <section className="philosophy light-section" id="philosophy">
        <div className="section-topline eyebrow"><span>01 / A BEAUTIFUL IMPOSSIBILITY</span><span>THE PHILOSOPHY</span><span>AFTERLIGHT</span></div>
        <h2><Lines lines={['LIGHT WAS', 'NEVER MEANT', 'TO LAST.']} /></h2>
        <div className="philosophy-grid">
          <span className="philosophy-asterisk" aria-hidden="true">✳</span>
          <div className="philosophy-copy"><span className="eyebrow">SO WE CAPTURED ITS FINAL BREATH.</span><p>An impossible fragrance.<br />A memory of warmth.<br />A moment suspended<br />beyond time.</p><span className="fine-caption">An artifact from a world<br />where light could be held.</span></div>
          <figure className="philosophy-image image-reveal" data-cursor="EXPLORE ↗" role="button" tabIndex={0} aria-label="Explore the anatomy of warmth" onClick={exploreImage} onKeyDown={exploreImage}><img src="/images/macro-amber.webp" alt="Golden light refracting through sculptural molten amber" loading="lazy" /><figcaption className="eyebrow"><span>FIG. 001 — THE ANATOMY OF WARMTH</span><span>590 NM</span></figcaption></figure>
        </div>
        <div className="philosophy-bottom"><span className="eyebrow">NOT CREATED. CAPTURED.</span><span className="orbit-mark" aria-hidden="true" /><span className="eyebrow">A STUDY IN IMPERMANENCE ↘</span></div>
      </section>

      <section className={`solar-chamber phase-${phase}`} id="chamber" aria-label="The solar chamber: scroll to compress light into fragrance">
        <div className="chamber-topline section-topline eyebrow"><span>02 / THE SOLAR CHAMBER</span><span><i className="live-dot" /> EXPERIMENT IN PROGRESS</span><span>SCROLL TO TRANSFORM</span></div>
        <InView className="solar-canvas"><SolarScene progress={solarProgress} /></InView>
        <div className="chamber-crosshair crosshair-a" /><div className="chamber-crosshair crosshair-b" />
        <div className="chamber-copy">
          <span className="eyebrow orange">{['THE SOURCE', 'THE COMPRESSION', 'THE ESSENCE', 'THE ARTIFACT'][phase]}</span>
          <h2 key={phase} className="phase-title">{phase === 0 ? <>THE FINAL<br /><em>FREQUENCY</em><br />OF LIGHT.</> : phase === 1 ? <>CAPTURE<br />THE<br /><em>IMPOSSIBLE.</em></> : phase === 2 ? <>ALL THAT<br /><em>REMAINS.</em></> : <>LIGHT.<br /><em>MADE</em><br />ETERNAL.</>}</h2>
        </div>
        <div className="chamber-artifact" style={{ opacity: Math.max(0, (solarProgress - .77) * 5), pointerEvents: 'none' }}><InView className="chamber-bottle"><BottleScene variant="chamber" progress={solarProgress} /></InView></div>
        <div className="chamber-coordinate eyebrow"><span>λ {Math.round(780 - solarProgress * 190)} NM</span><span>ENERGY → MEMORY</span><span>φ {(solarProgress * 100).toFixed(1)}%</span></div>
        <div className="chamber-bottom"><p>{['Before the darkness, there was this.', 'The last warmth of a disappearing world.', 'A universe, reduced to a single drop.', 'An impossible moment. Yours to hold.'][phase]}</p><div className="phase-track">{['IRRADIATE', 'COMPRESS', 'CONDENSE', 'PRESERVE'].map((label, i) => <span className={phase === i ? 'active' : ''} key={label}><b>0{i + 1}</b>{label}</span>)}</div></div>
      </section>

      <section className="composition" id="composition">
        <div className="section-topline eyebrow"><span>03 / THE COMPOSITION</span><span>AN OLFACTORY TRIPTYCH</span><span>THREE FORMS OF MEMORY</span></div>
        <div className="composition-intro"><span className="eyebrow orange">THE INVISIBLE, MADE TANGIBLE.</span><h2><Lines lines={['A FORMULA FOR', 'THE END OF TIME.']} /></h2><p>Neither a place nor a moment.<br />The feeling that stays.</p></div>

        <article className="note note-resin">
          <div className="note-annotation eyebrow"><span>01 / THE WARMTH</span><span>RESINOUS · LUMINOUS · INFINITE</span></div>
          <figure className="note-image image-reveal" data-cursor="EXPLORE ↗" data-title="Solar resin" role="button" tabIndex={0} aria-label="Explore solar resin" onClick={exploreImage} onKeyDown={exploreImage}><img src="/images/solar-resin.webp" alt="A luminous translucent amber resin sculpture floating in darkness" loading="lazy" /></figure>
          <div className="note-title"><span className="note-number">01</span><h3><Lines lines={['SOLAR', 'RESIN']} /></h3></div>
          <div className="note-description"><span className="tiny-cross">+</span><p>Warmth suspended<br /><em>in amber.</em></p><span className="eyebrow">THE FIRST TOUCH OF THE LAST LIGHT.</span></div>
        </article>

        <article className="note note-iris">
          <div className="note-annotation eyebrow"><span>02 / THE SHADOW</span><span>FLORAL · VELVET · NOCTURNAL</span></div>
          <figure className="note-image image-reveal" data-cursor="EXPLORE ↗" data-title="Black iris" role="button" tabIndex={0} aria-label="Explore black iris" onClick={exploreImage} onKeyDown={exploreImage}><img src="/images/black-iris.webp" alt="A sculptural black iris with petals edged by warm bronze light" loading="lazy" /></figure>
          <div className="note-title"><span className="note-number">02</span><h3><Lines lines={['BLACK', 'IRIS']} /></h3></div>
          <div className="note-description"><span className="tiny-cross">+</span><p>The elegance<br /><em>of fading light.</em></p><span className="eyebrow">BEAUTY, AT THE THRESHOLD OF DARKNESS.</span></div>
        </article>

        <article className="note note-mineral">
          <div className="note-annotation eyebrow"><span>03 / THE ECHO</span><span>MINERAL · ETHEREAL · ELEMENTAL</span></div>
          <figure className="note-image image-reveal" data-cursor="EXPLORE ↗" data-title="Mineral smoke" role="button" tabIndex={0} aria-label="Explore mineral smoke" onClick={exploreImage} onKeyDown={exploreImage}><img src="/images/mineral-smoke.webp" alt="A titanium mineral formation suspended in delicate silver smoke" loading="lazy" /></figure>
          <div className="note-title"><span className="note-number">03</span><h3><Lines lines={['MINERAL', 'SMOKE']} /></h3></div>
          <div className="note-description"><span className="tiny-cross">+</span><p>An echo of the world<br /><em>after sunset.</em></p><span className="eyebrow">WHAT THE EARTH REMEMBERS.</span></div>
        </article>
        <div className="composition-end eyebrow"><span>ONE FORMULA. NO EQUIVALENT.</span><span>CONTINUE INTO THE LIGHT <Arrow /></span></div>
      </section>

      <section className="product" id="artifact">
        <div className="section-topline eyebrow"><span>04 / THE OBJECT</span><span>COLLECTIBLE BY NATURE.</span><span>IMPOSSIBLE BY DESIGN.</span></div>
        <h2 className="product-heading">OWN<br /><span>THE LAST</span><br />LIGHT.</h2>
        <div className="product-orbit" aria-hidden="true" />
        <div className="product-left eyebrow"><span>EXTRAIT<br />DE PARFUM</span><span>A SCULPTURE.<br />A SCENT.<br />A SUNSET.</span></div>
        <InView className="product-bottle"><BottleScene variant="product" /></InView>
        <div className="product-right eyebrow"><span>50 ML /<br />OLFACTORY<br />ARTIFACT 001</span><span>SMOKED GLASS<br />MOLTEN MEMORY</span></div>
        <div className="product-bottom"><span className="eyebrow product-drag">↔ DRAG TO ROTATE THE ARTIFACT</span><button className="artifact-cta" onClick={() => { setDialogMode('artifact'); setArtifactOpen(true); }} onMouseMove={magnet} onMouseLeave={e => gsap.to(e.currentTarget, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1,.4)' })}><span>DISCOVER THE ARTIFACT</span><Arrow diagonal /></button><p>The last sunset, bottled.</p></div>
      </section>

      <section className="finale" id="end">
        <div className="section-topline eyebrow"><span>05 / THE END OF LIGHT</span><span>NOTHING IS EVER TRULY LOST.</span><span>AFTERLIGHT</span></div>
        <h2><Lines lines={['EVERYTHING', 'FADES.']} /><Lines className="finale-second" lines={['SOME THINGS', 'REMAIN.']} /></h2>
        <div className="horizon"><div className="horizon-glow" /><div className="tiny-bottle" aria-hidden="true"><i /></div><span className="horizon-label eyebrow">THE END IS ONLY ANOTHER BEGINNING.</span></div>
        <footer className="site-footer">
          <div className="footer-brand"><a href="#arrival" onClick={e => navigate(e, 'arrival')}>AFTERLIGHT<span>®</span></a><p>The Last Sunset, Bottled.</p></div>
          <nav aria-label="Footer"><a href="#artifact" onClick={e => navigate(e, 'artifact')}>EXPLORE THE ARTIFACT <Arrow diagonal /></a><a href="#philosophy" onClick={e => navigate(e, 'philosophy')}>OUR PHILOSOPHY <Arrow diagonal /></a><button onClick={() => { setDialogMode('contact'); setArtifactOpen(true); }}>CONTACT <Arrow diagonal /></button><button onClick={() => { setDialogMode('contact'); setArtifactOpen(true); }}>INSTAGRAM <Arrow diagonal /></button></nav>
          <div className="footer-bottom eyebrow"><span>© AFTERLIGHT 2026</span><span>A FICTIONAL HOUSE. AN IMPOSSIBLE IDEA.</span><a href="#arrival" onClick={e => navigate(e, 'arrival')}>BACK TO THE LIGHT ↑</a></div>
        </footer>
      </section>
    </main>
    {artifactOpen && <ArtifactDialog mode={dialogMode} close={() => setArtifactOpen(false)} />}
    {artwork && <ArtworkDialog artwork={artwork} close={() => setArtwork(null)} />}
  </div>;
}
