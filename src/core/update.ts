import { state } from './machine';
import { loadConfig } from './config';

/**
 * Aktualizácia na diaľku. Pripnutý tablet beží aj týždne bez zatvorenia,
 * takže nové nasadenie ani nový týždenný kód by sa k nemu inak nedostali.
 *
 * Tablet sa sám obnoví, len keď platí všetko naraz:
 *   — je čo aktualizovať (nová verzia aplikácie alebo iná platná
 *     konfigurácia — zmena v config.json aj prelom týždňa),
 *   — je na úvodnej obrazovke,
 *   — QUIET_MS sa ho nikto nedotkol.
 * Počas hry, pri kóde ani na výsledku sa teda neobnoví nikdy.
 */
export const QUIET_MS = 5 * 60_000;
const CHECK_MS = 10 * 60_000;
const TICK_MS = 30_000;

export function shouldReload(o: { pending: boolean; screen: string; sinceInputMs: number }): boolean {
  return o.pending && o.screen === 'attract' && o.sinceInputMs >= QUIET_MS;
}

export function startUpdateWatch(): () => void {
  let pending = false;
  let lastInput = Date.now();
  const bump = () => { lastInput = Date.now(); };
  window.addEventListener('pointerdown', bump, { passive: true });
  window.addEventListener('keydown', bump);

  // Prvé prevzatie stránky service workerom pri úplne prvej návšteve nie je
  // nová verzia — až každé ďalšie.
  const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : null;
  let known = Boolean(sw?.controller);
  const onController = () => { if (known) pending = true; else known = true; };
  sw?.addEventListener('controllerchange', onController);

  async function check() {
    try { await (await sw?.getRegistration())?.update(); } catch { /* bez siete */ }
    try {
      // bez siete vráti poslednú uloženú, takže sa nič nezmení
      const fresh = await loadConfig();
      if (JSON.stringify(fresh) !== JSON.stringify(state.config)) pending = true;
    } catch { /* nevadí, skúsi sa o desať minút */ }
  }

  const checker = window.setInterval(check, CHECK_MS);
  const ticker = window.setInterval(() => {
    if (shouldReload({ pending, screen: state.state, sinceInputMs: Date.now() - lastInput })) {
      location.reload();
    }
  }, TICK_MS);

  return () => {
    window.clearInterval(checker);
    window.clearInterval(ticker);
    window.removeEventListener('pointerdown', bump);
    window.removeEventListener('keydown', bump);
    sw?.removeEventListener('controllerchange', onController);
  };
}
