type Cleanup = () => void;

declare const useAsyncEffect: (
  callback: (
    signal: AbortSignal,
    ...deps: any[]
  ) => void | Promise<void> | Cleanup | Promise<Cleanup>,
  deps?: any[],
) => void;

declare const useAsyncData: <T = any>(
  callback: (signal: AbortSignal, ...deps: any[]) => T | Promise<T>,
  deps?: any[],
) => [T, "READY"] | [undefined, "LOADING"] | [Error, "ERROR"];

export default useAsyncEffect;
export { useAsyncEffect, useAsyncData };
