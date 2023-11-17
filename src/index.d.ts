type Cleanup = () => void;

declare const useAsyncEffect: (
  callback: (
    signal: AbortSignal,
    ...deps: any[]
  ) => void | Promise<void> | Cleanup | Promise<Cleanup>,
  deps?: any[]
) => void;

declare const useAsyncData: (
  callback: (signal: AbortSignal, ...deps: any[]) => any | Promise<any>,
  deps?: any[]
) => [any, "READY"] | [undefined, "LOADING"] | [Error, "ERROR"];

export default useAsyncEffect;
export { useAsyncEffect, useAsyncData };
