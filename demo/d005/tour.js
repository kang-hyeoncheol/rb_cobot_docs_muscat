"use strict";
var DemoTour = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // demo-artifact/tour/entry.ts
  var entry_exports = {};
  __export(entry_exports, {
    Tour: () => Tour,
    load: () => load,
    start: () => start
  });

  // demo-artifact/tour/i18n.ts
  var lang = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "ko";
  var dict = {
    ko: {
      restartNote: "\uC2E4\uC2B5\uC744 \uCC98\uC74C\uBD80\uD130 \uB2E4\uC2DC \uC2DC\uC791\uD569\uB2C8\uB2E4. \uC9C0\uAE08\uAE4C\uC9C0 \uBC14\uAFBC \uAC12\uC740 \uCD08\uAE30\uD654\uB429\uB2C8\uB2E4.",
      restoring: "\uC774\uC804 \uB2E8\uACC4\uB85C \uB3CC\uC544\uAC00\uB294 \uC911\uC785\uB2C8\uB2E4\u2026",
      restoreFailed: "\uC774\uC804 \uB2E8\uACC4\uB85C \uB3CC\uC544\uAC00\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uAC70\uB098 \uCC98\uC74C\uBD80\uD130 \uC2DC\uC791\uD574 \uC8FC\uC138\uC694.",
      retry: "\uB2E4\uC2DC \uC2DC\uB3C4",
      restart: "\uCC98\uC74C\uBD80\uD130",
      holdHint: "\uAC15\uC870\uB41C \uBC84\uD2BC\uC744 \uB204\uB974\uACE0 \uACC4\uC138\uC694",
      clickHint: "\uAC15\uC870\uB41C \uACF3\uC744 \uB20C\uB7EC \uBCF4\uC138\uC694",
      prev: "\uC774\uC804",
      again: "\uB2E4\uC2DC \uD558\uAE30",
      exit: "\uC885\uB8CC",
      skip: "\uAC74\uB108\uB6F0\uAE30",
      next: "\uB2E4\uC74C",
      count: "\uAC1C\uC218",
      valueOk: "\uC815\uD655\uD788 \uC785\uB825\uD588\uC2B5\uB2C8\uB2E4 \u2713",
      valueDiffers: "\u26A0 \uC785\uB825\uD55C \uAC12\uC774 \uC548\uB0B4\uC640 \uB2EC\uB77C\uC694. \uC548\uB0B4\uB41C \uAC12\uACFC \uAC19\uAC8C \uC785\uB825\uD574 \uBCF4\uC138\uC694."
    },
    en: {
      restartNote: "Restarts the practice from the beginning. Changes made so far are reset.",
      restoring: "Going back to the previous step\u2026",
      restoreFailed: "Could not go back to the previous step. Try again or start over.",
      retry: "Try again",
      restart: "Start over",
      holdHint: "Press and hold the highlighted button",
      clickHint: "Click the highlighted area",
      prev: "Back",
      again: "Restart",
      exit: "Exit",
      skip: "Skip",
      next: "Next",
      count: "Count",
      valueOk: "Entered correctly \u2713",
      valueDiffers: "\u26A0 The value does not match the instruction. Enter it as shown."
    }
  };
  var t = dict[lang];

  // demo-artifact/tour/lib/resolve.js
  function resolveTarget(target) {
    const visible = (e) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      if (!(r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none")) return false;
      for (let n = e; n; n = n.parentElement) {
        const s2 = getComputedStyle(n);
        if (s2.opacity === "0" && s2.display !== "contents") return false;
      }
      return true;
    };
    let list = [...document.querySelectorAll(target.css)].filter(visible);
    if (target.text) list = list.filter((e) => (e.textContent || "").trim().includes(target.text));
    let el2 = list[target.nth || 0] ?? (target.orLast ? list[list.length - 1] : void 0);
    if (!el2) return target.fallback ? resolveTarget(target.fallback) : null;
    for (let i = 0; i < (target.up || 0); i++) el2 = el2.parentElement || el2;
    return el2;
  }

  // demo-artifact/tour/tour.ts
  var Z = 2147483e3;
  var PAD = 6;
  var ACCENT = "#3b82f6";
  var css = `
.dt-hole{position:fixed;z-index:${Z};pointer-events:none;border:2px solid ${ACCENT};border-radius:8px;box-shadow:0 0 0 3px rgba(59,130,246,.35);transition:all .18s ease}
.dt-hole.also{border-style:dashed}
.dt-block{position:fixed;pointer-events:auto;z-index:${Z};background:transparent}
.dt-badge{position:fixed;z-index:${Z + 1};pointer-events:none;width:26px;height:26px;border-radius:50%;background:${ACCENT};color:#fff;font:700 14px/26px system-ui,sans-serif;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.4)}
.dt-card{pointer-events:auto;position:fixed;z-index:${Z + 2};width:340px;max-width:calc(100vw - 24px);padding:16px 18px;border-radius:12px;background:#1f2430;color:#e8ebf2;border:1px solid #3a4152;box-shadow:0 12px 40px rgba(0,0,0,.5);font:14px/1.6 system-ui,-apple-system,"Noto Sans KR",sans-serif}
.dt-card h4{margin:0 0 6px;font-size:15px;font-weight:700}
.dt-card p{margin:0 0 12px;color:#c5cbd8}
.dt-step{font-size:12px;color:#8a93a6;margin-bottom:4px}
.dt-hint{display:block;box-sizing:border-box;max-width:100%;min-width:0;margin-bottom:12px;padding:6px 8px;border-radius:8px;background:rgba(59,130,246,.18);color:#8db6ff;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere}
.dt-row{display:flex;gap:8px;justify-content:flex-end}
.dt-btn{border:1px solid #3a4152;background:#2a3040;color:#e8ebf2;border-radius:8px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}
.dt-btn.primary{background:${ACCENT};border-color:${ACCENT};color:#fff}
.dt-link{margin-left:8px;border:0;background:none;color:#8db6ff;font:inherit;font-size:12px;cursor:pointer;text-decoration:underline}
.dt-btn:disabled{opacity:.4;cursor:default}
.dt-card{display:flex;flex-direction:column;max-height:calc(100vh - 24px)}
.dt-card>*{flex:none}
.dt-card>.dt-text{white-space:pre-line;flex:0 1 auto;min-height:3em;overflow-y:auto;overscroll-behavior:contain}
.dt-card>br{display:none}
.dt-hint.dt-warn{background:rgba(239,68,68,.2);color:#ff9a9a;font-weight:600}
.dt-hint.dt-ok{background:rgba(34,197,94,.2);color:#7ee2a0;font-weight:600}
.dt-card>.dt-hint{align-self:stretch;flex:0 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.dt-dim{position:fixed;inset:0;z-index:${Z};pointer-events:none;background:rgba(0,0,0,.62)}
@media (max-height:520px){
.dt-card{width:280px;max-height:72vh;padding:10px 12px;font-size:12px;line-height:1.5}
.dt-card h4{font-size:13px;margin-bottom:4px}
.dt-card p{margin-bottom:8px}
.dt-step{font-size:11px;margin-bottom:2px}
.dt-hint{margin-bottom:8px;font-size:11px}
.dt-btn{padding:5px 10px;font-size:12px}
}
`;
  var el = (tag, cls, parent) => {
    const e = document.createElement(tag);
    e.className = cls;
    (parent ?? document.body).appendChild(e);
    return e;
  };
  var setInputValue = (input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    commitInput(input, 60);
  };
  var commitInput = (input, delayMs = 0) => {
    if (!(input instanceof HTMLInputElement)) return;
    const fire = () => input.isConnected && input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    if (delayMs) setTimeout(fire, delayMs);
    else fire();
  };
  var press = (t2) => {
    const r = t2.getBoundingClientRect();
    const base = { bubbles: true, cancelable: true, composed: true, button: 0, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    t2.dispatchEvent(new PointerEvent("pointerdown", { ...base, pointerType: "mouse", isPrimary: true, buttons: 1 }));
    t2.dispatchEvent(new MouseEvent("mousedown", { ...base, buttons: 1 }));
    t2.dispatchEvent(new PointerEvent("pointerup", { ...base, pointerType: "mouse", isPrimary: true }));
    t2.dispatchEvent(new MouseEvent("mouseup", base));
    t2.dispatchEvent(new MouseEvent("click", base));
  };
  var nextFrames = async (n) => {
    for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(() => r()));
  };
  var complement = (boxes, vw, vh) => {
    const xs = [...new Set([0, vw, ...boxes.flatMap((b) => [b.x, b.x + b.w])].map((v) => Math.max(0, Math.min(vw, v))))].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[i], x1 = xs[i + 1];
      const iv = boxes.filter((b) => b.x <= x0 && b.x + b.w >= x1).map((b) => [Math.max(0, b.y), Math.min(vh, b.y + b.h)]).sort((a, b) => a[0] - b[0]);
      let y = 0;
      for (const [a, b] of iv) {
        if (a > y) out.push([x0, y, x1 - x0, a - y]);
        y = Math.max(y, b);
      }
      if (y < vh) out.push([x0, y, x1 - x0, vh - y]);
    }
    return out.filter((r) => r[2] > 0 && r[3] > 0);
  };
  function unionRects(rects) {
    const xs = [...new Set(rects.flatMap((r) => [r.x, r.x + r.w]))].sort((a, b) => a - b);
    const ys = [...new Set(rects.flatMap((r) => [r.y, r.y + r.h]))].sort((a, b) => a - b);
    const out = [];
    for (let j = 0; j < ys.length - 1; j++) {
      const cy = (ys[j] + ys[j + 1]) / 2;
      let start2 = -1;
      for (let i = 0; i <= xs.length - 1; i++) {
        const on = i < xs.length - 1 && rects.some((r) => (xs[i] + xs[i + 1]) / 2 > r.x && (xs[i] + xs[i + 1]) / 2 < r.x + r.w && cy > r.y && cy < r.y + r.h);
        if (on && start2 < 0) start2 = i;
        if (!on && start2 >= 0) {
          out.push({ x: xs[start2], y: ys[j], w: xs[i] - xs[start2], h: ys[j + 1] - ys[j] });
          start2 = -1;
        }
      }
    }
    return out;
  }
  function unionOutline(rects) {
    const xs = [...new Set(rects.flatMap((r) => [r.x, r.x + r.w]))].sort((a, b) => a - b);
    const ys = [...new Set(rects.flatMap((r) => [r.y, r.y + r.h]))].sort((a, b) => a - b);
    const cov = (i, j) => {
      if (i < 0 || j < 0 || i >= xs.length - 1 || j >= ys.length - 1) return false;
      const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      return rects.some((r) => cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h);
    };
    const merge = (segs) => {
      segs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const out = [];
      for (const g of segs) {
        const last = out[out.length - 1];
        if (last && last[0] === g[0] && last[2] >= g[1]) last[2] = Math.max(last[2], g[2]);
        else out.push([...g]);
      }
      return out;
    };
    const v = [], h = [];
    for (let i = 0; i < xs.length; i++) for (let j = 0; j < ys.length - 1; j++) if (cov(i - 1, j) !== cov(i, j)) v.push([xs[i], ys[j], ys[j + 1]]);
    for (let j = 0; j < ys.length; j++) for (let i = 0; i < xs.length - 1; i++) if (cov(i, j - 1) !== cov(i, j)) h.push([ys[j], xs[i], xs[i + 1]]);
    return [
      ...merge(v).map(([x, y1, y2]) => [x, y1, x, y2]),
      ...merge(h).map(([y, x1, x2]) => [x1, y, x2, y])
    ];
  }
  var sameValue = (a, b) => {
    const x = a.replace(/\s+/g, ""), y = b.replace(/\s+/g, "");
    return x === y || x !== "" && y !== "" && Number.isFinite(Number(x)) && Number.isFinite(Number(y)) && Number(x) === Number(y);
  };
  var Tour = class {
    constructor(scenario, opts = {}) {
      this.scenario = scenario;
      this.opts = opts;
      this.idx = 0;
      this.nodes = [];
      this.cleanup = [];
      this.raf = 0;
      this.token = 0;
      // 단계별로 처음 보여줬던 화면 경로. 이전/건너뛰기로 돌아올 때 같은 화면으로 되돌린다.
      this.paths = [];
      this.unlock = null;
      this.keypadInput = null;
      /** 단계가 바뀌는 사이에 화면 전체가 밝아지지 않도록 앞 단계의 강조 막을 다음 단계가 그려질 때까지 그대로 둔다. */
      this.stale = [];
      /**
       * 조작(클릭·건너뛰기)이 일어난 순간 설명 카드를 치운다. 강조 영역은 계속 갱신해, 목록이 닫혀 사라진 대상은 강조에서 빠지고
       * 남아 있는 영역(카드 등)의 테두리는 화면을 그대로 따라가게 한다. 다음 단계가 그려질 때 draw()가 이 상태를 푼다.
       */
      this.holding = false;
      if (!document.getElementById("dt-style")) {
        const s = document.createElement("style");
        s.id = "dt-style";
        s.textContent = css;
        document.head.appendChild(s);
      }
    }
    get steps() {
      return this.scenario.steps;
    }
    /** '이전': 그 단계의 화면 경로로만 돌아간다. 앱 상태는 되돌리지 않는다(되돌리려면 실습 재시작). */
    previous() {
      this.show(this.idx - 1);
    }
    clear() {
      this.keypadInput = null;
      cancelAnimationFrame(this.raf);
      this.cleanup.forEach((f) => f());
      this.cleanup = [];
      this.nodes.forEach((n) => n.remove());
      this.nodes = [];
      this.dropStale();
    }
    dropStale() {
      this.stale.forEach((n) => n.remove());
      this.stale = [];
    }
    holdOverlay() {
      this.holding = true;
      const card = this.nodes.find((n) => n.classList.contains("dt-card"));
      card?.remove();
      this.nodes = this.nodes.filter((n) => n !== card);
    }
    /** 앞 단계의 막을 움직이지 않게 굳히고(위치 갱신·이벤트 처리 중단) 화면에는 남겨 둔다. */
    freeze(keepCard = false) {
      this.keypadInput = null;
      cancelAnimationFrame(this.raf);
      this.cleanup.forEach((f) => f());
      this.cleanup = [];
      for (const n of this.nodes) {
        if (n.classList.contains("dt-dismiss") || !keepCard && n.classList.contains("dt-card")) n.remove();
        else this.stale.push(n);
      }
      this.nodes = [];
    }
    /**
     * 단계가 바뀌는 사이(클릭 뒤 대기, 화면 준비·대상 탐색 중)에는 강조 막이 없어 앱이 그대로 눌린다.
     * select 처럼 열리는 데 시간이 걸리는 대상은 이 틈에 다른 곳을 눌러 시나리오가 꼬일 수 있으므로,
     * 다음 단계가 그려질 때까지 화면 전체와 키보드를 막는다. 다음 단계를 그리는 draw()가 이 막을 푼다.
     */
    lockInput() {
      if (this.opts.shot || this.unlock) return;
      const b = el("div", "dt-block");
      b.style.inset = "0";
      for (const type of ["pointerdown", "mousedown", "touchstart", "click"]) {
        b.addEventListener(type, (e) => {
          e.stopPropagation();
          e.preventDefault();
        });
      }
      document.body.appendChild(b);
      const key = (e) => {
        const t2 = e.target;
        if (t2?.closest(".dt-card")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      for (const type of ["keydown", "keypress", "keyup"]) window.addEventListener(type, key, true);
      this.unlock = () => {
        b.remove();
        for (const type of ["keydown", "keypress", "keyup"]) window.removeEventListener(type, key, true);
        this.unlock = null;
      };
    }
    restart() {
      this.stop();
      if (this.opts.onRestart) this.opts.onRestart();
      else location.href = window.__DEMO_ENTRY__ ?? location.href;
    }
    stop() {
      this.token++;
      this.clear();
      this.unlock?.();
    }
    // 앱 라우터(react-router)는 popstate 로 주소 변경을 감지한다.
    navigate(path) {
      history.pushState(null, "", path + location.search);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    waitTarget(step, token) {
      if (!step.target) return Promise.resolve(null);
      const target = step.target;
      return new Promise((resolve) => {
        const t0 = performance.now();
        const tick = () => {
          if (token !== this.token) return resolve(null);
          const found = resolveTarget(target);
          if (found) return resolve(found);
          if (performance.now() - t0 > 8e3) return resolve(null);
          requestAnimationFrame(tick);
        };
        tick();
      });
    }
    /** 단계에 필요한 화면 준비(`ensure`). 대상이 이미 있으면 아무것도 하지 않는다. 중간에 단계가 바뀌면 false. */
    /** 대상의 위치·크기가 두 프레임 연속 같을 때까지(최대 1초) 기다린다. 토큰이 바뀌면 false. */
    async waitSettled(el2, token) {
      const key = () => {
        const r = el2.getBoundingClientRect();
        return `${r.x},${r.y},${r.width},${r.height}`;
      };
      const t0 = performance.now();
      let prev = key(), same = 0;
      while (same < 2 && performance.now() - t0 < 1e3) {
        await nextFrames(1);
        if (token !== this.token) return false;
        const cur = key();
        same = cur === prev ? same + 1 : 0;
        prev = cur;
      }
      return true;
    }
    /** 조건이 참이 될 때까지(최대 timeoutMs) 프레임마다 확인한다. 시간이 지나도 계속 진행하고, 토큰이 바뀌면 false. */
    async waitUntil(done, token, timeoutMs) {
      const t0 = performance.now();
      while (!done() && performance.now() - t0 < timeoutMs) {
        await nextFrames(1);
        if (token !== this.token) return false;
      }
      return true;
    }
    async runEnsure(step, token, settleMs = 0) {
      if (!step.ensure) return true;
      for (const ensure of Array.isArray(step.ensure) ? step.ensure : [step.ensure]) {
        if (settleMs && !await this.waitUntil(() => !!resolveTarget(ensure.when), token, settleMs)) return false;
        if (resolveTarget(ensure.when)) continue;
        for (const [k, t2] of ensure.press.entries()) {
          const el2 = await this.waitTarget({ ...step, target: t2 }, token);
          if (token !== this.token) return false;
          if (el2 && !await this.waitSettled(el2, token)) return false;
          if (el2) press(el2);
          if (k === ensure.press.length - 1) {
            if (!await this.waitUntil(() => !!resolveTarget(ensure.when), token, 3e3)) return false;
          } else await nextFrames(2);
        }
      }
      return true;
    }
    /**
     * 프로그램 명령 화면의 입력칸(조건·변수 이름 등)은 화면 키보드(RBProgramKeypad)를 연다. 이 단계의 조작 대상이 입력칸이 아니면 닫는다.
     * 열린 채로 두면 화면이 키보드 높이만큼 밀려 대상(예: 저장 버튼)이 화면 위로 올라가 눌러도 닿지 않고, 진입 상태(스크롤 위치)도 키보드에 따라 달라진다.
     * 진입 상태를 저장하기 전에 닫고 화면이 제자리로 돌아올 때까지 기다린다.
     */
    async closeProgramKeypad(step, target, token) {
      const pad = document.querySelector(".RBProgramKeypad");
      const close = pad?.querySelector(".hg-button-close");
      const focused = document.activeElement;
      if (!pad || !close || this.inputTargets(step, target).some((a) => a && focused && a.contains(focused))) return true;
      document.activeElement?.blur();
      close.click();
      await nextFrames(4);
      return token === this.token;
    }
    /** 단계의 fill(하나 또는 여러 개): 입력창이 비어 있으면 값을 채운다. 토큰이 바뀌면(다른 단계로 이동) false. */
    async runFill(step, token) {
      for (const f of [step.fill ?? []].flat()) {
        const input = await this.waitTarget({ ...step, target: f.target }, token);
        if (token !== this.token) return false;
        if (input && (!input.value || input.value === f.replaceIf)) {
          setInputValue(input, f.value);
          await new Promise((r) => setTimeout(r, 150));
        }
      }
      return true;
    }
    async show(i, opts = this.opts) {
      var _a, _b;
      this.opts = opts;
      this.idx = Math.max(0, Math.min(this.steps.length - 1, i));
      const token = ++this.token;
      this.freeze();
      const step = this.steps[this.idx];
      if (this.opts.explainOnly) {
        this.draw(step, null, token);
        return true;
      }
      this.lockInput();
      const seen = this.paths[this.idx];
      if (seen && seen !== location.pathname) this.navigate(seen);
      else (_a = this.paths)[_b = this.idx] ?? (_a[_b] = location.pathname);
      if (!await this.runEnsure(step, token)) return false;
      if (!await this.runFill(step, token)) return false;
      let target = await this.waitTarget(step, token);
      if (token !== this.token) return false;
      if (!await this.closeProgramKeypad(step, target, token)) return false;
      if (step.target) target = await this.waitTarget(step, token) ?? target;
      if (target && !await this.waitSettled(target, token)) return false;
      if (step.target && !target) console.warn("[tour] target not found:", step.id);
      this.draw(step, target, token);
      return !step.target || !!target;
    }
    draw(step, target, token) {
      this.holding = false;
      this.dropStale();
      this.unlock?.();
      const shot = !!this.opts.shot;
      for (const def of step.lift ?? []) {
        const lifted = resolveTarget(def);
        if (!lifted) continue;
        const before = { position: lifted.style.position, zIndex: lifted.style.zIndex };
        if (getComputedStyle(lifted).position === "static") lifted.style.position = "relative";
        lifted.style.zIndex = "200";
        this.cleanup.push(() => {
          lifted.style.position = before.position;
          lifted.style.zIndex = before.zIndex;
        });
      }
      const alsoDefs = target ? step.also ?? [] : [];
      const openDefs = target ? step.open ?? [] : [];
      const holes = target ? [target, ...openDefs, ...alsoDefs].map((_, k) => el("div", "dt-hole" + (k > openDefs.length ? " also" : ""))) : [];
      const SVG_NS = "http://www.w3.org/2000/svg";
      const outlineSvg = target && alsoDefs.length ? document.createElementNS(SVG_NS, "svg") : null;
      if (outlineSvg) {
        outlineSvg.setAttribute("style", `position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:${Z};pointer-events:none;overflow:visible`);
        document.body.appendChild(outlineSvg);
      }
      const badge = target && shot ? el("div", "dt-badge") : null;
      if (badge) badge.textContent = String(this.steps.slice(0, this.idx + 1).filter((s) => s.target).length);
      const interactive = !!(step.advance || step.hint || step.require || step.requireValue || step.requireEnabled || step.free || openDefs.length);
      const blockers = [];
      const dismissers = [];
      const syncDismissers = () => {
        const popups = interactive ? this.dismissiblePopups(step, target) : [];
        const popupBoxes = popups.map((p) => {
          const r = p.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        });
        const rects = popupBoxes.length ? complement(popupBoxes, innerWidth, innerHeight) : [];
        while (dismissers.length < rects.length) {
          const b = el("div", "dt-block dt-dismiss");
          b.style.zIndex = String(Z + 1);
          for (const type of ["pointerdown", "mousedown", "touchstart", "click"]) {
            b.addEventListener(type, (e) => e.preventDefault());
          }
          dismissers.push(b);
          this.nodes.push(b);
        }
        dismissers.forEach((b, k) => {
          const r = rects[k];
          if (!r) return void (b.style.display = "none");
          Object.assign(b.style, { display: "", left: `${r[0]}px`, top: `${r[1]}px`, width: `${r[2]}px`, height: `${r[3]}px` });
        });
      };
      const syncBlockers = (n) => {
        while (blockers.length < n) {
          const b = el("div", "dt-block");
          for (const type of ["pointerdown", "mousedown", "touchstart", "click"]) {
            b.addEventListener(type, (e) => {
              e.stopPropagation();
              e.preventDefault();
            });
          }
          blockers.push(b);
          this.nodes.push(b);
        }
        blockers.forEach((b, k) => b.style.display = k < n ? "" : "none");
      };
      const dim = !shot && !this.opts.explainOnly ? el("div", "dt-dim") : null;
      const card = shot ? null : el("div", "dt-card");
      if (card) {
        card.addEventListener("pointerdown", (e) => {
          if (!this.dismissiblePopups(step, target).length) e.stopPropagation();
        });
        card.addEventListener("mousedown", (e) => e.preventDefault());
        card.addEventListener("click", (e) => e.stopPropagation());
      }
      this.nodes = [...holes, outlineSvg, badge, dim, card].filter(Boolean);
      if (card) this.fillCard(card, step);
      const keypadEl = resolveTarget({ css: "[data-slot=number-keypad]" });
      if (keypadEl && !this.inputTargets(step, target).includes(keypadEl)) {
        document.activeElement?.blur();
        [...keypadEl.querySelectorAll("button")].find((b) => /^(close|닫기)$/i.test(b.textContent?.trim() ?? ""))?.click();
      }
      const POPUP = "[data-slot=select-drop-box],[role=menu],[role=dialog],[data-slot=popover-content],[data-slot=rb-popover-content]";
      const anchor = () => {
        const cands = [...alsoDefs.map((d) => resolveTarget(d)), target];
        return cands.find((e) => !!e && e.isConnected && !e.closest(POPUP)) ?? null;
      };
      const hidden = (r) => Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) < Math.min(r.height, innerHeight * 0.5);
      const lopsided = (r) => r.height < innerHeight * 0.8 && (r.top + r.height / 2 < innerHeight * 0.25 || r.top + r.height / 2 > innerHeight * 0.75);
      const first = anchor();
      if (first) {
        const r = first.getBoundingClientRect();
        if (hidden(r) || lopsided(r)) first.scrollIntoView({ block: "center" });
      }
      let lastCenter = performance.now();
      const place = () => {
        if (token !== this.token) return;
        target = step.target ? resolveTarget(step.target) : null;
        if (!this.holding && performance.now() - lastCenter > 400) {
          const a = anchor();
          if (a && hidden(a.getBoundingClientRect())) {
            a.scrollIntoView({ block: "center" });
            lastCenter = performance.now();
          }
        }
        if ((target || this.holding) && holes.length) {
          const els = [target, ...openDefs, ...alsoDefs].map((d) => d === target ? target : resolveTarget(d));
          const boxes = els.map((e) => {
            if (!e) return null;
            const r = e.getBoundingClientRect();
            const padX = Math.max(0, Math.min(PAD, r.left - 3, innerWidth - r.right - 3));
            const padY = Math.max(0, Math.min(PAD, r.top - 3, innerHeight - r.bottom - 3));
            return { x: r.left - padX, y: r.top - padY, w: r.width + padX * 2, h: r.height + padY * 2 };
          });
          const keypad = interactive ? this.inputTargets(step, target).find((e) => e?.matches("[data-slot=number-keypad]")) : null;
          const keypadRect = keypad?.getBoundingClientRect();
          const keypadBoxes = keypadRect ? [{ x: keypadRect.x, y: keypadRect.y, w: keypadRect.width, h: keypadRect.height }] : [];
          boxes.forEach((bx, k) => {
            if (!bx) return void (holes[k].style.display = "none");
            Object.assign(holes[k].style, { display: "", left: `${bx.x}px`, top: `${bx.y}px`, width: `${bx.w}px`, height: `${bx.h}px` });
          });
          if (outlineSvg) {
            const T = 4, firstAlso = openDefs.length + 1;
            const near = (a, b) => a.x - T < b.x + b.w && b.x - T < a.x + a.w && a.y - T < b.y + b.h && b.y - T < a.y + a.h;
            const idx = boxes.map((_, k) => k).filter((k) => boxes[k]);
            const group = new Map(idx.map((k) => [k, k]));
            const find = (k) => group.get(k) === k ? k : find(group.get(k));
            for (const i of idx) for (const j of idx) if (i < j && near(boxes[i], boxes[j])) group.set(find(j), find(i));
            const merged = /* @__PURE__ */ new Set();
            const lines = [];
            for (const root of new Set(idx.map(find))) {
              const members = idx.filter((k) => find(k) === root);
              const alsoMembers = members.filter((k) => k >= firstAlso);
              if (members.length < 2 || !alsoMembers.length) continue;
              alsoMembers.forEach((k) => merged.add(k));
              lines.push(...unionOutline(members.map((k) => k >= firstAlso ? { x: boxes[k].x - T / 2, y: boxes[k].y - T / 2, w: boxes[k].w + T, h: boxes[k].h + T } : boxes[k])));
            }
            merged.forEach((k) => holes[k].style.display = "none");
            const svgLine = (l, style) => `<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}" ${style}/>`;
            outlineSvg.innerHTML = lines.map((l) => svgLine(l, 'stroke="rgba(59,130,246,.35)" stroke-width="8" stroke-linecap="round"')).join("") + lines.map((l) => svgLine(l, `stroke="${ACCENT}" stroke-width="2" stroke-dasharray="6 4"`)).join("");
          }
          if (badge && boxes[0]) Object.assign(badge.style, { left: `${Math.max(4, boxes[0].x - 18)}px`, top: `${Math.max(4, boxes[0].y - 18)}px` });
          const vw = innerWidth, vh = innerHeight;
          if (dim) {
            const vis = [...boxes.filter(Boolean), ...keypadBoxes];
            const cut = unionRects(vis).map((b) => `M${b.x} ${b.y}h${b.w}v${b.h}h${-b.w}Z`);
            dim.style.clipPath = `path(evenodd, 'M0 0H${vw}V${vh}H0Z ${cut.join(" ")}')`;
          }
          if (!shot) {
            const passable = interactive ? [...boxes.slice(0, 1 + openDefs.length).filter(Boolean), ...keypadBoxes] : [];
            const rects = complement(passable, vw, vh);
            syncBlockers(rects.length);
            rects.forEach(
              (r, k) => Object.assign(blockers[k].style, { left: `${r[0]}px`, top: `${r[1]}px`, width: `${r[2]}px`, height: `${r[3]}px` })
            );
            syncDismissers();
          }
          if (card && !this.holding) this.placeCard(card, [...boxes.filter(Boolean), ...keypadBoxes]);
        } else if (card) {
          Object.assign(card.style, {
            left: `${(innerWidth - card.offsetWidth) / 2}px`,
            top: `${(innerHeight - card.offsetHeight) / 2}px`
          });
        }
        this.raf = requestAnimationFrame(place);
      };
      place();
      if (!shot && target) this.armAdvance(step, target);
      if (!shot && !this.opts.explainOnly) this.guardKeys(step, target, interactive);
      if (!shot && openDefs.some((d) => resolveTarget(d)?.tagName === "CANVAS")) {
        this.guardCanvasInputs(step, target);
      }
    }
    /** 키패드는 현재 단계에서 조작 가능한 입력창에 연결되어 있을 때만 허용한다. */
    inputTargets(step, target) {
      const allowed = [step.target ? resolveTarget(step.target) : target, ...(step.open ?? []).map((d) => resolveTarget(d))];
      const keypad = resolveTarget({ css: "[data-slot=number-keypad]" });
      const focused = document.activeElement;
      if (focused?.matches("input[data-slot=side-number-input-field]")) {
        this.keypadInput = focused;
      } else if (!focused || !keypad?.contains(focused) && !focused.closest(".dt-card")) {
        this.keypadInput = null;
      }
      const owner = this.keypadInput;
      if (keypad && owner?.isConnected && allowed.some((a) => a?.contains(owner))) allowed.push(keypad);
      return allowed;
    }
    /** 현재 조작을 허용한 메뉴·팝오버만 바깥 클릭으로 닫을 수 있다. 입력/확인 모달은 유지한다. */
    dismissiblePopups(step, target) {
      const allowed = this.inputTargets(step, target);
      const candidates = document.querySelectorAll(
        '[role="menu"], [data-slot="popover-content"], [data-slot="rb-popover-content"]'
      );
      return [...candidates].filter((popup) => {
        const r = popup.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(popup).visibility !== "hidden" && allowed.some((a) => a && (a.contains(popup) || popup.contains(a)));
      });
    }
    /** 캔버스 위에 겹친 메뉴는 사각형 차단막으로 구분할 수 없으므로 실제 이벤트 대상도 확인한다. */
    guardCanvasInputs(step, target) {
      const handler = (e) => {
        const t2 = e.target;
        if (!(t2 instanceof Element) || t2.closest(".dt-card")) return;
        if (t2.closest(".dt-dismiss") && this.dismissiblePopups(step, target).length) return;
        const allowed = this.inputTargets(step, target);
        if (allowed.some((a) => a && (a === t2 || a.contains(t2)))) return;
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      for (const type of ["pointerdown", "mousedown", "touchstart", "click", "dblclick", "contextmenu", "wheel"]) {
        window.addEventListener(type, handler, { capture: true, passive: false });
        this.cleanup.push(() => window.removeEventListener(type, handler, true));
      }
    }
    /**
     * 강조된 곳 밖에서는 키보드 조작(Enter·Space 로 포커스된 버튼 누르기, 입력 등)도 막는다.
     * 마우스는 막(blocker)으로 막지만 키보드는 막히지 않아, 이전 단계에서 포커스가 남은 버튼이 눌릴 수 있다.
     */
    guardKeys(step, target, interactive) {
      const handler = (e) => {
        const t2 = e.target;
        if (!t2 || t2.closest(".dt-card")) return;
        if (e.key === "Escape") {
          if (interactive && this.dismissiblePopups(step, target).length) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        if (interactive) {
          const allowed = this.inputTargets(step, target);
          if (allowed.some((a) => a && (a === t2 || a.contains(t2)))) return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      for (const type of ["keydown", "keypress", "keyup"]) {
        window.addEventListener(type, handler, true);
        this.cleanup.push(() => window.removeEventListener(type, handler, true));
      }
    }
    fillCard(card, step) {
      const n = this.steps.length;
      const last = this.idx === n - 1;
      card.innerHTML = "";
      const c = el("div", "dt-step", card);
      c.textContent = `${this.idx + 1} / ${n}`;
      if (this.opts.onRestart && !last && this.idx > 0) {
        const again = el("button", "dt-link", c);
        again.textContent = t.restart;
        again.title = t.restartNote;
        again.onclick = () => this.restart();
      }
      const h = el("h4", "", card);
      h.textContent = step.title;
      const p = el("p", "dt-text", card);
      p.textContent = step.text;
      if (step.advance === "click" || step.advance === "hold") {
        const hint = el("span", "dt-hint", card);
        hint.textContent = step.advance === "hold" ? t.holdHint : t.clickHint;
        card.appendChild(document.createElement("br"));
      }
      if (step.hint && !step.advance) {
        const hint = el("span", "dt-hint", card);
        hint.textContent = step.hint;
        card.appendChild(document.createElement("br"));
      }
      const row = el("div", "dt-row", card);
      const prev = el("button", "dt-btn", row);
      prev.textContent = t.prev;
      prev.disabled = this.idx === 0;
      prev.onclick = () => this.previous();
      if (this.scenario.noPrevious) prev.style.display = "none";
      const embedded = window.parent !== window;
      const next = el("button", embedded && last ? "dt-btn" : "dt-btn primary", row);
      if (last) {
        next.textContent = t.again;
        next.onclick = () => this.restart();
        if (embedded || this.opts.onExit) {
          const exit = el("button", "dt-btn primary", row);
          exit.textContent = t.exit;
          exit.onclick = () => this.opts.onExit ? this.opts.onExit() : window.parent.postMessage({ type: "demo-tour-exit" }, location.origin);
        }
      } else {
        next.textContent = step.advance ? t.skip : t.next;
        if (step.minCount) {
          const mc = step.minCount;
          const prog = el("span", "dt-hint", card);
          card.insertBefore(prog, row);
          const sync = () => {
            const n2 = document.querySelectorAll(mc.css).length;
            next.disabled = n2 < mc.min;
            prog.textContent = `${mc.label ?? t.count} ${Math.min(n2, mc.min)} / ${mc.min}` + (n2 < mc.min ? "" : " \u2713");
          };
          sync();
          const timer = setInterval(sync, 150);
          this.cleanup.push(() => clearInterval(timer));
        }
        if (step.requireEnabled) {
          const req = step.requireEnabled;
          const sync = () => {
            const el2 = resolveTarget(req);
            next.disabled = !el2 || el2.disabled || el2.getAttribute("aria-disabled") === "true";
          };
          next.disabled = true;
          let live = true;
          requestAnimationFrame(() => requestAnimationFrame(() => live && sync()));
          const timer = setInterval(sync, 150);
          this.cleanup.push(() => {
            live = false;
            clearInterval(timer);
          });
        }
        if (step.require) {
          const req = step.require;
          const sync = () => {
            const input = resolveTarget(req);
            next.disabled = !input || !input.value.trim();
          };
          sync();
          const timer = setInterval(sync, 150);
          this.cleanup.push(() => clearInterval(timer));
        }
        if (step.requireValue) {
          const rv = step.requireValue;
          const msg = el("span", "dt-hint", card);
          card.insertBefore(msg, row);
          const sync = () => {
            const input = resolveTarget(rv.target);
            const value = input?.value ?? "";
            const ok = !!input && sameValue(value, rv.equals);
            next.textContent = ok ? t.next : t.skip;
            msg.textContent = ok ? t.valueOk : value.trim() ? t.valueDiffers : "";
            msg.className = `dt-hint ${ok ? "dt-ok" : "dt-warn"}`;
            msg.style.display = msg.textContent ? "" : "none";
          };
          sync();
          const timer = setInterval(sync, 150);
          this.cleanup.push(() => clearInterval(timer));
        }
        next.onclick = () => {
          commitInput(document.activeElement);
          if (step.requireValue) {
            const input = resolveTarget(step.requireValue.target);
            if (input && !sameValue(input.value, step.requireValue.equals)) setInputValue(input, step.requireValue.equals);
          }
          const t2 = step.advance === "click" ? resolveTarget(step.target) : null;
          if (t2) {
            setTimeout(() => {
              this.holdOverlay();
              press(t2);
            }, 0);
          } else this.show(this.idx + 1);
        };
      }
    }
    // 카드를 대상 옆에 붙인다. 후보 위치는 화면 안으로 보정하고, 대상(강조 영역)을 가리지 않는 첫 후보를 쓴다.
    // (가장자리 대상은 보정 없이는 모든 후보가 탈락해 엉뚱한 구석으로 밀리고, 대상을 덮는다.)
    placeCard(card, boxes) {
      const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
      const box = {
        x: x0,
        y: y0,
        w: Math.max(...boxes.map((b) => b.x + b.w)) - x0,
        h: Math.max(...boxes.map((b) => b.y + b.h)) - y0
      };
      const gap = 14, m = 8;
      const cw = card.offsetWidth, ch = card.offsetHeight;
      const vw = innerWidth, vh = innerHeight;
      const clampX = (x) => Math.max(m, Math.min(vw - cw - m, x));
      const clampY = (y) => Math.max(m, Math.min(vh - ch - m, y));
      const cx = box.x + box.w / 2 - cw / 2;
      const cy = box.y + box.h / 2 - ch / 2;
      const cands = [
        { x: box.x + box.w + gap, y: cy },
        { x: box.x - cw - gap, y: cy },
        { x: cx, y: box.y + box.h + gap },
        { x: cx, y: box.y - ch - gap }
      ].map((c) => ({ x: clampX(c.x), y: clampY(c.y) }));
      const overlap = (c) => boxes.reduce((sum, b) => {
        const w = Math.min(c.x + cw, b.x + b.w) - Math.max(c.x, b.x);
        const h = Math.min(c.y + ch, b.y + b.h) - Math.max(c.y, b.y);
        return sum + (w > 0 && h > 0 ? w * h : 0);
      }, 0);
      let pos = cands.find((c) => overlap(c) === 0);
      if (!pos) {
        const p = boxes[0];
        const alongY = [vh, p.y + (p.h - ch) / 2, p.y];
        const alongX = [vw, p.x + (p.w - cw) / 2, p.x];
        const side = [
          ...alongY.map((y) => ({ x: p.x - cw - gap, y })),
          ...alongY.map((y) => ({ x: p.x + p.w + gap, y })),
          ...alongX.map((x) => ({ x, y: p.y - ch - gap })),
          ...alongX.map((x) => ({ x, y: p.y + p.h + gap }))
        ].map((c) => ({ x: clampX(c.x), y: clampY(c.y) }));
        const primaryOverlap = (c) => {
          const w = Math.min(c.x + cw, p.x + p.w) - Math.max(c.x, p.x);
          const h = Math.min(c.y + ch, p.y + p.h) - Math.max(c.y, p.y);
          return w > 0 && h > 0 ? w * h : 0;
        };
        pos = side.reduce((a, c) => {
          const sa = primaryOverlap(a) * 1e3 + overlap(a);
          const sc = primaryOverlap(c) * 1e3 + overlap(c);
          return sc < sa ? c : a;
        });
      }
      card.style.left = `${pos.x}px`;
      card.style.top = `${pos.y}px`;
    }
    armAdvance(step, target) {
      const go = (delay) => {
        this.holdOverlay();
        this.lockInput();
        const t2 = this.token;
        setTimeout(() => t2 === this.token && this.show(this.idx + 1), delay);
      };
      if (step.advance === "click") {
        const on = () => go(450);
        target.addEventListener("click", on, { once: true, capture: true });
        this.cleanup.push(() => target.removeEventListener("click", on, true));
      } else if (step.advance === "hold") {
        let down = false;
        const onDown = () => down = true;
        const onUp = () => down && go(600);
        target.addEventListener("pointerdown", onDown, true);
        window.addEventListener("pointerup", onUp, true);
        this.cleanup.push(() => {
          target.removeEventListener("pointerdown", onDown, true);
          window.removeEventListener("pointerup", onUp, true);
        });
      }
    }
  };

  // demo-artifact/tour/lib/localize.js
  var isLocalized = (v) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    const keys = Object.keys(v);
    return keys.includes("ko") && keys.every((k) => /^[a-z]{2}$/.test(k));
  };
  function localize(value, lang2 = "ko") {
    if (isLocalized(value)) return value[lang2] ?? value.ko;
    if (Array.isArray(value)) return value.map((v) => localize(v, lang2));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, localize(v, lang2)]));
    }
    return value;
  }

  // demo-artifact/tour/entry.ts
  function start({ scenario, ...opts }) {
    const prev = window.__tour;
    prev?.stop();
    const tour = new Tour(scenario, opts);
    window.__tour = tour;
    if (!opts.shot) void tour.show(0);
    return tour;
  }
  async function load(url, lang2 = "ko") {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`\uC2DC\uB098\uB9AC\uC624\uB97C \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: ${url} (${res.status})`);
    const s = localize(await res.json(), lang2);
    if (!Array.isArray(s.steps)) throw new Error(`\uC2DC\uB098\uB9AC\uC624 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4: ${url}`);
    return s;
  }
  return __toCommonJS(entry_exports);
})();
