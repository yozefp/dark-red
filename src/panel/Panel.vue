<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { parseConfig, today, pickEntry, type ScheduleEntry } from '@/core/config';
import type { Config, GameId } from '@/core/types';

const GAMES: { id: GameId; label: string }[] = [
  { id: 'draw', label: 'DRAW — obkresli obrys' },
  { id: 'push', label: 'PUSH — drž a pusť na 110' },
  { id: 'memorize', label: 'MEMORIZE — zopakuj poradie' },
  { id: 'release', label: 'RELEASE — tri hody na terč' },
];

const base = ref<Omit<Config, 'week' | 'code' | 'game'>>({
  difficulty: 'standard', rounds: 3, idleTimeoutMs: 45_000, resultTimeoutMs: 15_000,
});
const schedule = ref<ScheduleEntry[]>([]);
const loaded = ref(false);
const copied = ref(false);

/** Kampaň beží od teasera po koniec roka — rozvrh sa z toho vyrobí sám. */
const START = '2026-11-18';
const END = '2026-12-31';

onMounted(async () => {
  try {
    const res = await fetch('/config.json?t=' + Date.now(), { cache: 'no-store' });
    const raw = await res.json();
    if (Array.isArray(raw.schedule)) {
      schedule.value = raw.schedule;
      const { schedule: _s, week: _w, code: _c, game: _g, ...rest } = raw;
      base.value = { ...base.value, ...rest };
    } else {
      const c = parseConfig(raw);
      base.value = { difficulty: c.difficulty, rounds: c.rounds,
                     idleTimeoutMs: c.idleTimeoutMs, resultTimeoutMs: c.resultTimeoutMs };
      schedule.value = [{ from: today(), code: c.code, game: c.game }];
    }
  } catch {
    schedule.value = [{ from: START, code: randomCode(), game: 'draw' }];
  }
  loaded.value = true;
});

function randomCode(): string {
  // bez vedúcej nuly a bez šiestich rovnakých — na displeji sa to zle číta
  let c = '';
  do { c = String(Math.floor(100000 + Math.random() * 900000)); }
  while (/^(\d)\1{5}$/.test(c));
  return c;
}

function buildSchedule() {
  const out: ScheduleEntry[] = [];
  const d = new Date(START + 'T12:00:00');
  const end = new Date(END + 'T12:00:00');
  let i = 0;
  while (d <= end) {
    out.push({ from: today(d), code: randomCode(), game: GAMES[i % GAMES.length].id });
    d.setDate(d.getDate() + 7);
    i++;
  }
  schedule.value = out;
}

function addWeek() {
  const last = schedule.value[schedule.value.length - 1];
  const d = last ? new Date(last.from + 'T12:00:00') : new Date();
  d.setDate(d.getDate() + 7);
  schedule.value.push({ from: today(d), code: randomCode(), game: 'draw' });
}

const sorted = computed(() =>
  [...schedule.value].sort((a, b) => a.from.localeCompare(b.from)));
const activeFrom = computed(() => pickEntry(schedule.value)?.from ?? null);
const preview = computed(() => parseConfig(file.value));

const file = computed(() => ({
  ...base.value,
  schedule: sorted.value.map((e) => ({ from: e.from, code: e.code, game: e.game })),
}));
const json = computed(() => JSON.stringify(file.value, null, 2) + '\n');

const problems = computed(() => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const e of schedule.value) {
    if (!/^\d{6}$/.test(String(e.code))) out.push(`${e.from}: kód musí mať šesť číslic`);
    if (seen.has(e.from)) out.push(`${e.from}: dátum je v rozvrhu dvakrát`);
    seen.add(e.from);
  }
  if (!schedule.value.length) out.push('rozvrh je prázdny');
  return out;
});

async function copy() {
  try {
    await navigator.clipboard.writeText(json.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1800);
  } catch { /* staršie prehliadače — ostáva stiahnutie */ }
}

