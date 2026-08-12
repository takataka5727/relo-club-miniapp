(function () {
  "use strict";

  const VERSION = 3;
  const SIZE = VERSION * 4 + 17;
  const DATA_CODEWORDS = 55;
  const ECC_CODEWORDS = 15;

  function appendBits(target, value, length) {
    for (let i = length - 1; i >= 0; i -= 1) target.push((value >>> i) & 1);
  }

  function multiply(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i -= 1) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  function computeDivisor(degree) {
    const result = new Array(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;

    for (let i = 0; i < degree; i += 1) {
      for (let j = 0; j < result.length; j += 1) {
        result[j] = multiply(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = multiply(root, 2);
    }
    return result;
  }

  function computeRemainder(data, divisor) {
    const result = new Array(divisor.length).fill(0);
    data.forEach((byte) => {
      const factor = byte ^ result[0];
      result.shift();
      result.push(0);
      for (let i = 0; i < result.length; i += 1) result[i] ^= multiply(divisor[i], factor);
    });
    return result;
  }

  function createCodewords(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    if (bytes.length > 53) throw new Error("URLが長すぎるためQRコードを作成できません。");

    const bits = [];
    appendBits(bits, 0x4, 4);
    appendBits(bits, bytes.length, 8);
    bytes.forEach((byte) => appendBits(bits, byte, 8));

    const capacity = DATA_CODEWORDS * 8;
    appendBits(bits, 0, Math.min(4, capacity - bits.length));
    while (bits.length % 8 !== 0) bits.push(0);

    const data = [];
    for (let i = 0; i < bits.length; i += 8) {
      data.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
    }
    for (let pad = 0; data.length < DATA_CODEWORDS; pad += 1) data.push(pad % 2 === 0 ? 0xec : 0x11);

    return data.concat(computeRemainder(data, computeDivisor(ECC_CODEWORDS)));
  }

  function createMatrix(text) {
    const modules = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    const functions = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

    function setFunction(x, y, dark) {
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
      modules[y][x] = Boolean(dark);
      functions[y][x] = true;
    }

    function drawFinder(centerX, centerY) {
      for (let dy = -4; dy <= 4; dy += 1) {
        for (let dx = -4; dx <= 4; dx += 1) {
          const distance = Math.max(Math.abs(dx), Math.abs(dy));
          setFunction(centerX + dx, centerY + dy, distance !== 2 && distance !== 4);
        }
      }
    }

    function drawAlignment(centerX, centerY) {
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          setFunction(centerX + dx, centerY + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }

    function drawFormatBits(mask) {
      const data = (1 << 3) | mask;
      let remainder = data;
      for (let i = 0; i < 10; i += 1) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
      const bits = ((data << 10) | remainder) ^ 0x5412;
      const bit = (index) => ((bits >>> index) & 1) !== 0;

      for (let i = 0; i <= 5; i += 1) setFunction(8, i, bit(i));
      setFunction(8, 7, bit(6));
      setFunction(8, 8, bit(7));
      setFunction(7, 8, bit(8));
      for (let i = 9; i < 15; i += 1) setFunction(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i += 1) setFunction(SIZE - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i += 1) setFunction(8, SIZE - 15 + i, bit(i));
      setFunction(8, SIZE - 8, true);
    }

    drawFinder(3, 3);
    drawFinder(SIZE - 4, 3);
    drawFinder(3, SIZE - 4);
    for (let i = 8; i < SIZE - 8; i += 1) {
      setFunction(6, i, i % 2 === 0);
      setFunction(i, 6, i % 2 === 0);
    }
    drawAlignment(22, 22);
    drawFormatBits(0);

    const codewords = createCodewords(text);
    let bitIndex = 0;

    for (let right = SIZE - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vertical = 0; vertical < SIZE; vertical += 1) {
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? SIZE - 1 - vertical : vertical;
        for (let offset = 0; offset < 2; offset += 1) {
          const x = right - offset;
          if (functions[y][x]) continue;

          let dark = false;
          if (bitIndex < codewords.length * 8) {
            dark = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
          }
          modules[y][x] = dark;
          bitIndex += 1;
        }
      }
    }

    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        if (!functions[y][x] && (x + y) % 2 === 0) modules[y][x] = !modules[y][x];
      }
    }
    drawFormatBits(0);
    return modules;
  }

  function renderQr(element, text) {
    const matrix = createMatrix(text);
    const quietZone = 4;
    const viewSize = matrix.length + quietZone * 2;
    let path = "";

    matrix.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark) path += "M" + (x + quietZone) + " " + (y + quietZone) + "h1v1h-1z";
      });
    });

    element.innerHTML =
      '<svg viewBox="0 0 ' + viewSize + " " + viewSize + '" role="img" aria-label="QRコード" shape-rendering="crispEdges">' +
      '<rect width="100%" height="100%" fill="#fff"/><path d="' + path + '" fill="#111827"/></svg>';
  }

  function initialize() {
    const params = new URLSearchParams(window.location.search);
    const liffId = window.MINI_APP_CONFIG && window.MINI_APP_CONFIG.line && window.MINI_APP_CONFIG.line.liffId;
    const liffUrl = liffId ? "https://liff.line.me/" + liffId : "";
    const fallback = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) ? "" : window.location.origin + "/";
    const targetUrl = params.get("url") || liffUrl || fallback;
    const urlElement = document.getElementById("target-url");
    const qrElement = document.getElementById("qr");
    const openLink = document.getElementById("open-link");

    if (!targetUrl) {
      qrElement.innerHTML = '<p class="error">スマホ用URLを取得できませんでした。サーバーを再起動してください。</p>';
      urlElement.textContent = "URLを取得できませんでした";
      openLink.hidden = true;
      return;
    }

    urlElement.textContent = targetUrl;
    openLink.href = targetUrl;
    renderQr(qrElement, targetUrl);
  }

  window.MobileAccessQr = { createMatrix };
  initialize();
})();
