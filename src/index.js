import { useEffect, useState } from "react";

function useAsyncEffect(cb, deps = []) {
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    Promise.resolve(cb(signal, ...deps))
      .then(async (res) => {
        // Handle any possible cleanup
        if (res && typeof res === "function") {
          if (signal.aborted) return res();
          signal.addEventListener("abort", res);
        }
      })
      .catch((error) => {
        // These errors are not really errors, it's just that JS handles aborting
        // a promise as an error. Thus, ignore them since they're a normal part
        // of the expected async workflow
        if (error.name === "AbortError") {
          return null;
        } else {
          // Real errors, buble it up since the CB is expected to handle the
          // errors by itself, so this is like a "fatal error" that should've
          // been handled by the devs
          throw error;
        }
      });
    return () => {
      if (signal.aborted) return;
      controller.abort();
    };
  }, deps);
}

function useAsyncData(cb, deps = []) {
  const [pair, setPair] = useState([undefined, "LOADING"]);
  useAsyncEffect(async (signal) => {
    // Update _only_ if the prev state is not "LOADING"
    setPair((prev) => (prev[1] === "LOADING" ? prev : [prev[0], "LOADING"]));
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

export default useAsyncEffect;
export { useAsyncData, useAsyncEffect };
