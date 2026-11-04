/**
 * Runs named loops on intervals. A tick never overlaps itself, errors are logged and the loop goes on,
 * and stop() waits for running ticks to finish. Roadmap: K5.1
 */

import { errorMessage, type Logger } from "./deps";

export interface LoopSpec {
  name: string;
  everyMs: number;
  tick: () => Promise<unknown>;
}

export interface Runner {
  stop(): Promise<void>;
}

export function startLoops(loops: LoopSpec[], log: Logger): Runner {
  const timers: NodeJS.Timeout[] = [];
  const running = new Map<string, Promise<void>>();
  let stopping = false;

  for (const loop of loops) {
    const run = () => {
      if (stopping || running.has(loop.name)) return;
      const p = loop
        .tick()
        .then(() => undefined)
        .catch((e) => log.warn(`${loop.name} tick failed`, { error: errorMessage(e) }))
        .finally(() => running.delete(loop.name));
      running.set(loop.name, p);
    };
    run();
    timers.push(setInterval(run, loop.everyMs));
  }

  return {
    async stop() {
      stopping = true;
      timers.forEach(clearInterval);
      await Promise.all(running.values());
    },
  };
}
