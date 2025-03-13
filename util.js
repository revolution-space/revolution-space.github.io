if (!window) { // just a stub for testing purposes in node ctx
  window = global;
  $el = { textContent: 'textContent', className: 'class!@#', click () {}, querySelectorAll () {
      return new Array(2).fill($el);
    },
  };
  copy = (...args) => l('copy()', ...args);
  document = {
    ...$el,
    body: { ...$el },
  };
}

function noop (a) { return a; }

// --- math
const lerp = (x, y, a) => x * (1 - a) + y * a;
const invlerp = (x, y, a) => (a - x) / (y - x);
const clamp = (min, max, a) => Math.min(max, Math.max(min, a));
const clip = (a) => Math.min(1, Math.max(0, a));
const rerange = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));
const step = (x, a) => a < x ? 0 : 1;
const smoothstep = (x, y, a) => a < x ? 0 : a > y ? 1 : a * a * (3 - 2 * a);
const loop = (x, y, a) => {
  const range = y - x;
  return ((a - x) % range + range) % range + x;
}
const zigzag = (x, y, a) => {
  const range = y - x;
  const n = Math.floor(a / range);
  return n % 2 ? y - (a % range) : x + (a % range);
}
const quantize = (q, a) => Math.round(a / q) * q;
const signSqrt = (a) => a < 0 ? -Math.sqrt(-a) : Math.sqrt(a);

// --- random
const rd = (a = 0, b = 1) => Math.random() * (b - a) + a;
const rdAmp = (a = 1) => (Math.random() * 2 - 1) * a;
const rdb = () => Math.random() > .5;
const rdi = (a = 0, b = 2) => Math.floor(rd(a, b));

// --- DOM
function _El (tag, props, children) {
  let $el = tag === El.fragment ? document.createDocumentFragment() : document.createElement(tag);
  if (props) {
    Object.keys(props).forEach((key) => {
      const val = props[key];
      if (typeof $el[key] === 'object' && $el[key] !== null)
        return Object.assign($el.style, val);
      $el[key] = val;
    });
  }
  if (children) {
    if (isArr(children))
      children.forEach($child => $child && $el.append($child));
    else
      $el.append(children);
  }
  return $el;
}
function El (a0, a1, a2) { // overloading
  if (Array.isArray(a0)) // 1st arg is children
    return _El(El.fragment, null, a0);
  if (typeof a0 === 'object') // 1st arg is props
    return _El('div', a0, a1);
  return _El(a0, a1, a2);
}
El.fragment = Symbol();

function Style (css, head = document.head || document.getElementsByTagName('head')[0]) {
  style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(css));
  head.appendChild(style);
}

function bindPreventAll (cb = noop) {
  return function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return cb(e);
  }
}

// --- shortcuts
function l (...args) { return console.log(...args) }
HTMLElement.prototype.on = HTMLElement.prototype.addEventListener; Window.prototype.on = Window.prototype.addEventListener;
HTMLElement.prototype.off = HTMLElement.prototype.removeEventListener; Window.prototype.off = Window.prototype.removeEventListener;
function add (a, b) { return a + b }
function isFunc (d) { d instanceof Function ? d : null; }
function join (arr, str='\n') { return arr.join(str) }
function split (str, dlmtr='') { return str.split(dlmtr) }

// --- storage
window.LocalStorage = new Proxy({}, {
    get:(t,p)=>JSON.parse(localStorage.getItem(p)),
    set:(t,p,v)=>{localStorage.setItem(p, JSON.stringify(v));return true},
});

// --- arrays
const END = Symbol('END');
function isArr (arr) { return Array.isArray(arr) }
function arr (len, filler = (i => i)) {
  const arr = [];
  for (let v, i = 0; (v = filler(i)) != END && i < len; i++)
    arr.push(v);
  return arr;
}
// l(arr(10, i => 10 + i * 2));
function range (start, end, step = 1) {
  return arr (Math.ceil((end - start) / step), i => start + i * step);
}
// l(range(2, 4, .3))

const _Array_slice = Array.prototype.slice;
Array.prototype.slice = function slice (r0 = 0, r1 = this.length) {
  return _Array_slice.call(this, r0 < 0 ? this.length + r0 : r0, r1 < 0 ? this.length + r1 : r1);
}
// l([0,1,2,3,4,5,6,7].slice(-5, -1))

function* gen (filler, limit = 1000) {
  let v, i = 0;
  while (i < limit) {
    v = filler(v, i);
    if (v === END)
      return;
    yield v;
    i++;
  }
}

function parentTree (sel) {
  return gen(($el = $(sel)) => $el?.parentNode);
}

