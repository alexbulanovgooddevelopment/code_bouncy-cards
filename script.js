document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".card");
  const cardsContainer = document.querySelector(".cards");
  const spotlight = document.querySelector(".spotlight");

  const PUSH_FORCE = 10;
  const TILT_AMOUNT = 0.1;
  const NEIGHBOR_INFLUENCE = 0.2;
  const SPRING_STIFFNESS = 0.05;
  const BOUNCE_FRICTION = 0.85;
  const CURSOR_SMOOTHING = 0.75;

  const BASE_X = [-275, -100, 100, 275];
  const BASE_Y = [10, -10, 25, -10];
  const BASE_R = [5, -5, 7.5, -10];
  const BASE_VIEWPORT = 1000;
  const BASE_PROXIMITY = 500;

  function getScale() {
    return Math.min(1, window.innerWidth / BASE_VIEWPORT);
  }

  function getLayout() {
    const scale = getScale();
    return {
      rotation: BASE_R,
      x: BASE_X.map((v) => v * scale),
      y: BASE_Y.map((v) => v * scale),
    };
  }

  const cursor = { x: 0, y: 0, vx: 0, vy: 0 };
  let prevCursorX = 0;
  let prevCursorY = 0;
  let proximityRadius = BASE_PROXIMITY * getScale();

  const layout = getLayout();

  const cardPhysics = [...cards].map((el, i) => {
    gsap.set(el, {
      x: layout.x[i],
      y: layout.y[i],
      rotation: layout.rotation[i],
      zIndex: i,
      xPercent: -50,
      yPercent: -50,
    });

    return {
      el,
      restX: layout.x[i],
      restY: layout.y[i],
      restR: layout.rotation[i],
      x: layout.x[i],
      y: layout.y[i],
      r: layout.rotation[i],
      vx: 0,
      vy: 0,
      vr: 0,
    };
  });

  spotlight.addEventListener("mousemove", (e) => {
    cursor.vx =
      cursor.vx * CURSOR_SMOOTHING +
      (e.clientX - prevCursorX) * (1 - CURSOR_SMOOTHING);
    cursor.vy =
      cursor.vy * CURSOR_SMOOTHING +
      (e.clientY - prevCursorY) * (1 - CURSOR_SMOOTHING);

    prevCursorX = cursor.x = e.clientX;
    prevCursorY = cursor.y = e.clientY;
  });

  spotlight.addEventListener("mouseleave", () => {
    cursor.vx = cursor.vy = 0;
  });

  window.addEventListener("resize", () => {
    proximityRadius = BASE_PROXIMITY * getScale();
    const newLayout = getLayout();
    cardPhysics.forEach((card, i) => {
      card.restX = newLayout.x[i];
      card.restY = newLayout.y[i];
      card.restR = newLayout.rotation[i];
      card.x = newLayout.x[i];
      card.y = newLayout.y[i];
      card.r = newLayout.rotation[i];
      card.vx = card.vy = card.vr = 0;
      gsap.set(card.el, { x: card.x, y: card.y, rotation: card.r });
    });
  });

  function calculatePushForce(card) {
    const speed = Math.sqrt(cursor.vx ** 2 + cursor.vy ** 2);

    if (speed < 0.5)
      return {
        fx: 0,
        fy: 0,
      };

    const rect = cardsContainer.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 + card.restX;
    const cy = rect.top + rect.height / 2 + card.restY;
    const dist = Math.sqrt((cursor.x - cx) ** 2 + (cursor.y - cy) ** 2);

    if (dist > proximityRadius) return { fx: 0, fy: 0 };

    const weight = (1 - dist / proximityRadius) ** 3;

    return {
      fx: cursor.vx * PUSH_FORCE * weight,
      fy: cursor.vy * PUSH_FORCE * weight,
    };
  }

  function applyNeighborInfluence(force, i) {
    let fx = force[i].fx;
    let fy = force[i].fy;

    force.forEach((el, j) => {
      if (j === i) return;

      const falloff = NEIGHBOR_INFLUENCE ** Math.abs(j - i);
      fx += el.fx * falloff;
      fy += el.fy * falloff * 0.6;
    });

    return { fx, fy };
  }

  gsap.ticker.add(() => {
    const forces = cardPhysics.map(calculatePushForce);

    cardPhysics.forEach((card, i) => {
      const { fx, fy } = applyNeighborInfluence(forces, i);

      card.vx =
        (card.vx + (card.restX + fx - card.x) * SPRING_STIFFNESS) *
        BOUNCE_FRICTION;
      card.vy =
        (card.vy + (card.restY + fy - card.y) * SPRING_STIFFNESS) *
        BOUNCE_FRICTION;
      card.vr =
        (card.vr +
          (card.restR + fx * TILT_AMOUNT - card.r) * SPRING_STIFFNESS) *
        BOUNCE_FRICTION;

      card.x += card.vx;
      card.y += card.vy;
      card.r += card.vr;

      gsap.set(card.el, { x: card.x, y: card.y, rotation: card.r });
    });
  });
});
