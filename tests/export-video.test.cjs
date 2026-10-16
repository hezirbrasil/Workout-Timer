const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

test('criação de bloco adiciona um bloco editável à aula', () => {
  assert.match(html, /function addBlock\(\)\s*\{blocks\.push\(\{name:'Bloco '\+\(blocks\.length\+1\),open:true,rounds:\[\]\}\);save\(\);render\(\)\}/);
  assert.match(html, /id="addBlock"/);
});

test('criação de round avulso fornece duração e descanso padrão editáveis', () => {
  assert.match(html, /function addRound\(\)\s*\{const count=rounds\(\)\.length\+1;blocks\.push\(\{name:'Round avulso '\+count,open:true,standalone:true,rounds:\[\{name:'Round '\+count,duration:50,rest:10\}\]\}\);save\(\);render\(\)\}/);
  assert.match(html, /id="addRound"/);
});

test('treinos montados são persistidos e recuperados no dispositivo', () => {
  assert.match(html, /localStorage\.setItem\('round-fitness-v1',JSON\.stringify\(blocks\)\)/);
  assert.match(html, /localStorage\.getItem\('round-fitness-v1'\)/);
  assert.match(html, /function saveCurrentTimer\(\)/);
  assert.match(html, /function loadSavedTimers\(\)/);
});

test('há presets padronizados para aulas MMA 3:30 e MMA 0:50', () => {
  assert.match(html, /function createDefaultWorkout\(\)/);
  assert.match(html, /name:'MMA 3:30'/);
  assert.match(html, /function createMMA050Workout\(\)/);
  assert.match(html, /name:'MMA 0:50'/);
  assert.match(html, /function renderPredefinedTimers\(\)/);
});

test('o editor permite alterar nomes, tempo de trabalho e descanso', () => {
  assert.match(html, /class="rname"/);
  assert.match(html, /class="dur" type="number" min="1" max="3600"/);
  assert.match(html, /class="rest" type="number" min="0" max="3600"/);
  assert.match(html, /r\.duration=Math\.max\(1,Math\.min\(3600,Number\(e\.target\.value\)\|\|1\)\)/);
  assert.match(html, /r\.rest=Math\.max\(0,Math\.min\(3600,Number\(e\.target\.value\)\|\|0\)\)/);
});

test('a aula pode ser salva, compartilhada por link e exportada como arquivo', () => {
  assert.match(html, /id="saveTimer"/);
  assert.match(html, /function shareSavedLink\(index\)/);
  assert.match(html, /function exportSavedTimer\(index\)/);
  assert.match(html, /id="importTimerBtn"/);
});

function loadTimingHelpers() {
  const timelineSource = html.match(/function buildWorkoutTimeline\(items\)\s*\{[\s\S]*?\n\}/);
  const durationSource = html.match(/function getWorkoutDuration\(items\)\s*\{[\s\S]*?\n\}/);
  assert.ok(timelineSource, 'buildWorkoutTimeline must exist in the app');
  assert.ok(durationSource, 'getWorkoutDuration must exist in the app');
  const context = {};
  vm.runInNewContext(timelineSource[0] + '\\n' + durationSource[0] +
    '\\nglobalThis.timeline = buildWorkoutTimeline; globalThis.duration = getWorkoutDuration;', context);
  return { timeline: context.timeline, duration: context.duration };
}

test('timeline builds work and rest phases in the correct order', () => {
  const { timeline } = loadTimingHelpers();
  assert.deepEqual(JSON.parse(JSON.stringify(timeline([
    { name: 'Round 1', duration: 50, rest: 10 },
    { name: 'Round 2', duration: 60, rest: 0 }
  ]))), [
    { name: 'Round 1', phase: 'TRABALHO', duration: 50 },
    { name: 'Round 1', phase: 'DESCANSO', duration: 10 },
    { name: 'Round 2', phase: 'TRABALHO', duration: 60 }
  ]);
});

test('total class duration includes rests exactly once', () => {
  const { duration } = loadTimingHelpers();
  assert.equal(duration([
    { name: 'Round 1', duration: 50, rest: 10 },
    { name: 'Round 2', duration: 50, rest: 30 },
    { name: 'Fim', duration: 60, rest: 0 }
  ]), 200);
});

test('zero rest does not create an empty rest phase', () => {
  const { timeline } = loadTimingHelpers();
  const result = timeline([{ name: 'Troca', duration: 90, rest: 0 }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].phase, 'TRABALHO');
});

test('active pause is represented as its own work phase', () => {
  const { timeline } = loadTimingHelpers();
  const result = timeline([
    { name: 'MMA 4', duration: 50, rest: 10 },
    { name: 'Pausa ativa', duration: 30, rest: 0 },
    { name: 'MMA 5', duration: 50, rest: 10 }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.map(p => [p.name, p.phase, p.duration]))), [
    ['MMA 4', 'TRABALHO', 50],
    ['MMA 4', 'DESCANSO', 10],
    ['Pausa ativa', 'TRABALHO', 30],
    ['MMA 5', 'TRABALHO', 50],
    ['MMA 5', 'DESCANSO', 10]
  ]);
});

test('invalid or missing durations use safe defaults and empty workouts total zero', () => {
  const { timeline, duration } = loadTimingHelpers();
  assert.equal(timeline([{ name: 'Round' }])[0].duration, 50);
  assert.equal(timeline([{ name: 'Round', duration: -4, rest: -3 }])[0].duration, 1);
  assert.equal(duration([]), 0);
});
