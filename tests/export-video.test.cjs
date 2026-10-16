const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('export button is present and wired to the export function', () => {
  assert.match(html, /id="exportVideo"/);
  assert.match(html, /async function exportWorkoutVideo\s*\(/);
  assert.match(html, /\$\('exportVideo'\)\.onclick\s*=\s*exportWorkoutVideo/);
});

test('export refuses to run while the timer is active', () => {
  assert.match(html, /if\s*\(running\)\s*\{\s*alert\('Pause o timer antes de exportar o vídeo\.'/);
});

test('export builds a sequence containing work rounds and rest phases', () => {
  assert.match(html, /rounds\(\)\.forEach\(\(r,i\)=>\s*\{/);
  assert.match(html, /phase:'TRABALHO',duration:work/);
  assert.match(html, /phase:'DESCANSO',duration:rest/);
  assert.match(html, /if\(rest>0\)sequence\.push/);
});

test('export requests a landscape Full HD canvas and captures video', () => {
  assert.match(html, /canvas\.width=1920;canvas\.height=1080/);
  assert.match(html, /canvas\.captureStream\(30\)/);
  assert.match(html, /videoBitsPerSecond:8000000/);
});

test('export checks browser recording support and provides WebM fallback messaging', () => {
  assert.match(html, /window\.MediaRecorder/);
  assert.match(html, /HTMLCanvasElement\.prototype\.captureStream/);
  assert.match(html, /video\/webm/);
  assert.match(html, /foi gerado um vídeo WebM/);
});

test('export downloads a file with an extension matching the selected recording format', () => {
  assert.match(html, /'ROUND-treino-completo\.'\+\(isMP4\?'mp4':'webm'\)/);
});
