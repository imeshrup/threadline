// Generates clean product illustrations as SVG so the store works without any external image hosting.
// GET /img/garment/:type/:hex.svg   e.g. /img/garment/hoodie/2f3e46.svg
const router = require('express').Router();

const SHAPES = {
  tee: 'M150 70 L200 55 Q240 85 280 55 L330 70 L395 130 L355 170 L330 150 L330 345 L150 345 L150 150 L125 170 L85 130 Z',
  longsleeve: 'M150 70 L200 55 Q240 85 280 55 L330 70 L380 120 L410 300 L370 308 L340 170 L330 160 L330 345 L150 345 L150 160 L140 170 L110 308 L70 300 L100 120 Z',
  hoodie: 'M150 85 L190 65 Q190 25 240 25 Q290 25 290 65 L330 85 L380 130 L410 310 L368 318 L340 180 L330 170 L330 350 L150 350 L150 170 L140 180 L112 318 L70 310 L100 130 Z',
  jacket: 'M145 75 L205 55 L240 110 L275 55 L335 75 L385 125 L412 320 L370 326 L342 185 L335 175 L335 355 L145 355 L145 175 L138 185 L110 326 L68 320 L95 125 Z',
  pants: 'M165 50 L315 50 L330 360 L268 360 L240 150 L212 360 L150 360 Z',
  shorts: 'M155 90 L325 90 L345 270 L262 278 L240 175 L218 278 L135 270 Z',
  dress: 'M200 45 L215 45 Q240 70 265 45 L280 45 L290 120 Q300 150 285 170 L360 360 L120 360 L195 170 Q180 150 190 120 Z',
  skirt: 'M175 95 L305 95 L360 330 Q240 355 120 330 Z',
  sneaker: 'M90 250 Q95 190 150 185 L215 170 Q240 200 290 205 L370 215 Q405 225 405 262 L405 285 L90 285 Z',
  boot: 'M170 70 L265 70 L270 230 Q330 235 370 255 Q395 270 390 300 L170 300 Z',
  cap: 'M120 230 Q120 120 240 115 Q360 120 360 230 Z M120 230 L400 230 Q410 255 380 260 L120 250 Z',
  bag: 'M120 160 L360 160 L380 350 L100 350 Z M180 160 Q180 85 240 85 Q300 85 300 160 L282 160 Q282 105 240 105 Q198 105 198 160 Z',
  scarf: 'M150 60 L330 60 L330 120 L270 120 L270 350 L215 350 L215 120 L150 120 Z',
  beanie: 'M135 240 Q135 110 240 105 Q345 110 345 240 Z M125 235 L355 235 L355 285 L125 285 Z',
};

const DETAILS = {
  hoodie: '<path d="M205 70 Q240 120 275 70" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="4"/><path d="M228 100 L224 150 M252 100 L256 150" stroke="rgba(255,255,255,.55)" stroke-width="3"/><rect x="185" y="250" width="110" height="55" rx="10" fill="rgba(0,0,0,.12)"/>',
  jacket: '<path d="M240 110 L240 355" stroke="rgba(0,0,0,.3)" stroke-width="4"/><circle cx="252" cy="160" r="5" fill="rgba(0,0,0,.35)"/><circle cx="252" cy="220" r="5" fill="rgba(0,0,0,.35)"/><circle cx="252" cy="280" r="5" fill="rgba(0,0,0,.35)"/>',
  pants: '<path d="M165 75 L315 75" stroke="rgba(0,0,0,.2)" stroke-width="4"/>',
  shorts: '<path d="M155 112 L325 112" stroke="rgba(0,0,0,.2)" stroke-width="4"/>',
  sneaker: '<path d="M90 268 L405 268" stroke="#fff" stroke-width="16"/><path d="M200 185 L230 215 M220 180 L250 212 M240 192 L268 210" stroke="rgba(255,255,255,.8)" stroke-width="5"/>',
  boot: '<path d="M170 300 L390 300" stroke="rgba(0,0,0,.45)" stroke-width="14"/>',
  tee: '<path d="M205 60 Q240 92 275 60" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="4"/>',
  longsleeve: '<path d="M205 60 Q240 92 275 60" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="4"/>',
  beanie: '<path d="M150 235 L150 285 M180 235 L180 285 M210 235 L210 285 M240 235 L240 285 M270 235 L270 285 M300 235 L300 285 M330 235 L330 285" stroke="rgba(0,0,0,.15)" stroke-width="4"/>',
  scarf: '<path d="M222 350 L222 372 M236 350 L236 372 M250 350 L250 372 M264 350 L264 372" stroke-width="4" stroke="currentColor"/>',
};

const hexOk = (h) => /^[0-9a-f]{6}$/i.test(h);
const lighten = (hex, amt) => {
  const n = parseInt(hex, 16);
  const ch = (s) => Math.round(((n >> s) & 255) + (255 - ((n >> s) & 255)) * amt);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

router.get('/:type/:hex.svg', (req, res) => {
  const { type } = req.params;
  const hex = hexOk(req.params.hex) ? req.params.hex : '888888';
  const shape = SHAPES[type] || SHAPES.tee;
  const bg = lighten(hex, 0.86);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 400" width="960" height="800">
<rect width="480" height="400" fill="${bg}"/>
<ellipse cx="240" cy="372" rx="150" ry="12" fill="rgba(0,0,0,.08)"/>
<g style="color:#${hex}"><path d="${shape}" fill="#${hex}" stroke="rgba(0,0,0,.18)" stroke-width="3" stroke-linejoin="round" fill-rule="evenodd"/>${DETAILS[type] || ''}</g>
</svg>`;
  res.set('Content-Type', 'image/svg+xml');
  res.set('Cache-Control', 'public, max-age=604800, immutable');
  res.send(svg);
});

module.exports = router;
