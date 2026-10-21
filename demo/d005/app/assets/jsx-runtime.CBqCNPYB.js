import{r as v,g as O}from"./index.P6snMalu.js";function j(n,f){for(var u=0;u<f.length;u++){const t=f[u];if(typeof t!="string"&&!Array.isArray(t)){for(const o in t)if(o!=="default"&&!(o in n)){const i=Object.getOwnPropertyDescriptor(t,o);i&&Object.defineProperty(n,o,i.get?i:{enumerable:!0,get:()=>t[o]})}}}return Object.freeze(Object.defineProperty(n,Symbol.toStringTag,{value:"Module"}))}var c={exports:{}},s={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var d;function g(){if(d)return s;d=1;var n=v(),f=Symbol.for("react.element"),u=Symbol.for("react.fragment"),t=Object.prototype.hasOwnProperty,o=n.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,i={key:!0,ref:!0,__self:!0,__source:!0};function m(a,e,l){var r,p={},_=null,R=null;l!==void 0&&(_=""+l),e.key!==void 0&&(_=""+e.key),e.ref!==void 0&&(R=e.ref);for(r in e)t.call(e,r)&&!i.hasOwnProperty(r)&&(p[r]=e[r]);if(a&&a.defaultProps)for(r in e=a.defaultProps,e)p[r]===void 0&&(p[r]=e[r]);return{$$typeof:f,type:a,key:_,ref:R,props:p,_owner:o.current}}return s.Fragment=u,s.jsx=m,s.jsxs=m,s}var x;function b(){return x||(x=1,c.exports=g()),c.exports}var y=b();const E=O(y),P=j({__proto__:null,default:E},[y]);export{P as J,y as j};
