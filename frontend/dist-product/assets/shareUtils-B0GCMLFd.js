const o="https://reference.invalid";function c(e,n){const t=Date.now().toString(36);return`${o}/share?type=${encodeURIComponent(e)}&id=${encodeURIComponent(n)}&cb=${t}`}export{c as getShareUrl};