function download() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json.value], { type: 'application/json' }));
  a.download = 'config.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>

<template>
  <div class="wrap">
    <h1>TEREA <b>DARK RED</b> — konfigurácia</h1>
    <p class="sub">
      Tablety si týždeň vyberú z rozvrhu samy podľa dátumu. Nasadí sa raz,
      potom sa do toho už nemusí nikto hrabať.
    </p>

    <h2>Spoločné pre všetky týždne</h2>
    <div class="card row">
      <div class="f">
        <label>obtiažnosť</label>
        <select v-model="base.difficulty">
          <option value="easy">ľahká</option>
          <option value="standard">štandardná</option>
          <option value="hard">ťažká</option>
        </select>
      </div>
      <div class="f">
        <label>kolá</label>
        <select v-model.number="base.rounds">
          <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
      <div class="f">
        <label>návrat na úvod (s)</label>
        <input type="number" min="10" max="300" style="width:92px"
               :value="base.idleTimeoutMs / 1000"
               @input="base.idleTimeoutMs = +($event.target as HTMLInputElement).value * 1000">
      </div>
      <div class="f">
        <label>výsledok na obrazovke (s)</label>
        <input type="number" min="3" max="60" style="width:92px"
               :value="base.resultTimeoutMs / 1000"
               @input="base.resultTimeoutMs = +($event.target as HTMLInputElement).value * 1000">
      </div>
    </div>

    <h2>Rozvrh kampane</h2>
    <div class="card">
      <div class="row" style="margin-bottom:14px">
        <button @click="buildSchedule()">Vyrob rozvrh od 18. 11. do 31. 12.</button>
        <button @click="addWeek()">Pridaj týždeň</button>
      </div>

      <table v-if="loaded">
        <thead>
          <tr><th>platí od</th><th>kód</th><th>hra</th><th></th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="(e, i) in sorted" :key="i" :class="{ now: e.from === activeFrom }">
            <td><input type="date" v-model="e.from"></td>
            <td>
              <input class="code" v-model="e.code" inputmode="numeric" maxlength="6">
            </td>
            <td>
              <select v-model="e.game">
                <option v-for="g in GAMES" :key="g.id" :value="g.id">{{ g.label }}</option>
              </select>
            </td>
            <td><span v-if="e.from === activeFrom" class="tag">● DNES</span></td>
            <td>
              <button class="ghost" @click="e.code = randomCode()">↻ kód</button>
              <button class="ghost"
                      @click="schedule.splice(schedule.indexOf(e), 1)">✕</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>Čo tablety uvidia dnes</h2>
    <div class="card note">
      kód <b>{{ preview.code }}</b> · hra <b>{{ preview.game }}</b> ·
      obtiažnosť <b>{{ preview.difficulty }}</b> · <b>{{ preview.rounds }}</b> kolá
      <div v-if="problems.length" class="warn">
        <div v-for="p in problems" :key="p" style="color:var(--amber)">{{ p }}</div>
      </div>
    </div>

    <h2>Súbor na nasadenie</h2>
    <div class="card">
      <div class="row" style="margin-bottom:14px">
        <button class="primary" @click="download()">Stiahnuť config.json</button>
        <button @click="copy()">Kopírovať</button>
        <span v-if="copied" class="ok">skopírované</span>
      </div>
      <pre>{{ json }}</pre>
      <p class="note" style="margin-top:14px">
        Súbor patrí do <b>public/config.json</b> v repozitári. Po nahratí a nasadení
        si ho tablety stiahnu samy — pri ďalšom načítaní, do minúty.
      </p>
      <p class="note warn">
        Kód je v tomto súbore čitateľný pre každého, kto si otvorí adresu
        <b>/config.json</b>. Je to brána pre obsluhu, nie tajomstvo —
        bez hostesky sa k hre aj tak nikto nedostane.
      </p>
    </div>
  </div>
</template>
