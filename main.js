const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

(() => {
  const nav = $(".nav");
  const onScroll = () => {
    nav && nav.classList.toggle("scrolled", window.scrollY > 20);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const toggle = $(".nav-toggle");
  const links = $(".nav-links");
  toggle && toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });

  $$("[data-year]").forEach(el => (el.textContent = new Date().getFullYear()));
})();

(() => {
  const animateCount = el => {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split(".")[1] || "").length;
    const dur = 1600;
    const t0 = performance.now();
    const step = now => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (target * eased).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      if (p < 1) requestAnimationFrame(step);
    };
    reduceMotion ? (el.textContent = el.dataset.count) : requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      $$("[data-count]", e.target).forEach(animateCount);
      $$(".fill[data-w]", e.target).forEach(f => (f.style.width = f.dataset.w + "%"));
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

  $$(".reveal").forEach(el => io.observe(el));
})();

(() => {
  const el = $(".typed");
  if (!el) return;
  const words = JSON.parse(el.dataset.words);
  if (reduceMotion) { el.textContent = words[0]; return; }
  let w = 0, i = 0, del = false;
  const tick = () => {
    const word = words[w];
    i += del ? -1 : 1;
    el.textContent = word.slice(0, i);
    let delay = del ? 35 : 70;
    if (!del && i === word.length) { del = true; delay = 1600; }
    else if (del && i === 0) { del = false; w = (w + 1) % words.length; delay = 300; }
    setTimeout(tick, delay);
  };
  setTimeout(tick, 900);
})();

