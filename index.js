import { useEffect, useState } from "react";

export function useAsyncEffect(cb, deps = []) {
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    Promise.resolve(cb(signal)).then(async res => {
      // Handle any possible cleanup
      if (res && typeof res === "function") {
        if (signal.aborted) res();
        signal.addEventListener("abort", res);
      }
    });
    return () => {
      if (signal.aborted) return;
      controller.abort();
    };
  }, deps);
}

export function useAsyncData(cb, deps = []) {
  const [pair, setPair] = useState([null, "LOADING"]);
  useAsyncEffect(async signal => {
    // Update _only_ if the prev state is not "LOADING"
    setPair(prev => (prev[1] === "LOADING" ? prev : [prev[0], "LOADING"]));
    try {
      const data = await cb(signal, ...deps);
      if (signal.aborted) return;
      setPair([data, "READY"]);
    } catch (error) {
      if (signal.aborted) return;
      setPair([error, "ERROR"]);
    }
  }, deps);
  return pair;
}
