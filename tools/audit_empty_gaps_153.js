const fs = require('fs');
const { createCanvas } = (() => {
  try {
    return require('canvas');
  } catch(e) {
    return { createCanvas: null };
  }
})();

// If canvas is not installed, we can run headless Chrome to render each part to a canvas and measure!
console.log('Canvas available:', !!createCanvas);