// console.log([...])

// let _g = gen((v = '', i) => v.padStart(i, 0), 10);
// const nested = { parent: { parent: { parent: { key: '!!!', parent: 'ASD' } } }};
// let _g = gen((v = nested) => (v.key ? null : v.parent));
// // console.log([..._g])
// for (let o of _g) {
//   if (o.key)
//     console.log(o.key)
// }

// --- fast DOM
function root ($el) { return $el || (this != window ? this : (document.body)); }
function $ (sel) { return root().querySelector(sel) }
function $$ (sel) {
  let $els = [...root().querySelectorAll(sel)];
  // console.log('$$()', root(), $els);
  if (!$els.length) throw 'No $els';
  return $els }

function $use (sel) { const $els = $$(sel); return use($els.length == 1 ? $els[0] : $els) }
function txt ($el) { return $el.textContent }
function cl ($el) { return $el.className; }
function clAdd (className) { return ($el) => $el.classList.add(className); }
function fnNames (fns) { return fns.map(fn => fn.name) }
function bg (bg) { return ($el) => $el.style.background = bg }
function clAtt (str) {return (' ' + str).replace(/\]|\[|\%|\./g, r => `\\${r}`).split(' ').join('.')}

// --- functional
function bind (fn, ...args) { return function _bind (...args2) { return fn(...args, ...args2) } };
function bindr (fn, ...args) { return function _bindr (...args2) { return fn(...args2, ...args) } };
function debugFn (fn) {
  return function (...args) {
    const res = fn(...args);
    l(fn.name + '(', args, ') -> ', res);
    return res;
  }
}

function instOf (clas) { return (d) => d instanceof clas }
function ifdo (_if, fn) { return (d) => _if(d) ? fn(d) : d }
// l(ifdo(instOf(Array), l)([1,2,3]))
function reduce (fn) { return function (arr) { return arr.reduce(fn) } }

function p (name) { return (d) => d[name] }
function p_ (d) { return (name) => d[name] }
function f (name, ...args) { return (d) => d[name](...args) }
function f_ (d, ...args) { return (name) => d[name](...args) }

FLT = Symbol('FLT');
function flt (fn, o = Boolean) { return (d) => Boolean(fn ? fn(d) : d) ? d : FLT }

function pipe (...fns) {
  return (...args) => {
    let res = args[0];
    for (let i = 0; i < fns.length; i++) {
      res = fns[i](res, ...args.slice(1));
      if (res === FLT)
        return FLT;
    }
    return res;
  }
}
pi = pipe;

function use (val) {
  // if (Array.isArray(val))
  //   return (...fns) => map(...fns)(val);
  return (...fns) => pipe(...fns)(val);
}

function map (...fns) {
  return (arr) => {
    if (!('map' in arr))
      arr = [arr];
    if (!fns.length)
      return arr;

    const _pipe = pipe(...fns);
    const res = [];
    for (let i = 0; i < arr.length; i++) {
      const _res = _pipe(arr[i]);
      if (_res != FLT)
        res.push(_res);
    }
    return res;
  };
}

function getTxts (sel) { return $$(sel).map(txt) }
function getTxtsClAtt (sel) { return getTxts(clAtt(sel)) }
function nlc (arr) { return copy(join(arr)) }

// let $$histLink = $$('[aria-label="Chat history"] a'+clAtt`flex items-center gap-2 p-2`);

// --- promises
function t (a, b) {
  const aIsFn = a instanceof Function;
  let time = 1e3;
  if (aIsFn)
    return retFn(a);
  else {
    time = a;
    if (b)
      return retFn(b);
    return retFn;
  }

  function retFn (fn) {
    return new Promise ((r, j) => {
      setTimeout(() => {
        r(fn());
      }, time);
    });
  }
}

Promise.prototype._ = Promise.prototype.then;
Promise.prototype.l = function () { this.then(l).catch(console.error); return this }
function P (fn) { return new Promise(r => r(fn instanceof Function ? fn() : fn)); };
function Ps (...fns) {
  if (Array.isArray(fns[0]))
    fns = fns[0];
  return Promise.all(fns.map(P));
};

// Ps(t(100, ()=> 2), P(v => 3), v => 2)._(rdc(add)).l()
// P(()=> 2).l()
// P(t(100, ()=> 3)).l()

// NEXT doesnt work
//   Ps($$('[aria-label="Copy"]').map(($el, i) => {
//       return t(1e3 + i * 300, () => {
//         $el.click();
//         return navigator.clipboard.readText();
//       });
//     })
//   )._(copy);


// let links = map($el => [$el.getAttribute('href'), $el.textContent])($$histLink);
