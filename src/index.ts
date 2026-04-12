import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncResult<T> = {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  refresh: () => Promise<void>;
  update: (updater: T | ((prev: T | undefined) => T)) => Promise<void>;
  abort: () => void;
};

function useAsync<T = any, Deps extends any[] = any[]>(
  cb: (signal: AbortSignal, ...deps: Deps) => T | Promise<T>,
  deps: Deps = [] as any,
): AsyncResult<T> {
  const [state, setState] = useState<{
    data: T | undefined;
    error: Error | undefined;
    loading: boolean;
  }>({ data: undefined, error: undefined, loading: true });
  const [refreshToken, setRefreshToken] = useState(0);
  const resolvesRef = useRef<Array<() => void>>([]);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((prev) => ({ ...prev, loading: true }));
    (async () => {
      try {
        const data = await cb(controller.signal, ...deps);
        if (controller.signal.aborted) return;
        setState({ data, error: undefined, loading: false });
      } catch (error) {
        if (controller.signal.aborted) return;
        if ((error as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          error: error as Error,
          loading: false,
        }));
      }
      resolvesRef.current.forEach((r) => r());
      resolvesRef.current = [];
    })();
    return () => {
      controller.abort();
      controllerRef.current = null;
      resolvesRef.current.forEach((r) => r());
      resolvesRef.current = [];
    };
  }, [...deps, refreshToken]);

  const refresh = useCallback(
    () =>
      new Promise<void>((resolve) => {
        resolvesRef.current.push(resolve);
        setRefreshToken((t) => t + 1);
      }),
    [],
  );

  const update = useCallback(
    async (updater: T | ((prev: T | undefined) => T)) => {
      setState((prev) => ({
        ...prev,
        error: undefined,
        data:
          typeof updater === "function"
            ? (updater as (prev: T | undefined) => T)(prev.data)
            : updater,
      }));
    },
    [],
  );

  const abort = useCallback(() => {
    if (!controllerRef.current) return;
    controllerRef.current.abort();
    controllerRef.current = null;
    setState((prev) => ({ ...prev, loading: false }));
    resolvesRef.current.forEach((r) => r());
    resolvesRef.current = [];
  }, []);

  return { ...state, refresh, update, abort };
}

export default useAsync;
