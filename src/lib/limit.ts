// Forge rate-limits per token; every request in the extension goes through here
const MAX_IN_FLIGHT = 5;
const RETRIES = 2;

let inFlight = 0;
const waiting: Array<() => void> = [];

const acquire = () =>
  new Promise<void>((resolve) => {
    const start = () => {
      inFlight++;
      resolve();
    };
    if (inFlight < MAX_IN_FLIGHT) start();
    else waiting.push(start);
  });

const release = () => {
  inFlight--;
  waiting.shift()?.();
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A 429 was not processed, so retrying any verb is safe
export const politeFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  await acquire();
  try {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, options);
      if (res.status !== 429 || attempt >= RETRIES) return res;
      const after = Number(res.headers.get("retry-after")) || 2 ** attempt;
      await wait(Math.min(after, 15) * 1000);
    }
  } finally {
    release();
  }
};