(() => {
  const canvas = $("#hand-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const hud = $("#hand-hud");
  const gestureEl = $("#hand-gesture");
  const D2R = Math.PI / 180;

  const mm = (A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const mv = (A, v) => A.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
  const rx = a => { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
  const ry = a => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
  const rz = a => { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
  const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const child = (F, t, R = I3) => { const d = mv(F.R, t); return { R: mm(F.R, R), o: [F.o[0] + d[0], F.o[1] + d[1], F.o[2] + d[2]] }; };
  const pt = (F, v) => { const d = mv(F.R, v); return [F.o[0] + d[0], F.o[1] + d[1], F.o[2] + d[2]]; };

  const FINGERS = [
    { name: "INDEX", base: [1.38, 4.0, 0], len: [2.0, 1.25, 0.9], w: 0.74, splay: -6 },
    { name: "MIDDLE", base: [0.46, 4.15, 0], len: [2.2, 1.4, 1.0], w: 0.76, splay: -1 },
    { name: "RING", base: [-0.46, 4.0, 0], len: [2.05, 1.3, 0.95], w: 0.72, splay: 4 },
    { name: "LITTLE", base: [-1.36, 3.7, 0], len: [1.6, 1.0, 0.8], w: 0.64, splay: 10 }
  ];
  const THUMB = { base: [1.6, 0.8, 0.25], len: [1.7, 1.3, 1.0], w: 0.82 };
  const DEPTH = 0.62;

  const P = (f, t) => ({ f, t });
  const OPEN = P([[6, 5, 3], [5, 4, 3], [6, 5, 3], [8, 6, 4]], [12, 12, 6, 6]);
  const SCHEDULE = [
    { name: "OPEN HAND", pose: OPEN, hold: 1.4 },
    { name: "POWER GRASP", pose: P([[72, 95, 62], [75, 98, 64], [75, 98, 62], [78, 95, 60]], [62, 50, 28, 36]), hold: 1.6 },
    { name: "OPEN HAND", pose: OPEN, hold: 0.8 },
    { name: "PRECISION PINCH", pose: P([[50, 56, 30], [16, 20, 12], [12, 16, 10], [10, 14, 8]], [72, 56, 22, 26]), hold: 1.6 },
    { name: "TRIPOD GRASP", pose: P([[46, 52, 30], [50, 50, 30], [80, 98, 62], [84, 96, 62]], [68, 54, 20, 24]), hold: 1.6 },
    { name: "POINT", pose: P([[4, 4, 2], [82, 100, 66], [84, 100, 64], [86, 98, 62]], [55, 42, 40, 50]), hold: 1.5 },
    { name: "FINGER GAIT", wave: true, hold: 3.4 }
  ];
  const MOVE = 0.9;
  const CYCLE = SCHEDULE.reduce((s, g) => s + g.hold + MOVE, 0);

  const wavePose = t => P(
    FINGERS.map((_, i) => { const k = Math.sin(t * 3.4 - i * 0.95) * 0.5 + 0.5; return [k * 78, k * 96, k * 62]; }),
    [20 + (Math.sin(t * 3.4 + 1.2) * 0.5 + 0.5) * 34, 22, 14, 18]
  );
  const poseOf = (g, t) => (g.wave ? wavePose(t) : g.pose);
  const mix = (a, b, u) => P(a.f.map((r, i) => r.map((v, j) => v + (b.f[i][j] - v) * u)), a.t.map((v, i) => v + (b.t[i] - v) * u));
  const smooth = u => u * u * (3 - 2 * u);

  const poseAt = t => {
    let tt = t % CYCLE;
    for (let k = 0; k < SCHEDULE.length; k++) {
      const g = SCHEDULE[k], n = SCHEDULE[(k + 1) % SCHEDULE.length];
      if (tt < g.hold) return { pose: poseOf(g, t), name: g.name };
      tt -= g.hold;
      if (tt < MOVE) return { pose: mix(poseOf(g, t), poseOf(n, t), smooth(tt / MOVE)), name: n.name };
      tt -= MOVE;
    }
    return { pose: OPEN, name: SCHEDULE[0].name };
  };

  const solve = (pose, t) => {
    const wristFlex = Math.sin(t * 0.55) * 7 * D2R;
    const wristDev = Math.sin(t * 0.37) * 4 * D2R;
    const palm = { R: mm(rx(-wristFlex), rz(wristDev)), o: [0, 0, 0] };
    const segs = [], joints = [], tips = [];

    FINGERS.forEach((fd, i) => {
      const [mcp, pip, dip] = pose.f[i].map(a => a * D2R);
      const abd = fd.splay * D2R * (1 - Math.min(mcp / 1.3, 1) * 0.7);
      let F = child(palm, fd.base, mm(rz(abd), rx(mcp)));
      const flex = [pip, dip];
      fd.len.forEach((L, k) => {
        segs.push({ F, L, w: fd.w * (1 - k * 0.06), tip: k === 2 });
        joints.push(F.o);
        if (k < 2) F = child(F, [0, L, 0], rx(flex[k]));
        else tips.push(pt(F, [0, L, 0]));
      });
    });

    const [opp, abdT, mcpT, ipT] = pose.t.map(a => a * D2R);
    let T = child(palm, THUMB.base, mm(rz(-0.95 + opp * 0.25), mm(ry(-opp), rx(abdT))));
    const tflex = [mcpT, ipT];
    THUMB.len.forEach((L, k) => {
      segs.push({ F: T, L, w: THUMB.w * (1 - k * 0.08), tip: k === 2 });
      joints.push(T.o);
      if (k < 2) T = child(T, [0, L, 0], rx(tflex[k]));
      else tips.push(pt(T, [0, L, 0]));
    });
    return { palm, segs, joints, tips };
  };

  let W, H, cxs, cys, scale;
  const resize = () => {
    const DPR = Math.min(devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const wide = W > 1000;
    const phone = W <= 720;
    cxs = wide ? W * 0.72 : phone ? W * 0.6 : W * 0.5;
    cys = wide ? H * 0.44 : phone ? H - 185 : H * 0.4;
    scale = wide ? Math.min(H * 0.062, W * 0.05) : phone ? W * 0.075 : Math.min(W, H) * 0.05;
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  const BASE_YAW = -0.6, BASE_PITCH = 0.2;
  let yaw = BASE_YAW, pitch = BASE_PITCH, tYaw = yaw, tPitch = pitch;
  addEventListener("pointermove", e => {
    tYaw = BASE_YAW + (e.clientX / innerWidth - 0.5) * 0.9;
    tPitch = BASE_PITCH + (e.clientY / innerHeight - 0.5) * 0.5;
  }, { passive: true });

  const project = p => {
    const x = p[0], y = p[1] - 3.6, z = p[2];
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    const f = 42 / (42 - z2);
    return [cxs + x1 * scale * f, cys - y1 * scale * f, z2];
  };
  const shade = z => Math.max(0.14, Math.min(1, 0.55 + z * 0.13));

  const line = (a, b, k = 1) => {
    ctx.strokeStyle = `rgba(255,255,255,${shade((a[2] + b[2]) / 2) * k})`;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  };
  const poly = (pts, k = 1, close = true) => {
    for (let i = 0; i < pts.length - (close ? 0 : 1); i++) line(pts[i], pts[(i + 1) % pts.length], k);
  };

  const drawSeg = ({ F, L, w, tip }) => {
    const h = DEPTH / 2, b = w / 2, t = w * 0.44;
    const P3 = v => project(pt(F, v));
    const c = [[-b, 0, -h], [b, 0, -h], [t, L, -h], [-t, L, -h], [-b, 0, h], [b, 0, h], [t, L, h], [-t, L, h]].map(P3);
    if (tip) {
      for (const z of [-h, h]) {
        const arc = [];
        for (let i = 0; i <= 8; i++) { const a = Math.PI * (i / 8); arc.push(P3([-t * Math.cos(a), L + t * Math.sin(a) * 0.9 - t * 0.3, z])); }
        poly([P3([-b, 0, z]), P3([-t, L - t * 0.3, z]), ...arc, P3([t, L - t * 0.3, z]), P3([b, 0, z])], z > 0 ? 1 : 0.55, false);
      }
      line(c[0], c[1]); line(c[4], c[5], 0.55);
      line(c[0], c[4], 0.5); line(c[1], c[5], 0.5);
    } else {
      poly([c[0], c[1], c[2], c[3]], 0.55);
      poly([c[4], c[5], c[6], c[7]], 1);
      for (let i = 0; i < 4; i++) line(c[i], c[i + 4], 0.5);
    }
    const ring = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ring.push(P3([b * 1.04, Math.cos(a) * h * 0.8, Math.sin(a) * h * 0.8])); }
    poly(ring, 0.5);
  };

  const spline = (P, closed, steps = 6) => {
    const out = [], n = P.length;
    const at = i => P[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      for (let k = 0; k < steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(d => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
      }
    }
    if (!closed) out.push(P[n - 1]);
    return out;
  };

  const SLOT_CLEAR = 0.04;
  const SLOT_DEPTH = 0.42;
  const LUG_RISE = 0.14;
  const knuckles = [];
  FINGERS.forEach((fd, i) => {
    const [x, b] = fd.base, hw = fd.w / 2 + SLOT_CLEAR;
    knuckles.push(
      [x + hw, b + 0.02], [x + hw, b - 0.2],
      [x + hw * 0.55, b - SLOT_DEPTH + 0.05], [x, b - SLOT_DEPTH], [x - hw * 0.55, b - SLOT_DEPTH + 0.05],
      [x - hw, b - 0.2], [x - hw, b + 0.02]
    );
    const nx = FINGERS[i + 1];
    if (nx) knuckles.push([(x - hw + nx.base[0] + nx.w / 2 + SLOT_CLEAR) / 2, Math.max(b, nx.base[1]) + LUG_RISE]);
  });
  const PALM = spline([
    [-1.35, 0.05], [0, -0.15], [1.25, 0.0],
    [1.72, 0.28], [1.55, 0.4], [1.36, 0.6], [1.26, 0.86], [1.3, 1.14], [1.65, 1.39], [2.0, 1.66],
    [1.98, 2.35], [1.92, 3.25], [1.86, 3.85],
    ...knuckles,
    [-1.82, 3.6], [-1.92, 3.0], [-1.98, 2.3], [-1.9, 1.2], [-1.65, 0.45]
  ], true);

  const drawPalm = palm => {
    const h = 0.5;
    const g = (x, y, cx, cy, s) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / s);
    const zf = (x, y) => h + 0.22 * g(x, y, 1.35, 1.05, 0.9) + 0.14 * g(x, y, -1.35, 1.3, 1.0) + 0.1 * g(x, y, 0.2, 4.0, 0.6) - 0.12 * g(x, y, 0.15, 2.3, 1.2);
    const front = PALM.map(([x, y]) => project(pt(palm, [x, y, zf(x, y)])));
    const back = PALM.map(([x, y]) => project(pt(palm, [x * 0.97, y, -h])));
    poly(front, 1); poly(back, 0.4);
    front.forEach((p, i) => { if (i % 6 === 0) line(p, back[i], 0.35); });
  };

  const drawForearm = () => {
    const rings = [-0.3, -1.7, -3.1];
    const ell = (y, a) => { const pts = []; for (let i = 0; i < 20; i++) { const t = (i / 20) * Math.PI * 2; pts.push(project([Math.cos(t) * 1.3, y, Math.sin(t) * 0.62])); } poly(pts, a); return pts; };
    const R = rings.map((y, i) => ell(y, [0.5, 0.2, 0.06][i]));
    for (let i = 0; i < 20; i += 4) { line(R[0][i], R[1][i], 0.22); line(R[1][i], R[2][i], 0.08); }
  };

  const TRAIL = 26;
  const trails = [[], [], [], [], []];

  const labels = hud ? ["INDEX", "THUMB"].map((_, i) => {
    const el = document.createElement("div");
    el.className = i ? "hud-label left" : "hud-label";
    hud.appendChild(el);
    return el;
  }) : [];

  let t = 0, last = performance.now(), running = true;
  const frame = now => {
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    if (!reduceMotion) t += dt;
    yaw += (tYaw + Math.sin(t * 0.22) * 0.12 - yaw) * 0.05;
    pitch += (tPitch - pitch) * 0.05;

    const { pose, name } = poseAt(t);
    const { palm, segs, joints, tips } = solve(pose, t);

    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    drawForearm();
    drawPalm(palm);
    segs.forEach(drawSeg);

    joints.forEach(j => {
      const p = project(j);
      ctx.fillStyle = "#000";
      ctx.strokeStyle = `rgba(255,255,255,${shade(p[2])})`;
      ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });

    tips.forEach((tp, i) => {
      const p = project(tp);
      const tr = trails[i];
      tr.push(p); if (tr.length > TRAIL) tr.shift();
      for (let k = 1; k < tr.length; k++) {
        ctx.strokeStyle = `rgba(255,255,255,${(k / tr.length) * 0.35})`;
        ctx.beginPath(); ctx.moveTo(tr[k - 1][0], tr[k - 1][1]); ctx.lineTo(tr[k][0], tr[k][1]); ctx.stroke();
      }
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, Math.PI * 2); ctx.fill();
    });

    if (labels.length) {
      const ip = project(tips[0]), tp = project(tips[4]);
      labels[0].style.transform = `translate(${ip[0] + 18}px, ${ip[1] - 34}px)`;
      labels[0].innerHTML = `<span>INDEX · PIP</span><b>${pose.f[0][1].toFixed(0).padStart(3, "0")}°</b>`;
      labels[1].style.transform = `translate(calc(${tp[0] - 18}px - 100%), ${tp[1] + 6}px)`;
      labels[1].innerHTML = `<span>THUMB · OPP</span><b>${pose.t[0].toFixed(0).padStart(3, "0")}°</b>`;
    }
    if (gestureEl && gestureEl.textContent !== name) gestureEl.textContent = name;

    if (running) requestAnimationFrame(frame);
  };

  new IntersectionObserver(([e]) => {
    const was = running;
    running = e.isIntersecting;
    if (running && !was) { last = performance.now(); requestAnimationFrame(frame); }
  }).observe(canvas);
  requestAnimationFrame(frame);
})();

(() => {
  const svg = $("#linkage");
  if (!svg) return;
  const S = 1.55;
  const a = 40 * S, b = 120 * S, c = 90 * S, d = 110 * S;
  const O2 = [120, 250], O4 = [120 + d, 250];
  const el = id => svg.querySelector(id);
  const crank = el("#lk-crank"), coupler = el("#lk-coupler"), rocker = el("#lk-rocker");
  const jA = el("#lk-A"), jB = el("#lk-B"), jP = el("#lk-P"), trace = el("#lk-trace");
  const r2 = $("#lk-th2"), r4 = $("#lk-th4");

  const solve = th => {
    const A = [O2[0] + a * Math.cos(th), O2[1] - a * Math.sin(th)];
    const dx = O4[0] - A[0], dy = O4[1] - A[1];
    const D = Math.hypot(dx, dy);
    const k = (b * b - c * c + D * D) / (2 * D);
    const h = Math.sqrt(Math.max(b * b - k * k, 0));
    const mx = A[0] + (k * dx) / D, my = A[1] + (k * dy) / D;
    const B = [mx + (h * dy) / D, my - (h * dx) / D];
    const ux = (B[0] - A[0]) / b, uy = (B[1] - A[1]) / b;
    const P = [A[0] + ux * b * 0.45 + uy * 70, A[1] + uy * b * 0.45 - ux * 70];
    return { A, B, P };
  };

  let dPath = "";
  for (let i = 0; i <= 360; i++) {
    const { P } = solve((i / 360) * Math.PI * 2);
    dPath += (i ? "L" : "M") + P[0].toFixed(1) + " " + P[1].toFixed(1);
  }
  trace.setAttribute("d", dPath + "Z");

  let th = 0.6, last = performance.now();
  const set = (n, x1, y1, x2, y2) => { n.setAttribute("x1", x1); n.setAttribute("y1", y1); n.setAttribute("x2", x2); n.setAttribute("y2", y2); };
  const frame = now => {
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    if (!reduceMotion) th += dt * 1.6;
    const { A, B, P } = solve(th);
    set(crank, O2[0], O2[1], A[0], A[1]);
    set(rocker, O4[0], O4[1], B[0], B[1]);
    coupler.setAttribute("points", `${A[0]},${A[1]} ${B[0]},${B[1]} ${P[0]},${P[1]}`);
    jA.setAttribute("cx", A[0]); jA.setAttribute("cy", A[1]);
    jB.setAttribute("cx", B[0]); jB.setAttribute("cy", B[1]);
    jP.setAttribute("cx", P[0]); jP.setAttribute("cy", P[1]);
    const deg = x => ((x * 180) / Math.PI + 360) % 360;
    if (r2) r2.textContent = deg(th).toFixed(0).padStart(3, "0") + "°";
    if (r4) r4.textContent = deg(Math.atan2(O4[1] - B[1], B[0] - O4[0])).toFixed(1) + "°";
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();

(() => {
  const svg = $("#susp");
  if (!svg) return;
  const q = id => svg.querySelector(id);
  const U0 = [150, 112], L0 = [140, 190];
  const Lu = 122, Ll = 140;
  const rocker = [212, 70];
  const upper = q("#su-upper"), lower = q("#su-lower"), upright = q("#su-upright");
  const wheel = q("#su-wheel"), spring = q("#su-spring"), road = q("#su-road");
  const camberEl = $("#su-camber"), travelEl = $("#su-travel");

  const springPath = (p1, p2, coils = 9, w = 9) => {
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;
    let d = `M${p1[0]} ${p1[1]}`;
    const s = 12;
    d += `L${p1[0] + ux * s} ${p1[1] + uy * s}`;
    for (let i = 0; i <= coils * 2; i++) {
      const t = s + ((len - 2 * s) * i) / (coils * 2);
      const side = i === 0 || i === coils * 2 ? 0 : i % 2 ? 1 : -1;
      d += `L${p1[0] + ux * t + nx * w * side} ${p1[1] + uy * t + ny * w * side}`;
    }
    return d + `L${p2[0]} ${p2[1]}`;
  };

  let t = 0, last = performance.now();
  const frame = now => {
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    if (!reduceMotion) t += dt;
    const bump = Math.sin(t * 2.1) * 0.7 + Math.sin(t * 5.3) * 0.3;
    const phiL = bump * 0.16;
    const Lo = [L0[0] + Ll * Math.cos(phiL), L0[1] - Ll * Math.sin(phiL)];
    const up = 78;
    const dx = Lo[0] - U0[0], dy = Lo[1] - U0[1];
    const D = Math.hypot(dx, dy);
    const k = (Lu * Lu - up * up + D * D) / (2 * D);
    const h = Math.sqrt(Math.max(Lu * Lu - k * k, 0));
    const mx = U0[0] + (k * dx) / D, my = U0[1] + (k * dy) / D;
    const Uo = [mx + (h * dy) / D, my - (h * dx) / D];

    upper.setAttribute("d", `M${U0[0]} ${U0[1]}L${Uo[0]} ${Uo[1]}`);
    lower.setAttribute("d", `M${L0[0]} ${L0[1]}L${Lo[0]} ${Lo[1]}`);
    upright.setAttribute("d", `M${Uo[0]} ${Uo[1]}L${Lo[0]} ${Lo[1]}`);

    const camber = Math.atan2(Lo[0] - Uo[0], Lo[1] - Uo[1]);
    const wx = (Uo[0] + Lo[0]) / 2 + 30, wy = (Uo[1] + Lo[1]) / 2 + 8;
    wheel.setAttribute("transform", `translate(${wx} ${wy}) rotate(${(-camber * 180) / Math.PI})`);
    road.setAttribute("transform", `translate(0 ${wy + 52 - 230})`);

    const sp = [L0[0] + (Lo[0] - L0[0]) * 0.62, L0[1] + (Lo[1] - L0[1]) * 0.62];
    spring.setAttribute("d", springPath(rocker, sp));
    q("#su-pushrod-end").setAttribute("cx", sp[0]);
    q("#su-pushrod-end").setAttribute("cy", sp[1]);
    q("#su-Uo").setAttribute("cx", Uo[0]); q("#su-Uo").setAttribute("cy", Uo[1]);
    q("#su-Lo").setAttribute("cx", Lo[0]); q("#su-Lo").setAttribute("cy", Lo[1]);

    if (camberEl) camberEl.textContent = ((camber * 180) / Math.PI).toFixed(2) + "°";
    if (travelEl) travelEl.textContent = (bump * 25).toFixed(1) + " mm";
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();

(() => {
  const btns = $$(".filters button");
  if (!btns.length) return;
  const cases = $$(".case");
  btns.forEach(b => {
    const f = b.dataset.filter;
    const n = f === "all" ? cases.length : cases.filter(c => c.dataset.cat.includes(f)).length;
    b.insertAdjacentHTML("beforeend", `<span class="count">${n}</span>`);
    b.addEventListener("click", () => {
      btns.forEach(x => x.classList.toggle("active", x === b));
      cases.forEach(c => c.classList.toggle("hidden", f !== "all" && !c.dataset.cat.includes(f)));
    });
  });
})();

(() => {
  $$(".viz-tabs").forEach(tabs => {
    const fig = tabs.closest(".figure");
    const btns = $$("button", tabs);
    btns.forEach(b => b.addEventListener("click", () => {
      btns.forEach(x => x.classList.toggle("active", x === b));
      $$("[data-view]", fig).forEach(v => (v.style.display = v.dataset.view === b.dataset.show ? "" : "none"));
    }));
  });
})();

(() => {
  $$(".slides").forEach(box => {
    const frames = $$("img", box), label = $(".slide-label", box);
    let i = 0;
    const show = n => {
      frames.forEach((f, k) => f.classList.toggle("on", k === n));
      label.textContent = frames[n].dataset.label;
    };
    if (reduceMotion) return show(frames.length - 1);
    setInterval(() => show(i = (i + 1) % frames.length), 600);
  });
})();

(() => {
  const p = $("#print-cv");
  p && p.addEventListener("click", () => window.print());

  const page = $(".tex-page");
  if (page) {
    const canvas = $(".tex-canvas"), frame = $(".tex-frame"), label = $(".tex-zoom");
    let zoom = null;
    const fit = () => {
      const pad = parseFloat(getComputedStyle(canvas).paddingLeft) * 2;
      return Math.min(1.25, (canvas.clientWidth - pad) / page.offsetWidth);
    };
    const render = () => {
      const s = zoom ?? fit();
      page.style.transform = `scale(${s})`;
      frame.style.width = page.offsetWidth * s + "px";
      frame.style.height = page.offsetHeight * s + "px";
      label.textContent = Math.round(s * 100) + "%";
    };
    $$("[data-zoom]").forEach(b => b.addEventListener("click", () => {
      const s = zoom ?? fit();
      zoom = b.dataset.zoom === "fit" ? null
           : Math.min(2, Math.max(0.4, s + (b.dataset.zoom === "in" ? 0.1 : -0.1)));
      render();
    }));
    $("#tex-download").addEventListener("click", () => window.print());
    window.addEventListener("resize", render);
    document.fonts && document.fonts.ready.then(render);
    render();
  }
})();

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const mk = (parent, tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent.appendChild(n);
    return n;
  };

  const initArm = svg => {
    const S = [100, 205], L1 = 110, L2 = 100, L3 = 30;
    const BOX = { w: 26, h: 22, x: 215 };
    const TABLE = 240;

    mk(svg, "line", { x1: 20, y1: TABLE, x2: 390, y2: TABLE, stroke: "#8a8a8a", "stroke-width": 1.5 });
    for (let x = 24; x < 390; x += 9) mk(svg, "line", { x1: x, y1: TABLE + 1, x2: x - 7, y2: TABLE + 8, stroke: "#262626" });
    mk(svg, "rect", { x: 270, y: TABLE - 30, width: 32, height: 30, fill: "none", stroke: "#d9d9d9", "stroke-dasharray": "3 3" });
    mk(svg, "text", { x: 268, y: TABLE + 22, class: "sv-text", style: "fill:#d9d9d9" }).textContent = "PLACE";
    mk(svg, "path", { d: "M325 240 C330 226 342 232 348 224 C356 216 366 230 372 226 C378 232 380 236 382 240 Z", fill: "rgba(255,255,255,.15)", stroke: "#ffffff", "stroke-width": 1.2 });
    mk(svg, "rect", { x: 320, y: 214, width: 66, height: 30, fill: "none", stroke: "#bfbfbf", "stroke-dasharray": "2 3", class: "sv-blink" });
    mk(svg, "text", { x: 320, y: 208, class: "sv-text-c" }).textContent = "DEFORMABLE";
    const mask = mk(svg, "rect", { x: BOX.x - BOX.w / 2 - 5, y: TABLE - BOX.h - 5, width: BOX.w + 10, height: BOX.h + 10, fill: "none", stroke: "#bfbfbf", "stroke-dasharray": "2 3", class: "sv-blink" });
    const maskLbl = mk(svg, "text", { x: BOX.x - 20, y: TABLE - BOX.h - 10, class: "sv-text-c" });
    maskLbl.textContent = "RIGID";
    const trace = mk(svg, "path", { fill: "none", stroke: "#ffffff", "stroke-width": 1, "stroke-dasharray": "3 4", opacity: 0.6 });
    const box = mk(svg, "rect", { width: BOX.w, height: BOX.h, rx: 3, fill: "rgba(255,255,255,.18)", stroke: "#bfbfbf", "stroke-width": 1.5 });
    mk(svg, "rect", { x: S[0] - 22, y: TABLE - 12, width: 44, height: 12, rx: 2, fill: "#0a0a0a", stroke: "#8a8a8a" });
    mk(svg, "rect", { x: S[0] - 9, y: S[1], width: 18, height: TABLE - 12 - S[1], fill: "#0a0a0a", stroke: "#8a8a8a" });
    const l1 = mk(svg, "line", { stroke: "#f2f2f2", "stroke-width": 11, "stroke-linecap": "round" });
    const l2 = mk(svg, "line", { stroke: "#bfbfbf", "stroke-width": 8, "stroke-linecap": "round" });
    const wristLink = mk(svg, "line", { stroke: "#f2f2f2", "stroke-width": 5, "stroke-linecap": "round" });
    const palm = mk(svg, "line", { stroke: "#f2f2f2", "stroke-width": 4, "stroke-linecap": "round" });
    const fL = mk(svg, "line", { stroke: "#ffffff", "stroke-width": 3.5, "stroke-linecap": "round" });
    const fR = mk(svg, "line", { stroke: "#ffffff", "stroke-width": 3.5, "stroke-linecap": "round" });
    const j0 = mk(svg, "circle", { cx: S[0], cy: S[1], r: 7, fill: "#000000", stroke: "#f2f2f2", "stroke-width": 2 });
    const j1 = mk(svg, "circle", { r: 6, fill: "#000000", stroke: "#f2f2f2", "stroke-width": 2 });
    const j2 = mk(svg, "circle", { r: 5, fill: "#000000", stroke: "#bfbfbf", "stroke-width": 2 });
    const hud = mk(svg, "text", { x: 16, y: 26, class: "sv-text-c" });
    const hud2 = mk(svg, "text", { x: 16, y: 42, class: "sv-text" });

    const top = TABLE - BOX.h;
    const W = [
      { p: [150, 110], g: 1, name: "HOME" },
      { p: [BOX.x, top - 34], g: 1, name: "PRE-GRASP" },
      { p: [BOX.x, top + 14], g: 1, name: "APPROACH" },
      { p: [BOX.x, top + 14], g: 0, name: "GRASP" },
      { p: [BOX.x, top - 40], g: 0, name: "LIFT" },
      { p: [286, top - 40], g: 0, name: "TRANSPORT" },
      { p: [286, top + 14], g: 0, name: "PLACE" },
      { p: [286, top + 14], g: 1, name: "RELEASE" },
      { p: [286, top - 30], g: 1, name: "RETREAT" },
      { p: [150, 110], g: 1, name: "HOME" }
    ];
    const SEG = 1.25;

    const ik = (tx, ty) => {
      const wx = tx, wy = ty - L3;
      const dx = wx - S[0], dy = S[1] - wy;
      const d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.01);
      const c = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
      const q2 = Math.acos(Math.max(-1, Math.min(1, c)));
      const q1 = Math.atan2(dy, dx) + Math.atan2(L2 * Math.sin(q2), L1 + L2 * Math.cos(q2));
      const E = [S[0] + L1 * Math.cos(q1), S[1] - L1 * Math.sin(q1)];
      const Wp = [E[0] + L2 * Math.cos(q1 - q2), E[1] - L2 * Math.sin(q1 - q2)];
      return { q1, q2, E, W: Wp };
    };

    const ease = u => u * u * (3 - 2 * u);
    const at = t => {
      const n = W.length - 1;
      const tt = t % (n * SEG);
      const i = Math.floor(tt / SEG);
      const u = ease((tt - i * SEG) / SEG);
      const a = W[i], b = W[i + 1];
      return {
        x: a.p[0] + (b.p[0] - a.p[0]) * u,
        y: a.p[1] + (b.p[1] - a.p[1]) * u,
        g: a.g + (b.g - a.g) * u,
        i,
        name: b.name
      };
    };

    let d = "";
    for (let k = 0; k <= 400; k++) {
      const s = at((k / 400) * (W.length - 1) * SEG * 0.999);
      d += (k ? "L" : "M") + s.x.toFixed(1) + " " + s.y.toFixed(1);
    }
    trace.setAttribute("d", d);

    const set = (n, a, b) => { n.setAttribute("x1", a[0]); n.setAttribute("y1", a[1]); n.setAttribute("x2", b[0]); n.setAttribute("y2", b[1]); };
    let t = 0, last = performance.now(), running = true;
    const frame = now => {
      const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
      last = now;
      if (!reduceMotion) t += dt;
      const s = at(t);
      const { q1, q2, E, W: Wp } = ik(s.x, s.y);
      set(l1, S, E);
      set(l2, E, Wp);
      const palmY = Wp[1] + L3 - 14;
      set(wristLink, Wp, [Wp[0], palmY]);
      const half = BOX.w / 2 + 2 + s.g * 8;
      set(palm, [Wp[0] - half, palmY], [Wp[0] + half, palmY]);
      set(fL, [Wp[0] - half, palmY], [Wp[0] - half, palmY + 16]);
      set(fR, [Wp[0] + half, palmY], [Wp[0] + half, palmY + 16]);
      j1.setAttribute("cx", E[0]); j1.setAttribute("cy", E[1]);
      j2.setAttribute("cx", Wp[0]); j2.setAttribute("cy", Wp[1]);

      const held = s.i >= 3 && s.i < 7;
      const bx = held ? s.x : s.i >= 7 ? 286 : BOX.x;
      const by = held ? s.y - 14 : s.i >= 7 ? TABLE - BOX.h : TABLE - BOX.h;
      box.setAttribute("x", bx - BOX.w / 2);
      box.setAttribute("y", Math.min(by, TABLE - BOX.h));
      const showMask = s.i < 3;
      mask.style.display = maskLbl.style.display = showMask ? "" : "none";

      const deg = r => ((r * 180) / Math.PI).toFixed(0).padStart(3, " ");
      hud.textContent = "PHASE · " + s.name;
      hud2.textContent = `q1 ${deg(q1)}°  q2 ${deg(-q2)}°  GRIP ${s.g > 0.5 ? "OPEN" : "CLOSED"}`;
      if (running) requestAnimationFrame(frame);
    };
    new IntersectionObserver(([e]) => {
      const was = running;
      running = e.isIntersecting;
      if (running && !was) { last = performance.now(); requestAnimationFrame(frame); }
    }).observe(svg);
    requestAnimationFrame(frame);
  };

  $$("svg.arm-sim").forEach(initArm);
})();

(() => {
  const flip = $(".flip");
  if (!flip) return;
  const toggle = () => flip.classList.toggle("flipped");
  flip.addEventListener("click", () => { if (matchMedia("(hover: none)").matches) toggle(); });
  flip.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
  });
})();
