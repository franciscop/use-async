import $, { until } from "react-test";
import { expectTypeOf, assertType } from "vitest";

import useAsync from "./index";

const delay = (time: number) => new Promise((done) => setTimeout(done, time));

describe("useAsync", () => {
  // --- initial state ---

  it("starts loading", () => {
    const Home = () => {
      const { loading } = useAsync(async () => "hello", []);
      return <div>{loading ? "loading" : "done"}</div>;
    };
    expect($(<Home />)).toHaveText("loading");
  });

  it("data is undefined while loading", () => {
    const Home = () => {
      const { data } = useAsync(async () => {
        await delay(100);
        return "hello";
      }, []);
      return <div>{data ?? "empty"}</div>;
    };
    expect($(<Home />)).toHaveText("empty");
  });

  it("error is undefined while loading", () => {
    const Home = () => {
      const { error } = useAsync(async () => {
        await delay(100);
        return "hello";
      }, []);
      return <div>{error ? "error" : "no error"}</div>;
    };
    expect($(<Home />)).toHaveText("no error");
  });

  // --- resolution ---

  it("resolves data", async () => {
    const Home = () => {
      const { data, loading } = useAsync(async () => {
        await delay(20);
        return "hello";
      }, []);
      return <div>{loading ? "loading" : data}</div>;
    };
    const $demo = $(<Home />);
    expect($demo).toHaveText("loading");
    await until(() => $demo.text() === "hello");
    expect($demo).toHaveText("hello");
  });

  it("loading is false after resolution", async () => {
    const Home = () => {
      const { loading } = useAsync(async () => "hello", []);
      return <div>{loading ? "loading" : "done"}</div>;
    };
    const $demo = $(<Home />);
    await until(() => $demo.text() === "done");
    expect($demo).toHaveText("done");
  });

  it("error is undefined after successful resolution", async () => {
    const Home = () => {
      const { error, loading } = useAsync(async () => "hello", []);
      return <div>{loading ? "loading" : error ? "error" : "no error"}</div>;
    };
    const $demo = $(<Home />);
    await until(() => $demo.text() !== "loading");
    expect($demo).toHaveText("no error");
  });

  it("works with a synchronous callback", async () => {
    const Home = () => {
      const { data, loading } = useAsync((signal) => "sync", []);
      return <div>{loading ? "loading" : data}</div>;
    };
    const $demo = $(<Home />);
    await until(() => $demo.text() === "sync");
    expect($demo).toHaveText("sync");
  });

  // --- errors ---

  it("captures errors", async () => {
    const Home = () => {
      const { error, loading } = useAsync(async () => {
        await delay(20);
        throw new Error("oops");
      }, []);
      return <div>{loading ? "loading" : error?.message}</div>;
    };
    const $demo = $(<Home />);
    expect($demo).toHaveText("loading");
    await until(() => $demo.text() === "oops");
    expect($demo).toHaveText("oops");
  });

  it("loading is false after error", async () => {
    const Home = () => {
      const { loading } = useAsync(async () => {
        throw new Error("oops");
      }, []);
      return <div>{loading ? "loading" : "done"}</div>;
    };
    const $demo = $(<Home />);
    await until(() => $demo.text() === "done");
    expect($demo).toHaveText("done");
  });

  it("data is undefined after error on initial load", async () => {
    const Home = () => {
      const { data, loading } = useAsync(async () => {
        await delay(20);
        throw new Error("oops");
      }, []);
      return <div>{loading ? "loading" : (data ?? "empty")}</div>;
    };
    const $demo = $(<Home />);
    await until(() => $demo.text() === "empty");
    expect($demo).toHaveText("empty");
  });

  it("data is preserved after a re-fetch error", async () => {
    let fail = false;
    const Home = () => {
      const { data, error, refresh } = useAsync(async () => {
        if (fail) throw new Error("oops");
        return "loaded";
      }, []);
      return (
        <div>
          <span>{data ?? "empty"}</span>
          <em>{error?.message}</em>
          <button
            onClick={() => {
              fail = true;
              refresh();
            }}
          >
            refresh
          </button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("span").text() === "loaded");
    await $demo.find("button").click();
    await until(() => $demo.find("em").text() === "oops");
    expect($demo.find("span")).toHaveText("loaded");
  });

  // --- deps ---

  it("receives deps as arguments", async () => {
    const Home = ({ id }: { id: number }) => {
      const { data } = useAsync(async (signal, id) => id * 2, [id]);
      return <div>{data}</div>;
    };
    const $demo = $(<Home id={5} />);
    await until(() => $demo.text() === "10");
    expect($demo).toHaveText("10");
  });

  it("re-runs when deps change", async () => {
    const Home = ({ id }: { id: number }) => {
      const { data } = useAsync(async (signal, id) => `user-${id}`, [id]);
      return <div>{data}</div>;
    };
    const $demo = $(<Home id={1} />);
    await until(() => $demo.text() === "user-1");
    $demo.props({ id: 2 });
    await until(() => $demo.text() === "user-2");
    expect($demo).toHaveText("user-2");
  });

  it("loading is true again when deps change", async () => {
    const Home = ({ id }: { id: number }) => {
      const { loading } = useAsync(
        async (signal, id) => {
          await delay(50);
          return id;
        },
        [id],
      );
      return <div>{loading ? "loading" : "done"}</div>;
    };
    const $demo = $(<Home id={1} />);
    await until(() => $demo.text() === "done");
    $demo.props({ id: 2 });
    expect($demo).toHaveText("loading");
    await until(() => $demo.text() === "done");
  });

  it("stale result is ignored when deps change mid-flight", async () => {
    const Home = ({ id }: { id: number }) => {
      const { data } = useAsync(
        async (signal, id) => {
          await delay(id === 1 ? 100 : 20);
          return `user-${id}`;
        },
        [id],
      );
      return <div>{data}</div>;
    };
    const $demo = $(<Home id={1} />);
    // change deps before first request finishes
    $demo.props({ id: 2 });
    await until(() => $demo.text() === "user-2");
    // user-1's slow response should not overwrite user-2
    await delay(150);
    expect($demo).toHaveText("user-2");
  });

  it("defaults to empty deps array", async () => {
    const Home = () => {
      const { data } = useAsync(async () => "no deps");
      return <div>{data ?? "empty"}</div>;
    };
    const $demo = $(<Home />);
    await until(() => $demo.text() === "no deps");
    expect($demo).toHaveText("no deps");
  });

  // --- refresh ---

  it("refresh re-runs the callback", async () => {
    let count = 0;
    const Home = () => {
      const { data, refresh } = useAsync(async () => ++count, []);
      return (
        <div>
          <span>{data}</span>
          <button onClick={() => refresh()}>refresh</button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("span").text() === "1");
    await $demo.find("button").click();
    await until(() => $demo.find("span").text() === "2");
    expect($demo.find("span")).toHaveText("2");
  });

  it("await refresh() resolves when data is ready", async () => {
    let count = 0;
    const Home = () => {
      const { data, refresh } = useAsync(async () => ++count, []);
      return (
        <div>
          <span>{data}</span>
          <button
            onClick={async () => {
              await refresh();
            }}
          >
            refresh
          </button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("span").text() === "1");
    await $demo.find("button").click();
    expect($demo.find("span")).toHaveText("2");
  });

  it("loading is true while refreshing", async () => {
    let count = 0;
    const Home = () => {
      const { loading, refresh } = useAsync(async () => {
        await delay(50);
        return ++count;
      }, []);
      return (
        <div>
          <span>{loading ? "loading" : "done"}</span>
          <button onClick={() => refresh()}>refresh</button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("span").text() === "done");
    await $demo.find("button").click();
    expect($demo.find("span")).toHaveText("loading");
    await until(() => $demo.find("span").text() === "done");
  });

  it("data is preserved while refreshing", async () => {
    let count = 0;
    const Home = () => {
      const { data, loading, refresh } = useAsync(async () => {
        await delay(50);
        return ++count;
      }, []);
      return (
        <div>
          <span>{data}</span>
          <em>{loading ? "loading" : "done"}</em>
          <button onClick={() => refresh()}>refresh</button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("em").text() === "done");
    await $demo.find("button").click();
    // loading is true again, but stale data is still visible
    expect($demo.find("span")).toHaveText("1");
    await until(() => $demo.find("em").text() === "done");
    expect($demo.find("span")).toHaveText("2");
  });

  it("refresh after error clears error", async () => {
    let fail = true;
    const Home = () => {
      const { data, error, refresh } = useAsync(async () => {
        if (fail) throw new Error("oops");
        return "ok";
      }, []);
      return (
        <div>
          <span>{error ? error.message : data}</span>
          <button
            onClick={() => {
              fail = false;
              refresh();
            }}
          >
            retry
          </button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("span").text() === "oops");
    await $demo.find("button").click();
    await until(() => $demo.find("span").text() === "ok");
    expect($demo.find("span")).toHaveText("ok");
  });

  it("refresh uses the latest dep after a dep change", async () => {
    const Home = ({ id }: { id: number }) => {
      const { data, refresh } = useAsync(
        async (signal, id) => `user-${id}`,
        [id],
      );
      return (
        <div>
          <span>{data}</span>
          <button onClick={() => refresh()}>refresh</button>
        </div>
      );
    };
    const $demo = $(<Home id={1} />);
    await until(() => $demo.find("span").text() === "user-1");
    $demo.props({ id: 2 });
    await until(() => $demo.find("span").text() === "user-2");
    await $demo.find("button").click();
    await until(() => $demo.find("span").text() === "user-2");
    expect($demo.find("span")).toHaveText("user-2");
  });

  it("refresh() promise resolves even if component unmounts mid-flight", async () => {
    // Track resolution outside the component so we can check after unmount
    let refreshPromise: Promise<void> | undefined;
    const Home = () => {
      const { data, refresh } = useAsync(async () => {
        await delay(50);
        return "ok";
      }, []);
      return (
        <div>
          <span>{data ?? "loading"}</span>
          <button
            onClick={() => {
              refreshPromise = refresh();
            }}
          >
            refresh
          </button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("span").text() === "ok");
    // kick off refresh, then unmount before it finishes
    await $demo.find("button").click();
    $demo.render(null);
    // the promise should resolve, not hang
    await expect(refreshPromise).resolves.toBeUndefined();
  });

  // --- update ---

  it("update sets data directly", async () => {
    const Home = () => {
      const { data, update } = useAsync(async () => {
        await delay(20);
        return "initial";
      }, []);
      return (
        <div>
          <span>{data}</span>
          <button
            onClick={async () => {
              await update("updated");
            }}
          >
            update
          </button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("span").text() === "initial");
    await $demo.find("button").click();
    expect($demo.find("span")).toHaveText("updated");
  });

  it("update accepts an updater function", async () => {
    const Home = () => {
      const { data, update } = useAsync(async () => {
        await delay(20);
        return 1;
      }, []);
      return (
        <div>
          <span>{data}</span>
          <button
            onClick={async () => {
              await update((prev) => (prev ?? 0) + 1);
            }}
          >
            update
          </button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("span").text() === "1");
    await $demo.find("button").click();
    expect($demo.find("span")).toHaveText("2");
  });

  it("update does not affect loading state", async () => {
    const Home = () => {
      const { loading, update } = useAsync(async () => {
        await delay(20);
        return "initial";
      }, []);
      return (
        <div>
          <em>{loading ? "loading" : "done"}</em>
          <button onClick={() => update("updated")}>update</button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("em").text() === "done");
    await $demo.find("button").click();
    expect($demo.find("em")).toHaveText("done");
  });

  it("dep change after update still uses the new dep", async () => {
    const Home = ({ id }: { id: number }) => {
      const { data, update } = useAsync(
        async (signal, id) => `user-${id}`,
        [id],
      );
      return (
        <div>
          <span>{data}</span>
          <button onClick={() => update(`updated-${id}`)}>update</button>
        </div>
      );
    };
    const $demo = $(<Home id={1} />);
    await until(() => $demo.find("span").text() === "user-1");
    $demo.props({ id: 2 });
    await until(() => $demo.find("span").text() === "user-2");
    await $demo.find("button").click();
    expect($demo.find("span")).toHaveText("updated-2");
    $demo.props({ id: 3 });
    await until(() => $demo.find("span").text() === "user-3");
    expect($demo.find("span")).toHaveText("user-3");
  });

  // --- types ---

  it("rejects deps that don't match the callback signature", () => {
    // wrapped in a never-called function so hooks aren't invoked at runtime
    const check = () => {
      // @ts-expect-error — callback expects number but deps passes string
      useAsync((signal, id: number) => id, ["oops"]);
      // @ts-expect-error — callback expects two args but deps only provides one
      useAsync((signal, a: number, b: string) => `${a}${b}`, [1]);
    };
    assertType<typeof check>(check);
  });

  it("accepts deps that match the callback signature", () => {
    const check = () => {
      useAsync((signal, id: number) => id, [1]);
      useAsync((signal, a: number, b: string) => `${a}${b}`, [1, "ok"]);
      useAsync((signal) => "no deps", []);
      useAsync((signal) => "no deps");
    };
    assertType<typeof check>(check);
  });

  it("infers data type from an extracted callback's return type", () => {
    type User = { id: number; name: string };
    const getUser = (signal: AbortSignal, id: number): User => ({
      id,
      name: "test",
    });
    // useAsync<T> infers T from cb's return type — no explicit generic needed
    type Result = ReturnType<typeof useAsync<ReturnType<typeof getUser>>>;
    expectTypeOf<Result["data"]>().toEqualTypeOf<User | undefined>();
  });

  it("infers data type from an async callback's return type", () => {
    type User = { id: number; name: string };
    const getUser = async (signal: AbortSignal, id: number): Promise<User> => ({
      id,
      name: "test",
    });
    type Result = ReturnType<
      typeof useAsync<Awaited<ReturnType<typeof getUser>>>
    >;
    expectTypeOf<Result["data"]>().toEqualTypeOf<User | undefined>();
  });

  it("infers data type from an inline callback", () => {
    type Result = ReturnType<typeof useAsync<number>>;
    expectTypeOf<Result["data"]>().toEqualTypeOf<number | undefined>();
  });

  it("update clears error", async () => {
    let fail = true;
    const Home = () => {
      const { data, error, update } = useAsync(async () => {
        if (fail) throw new Error("oops");
        return "ok";
      }, []);
      return (
        <div>
          <span>{data ?? "empty"}</span>
          <em>{error?.message ?? "no error"}</em>
          <button
            onClick={() => {
              fail = false;
              update("fixed");
            }}
          >
            fix
          </button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("em").text() === "oops");
    await $demo.find("button").click();
    expect($demo.find("span")).toHaveText("fixed");
    expect($demo.find("em")).toHaveText("no error");
  });

  // --- signal / abort ---

  it("passes a signal to the callback", async () => {
    const Home = () => {
      const { data } = useAsync(
        async (signal) => (signal instanceof AbortSignal ? "yes" : "no"),
        [],
      );
      return <div>{data ?? "waiting"}</div>;
    };
    const $demo = $(<Home />);
    await until(() => $demo.text() !== "waiting");
    expect($demo).toHaveText("yes");
  });

  it("signal is not aborted during normal execution", async () => {
    const Home = () => {
      const { data } = useAsync(
        async (signal) => (signal.aborted ? "aborted" : "ok"),
        [],
      );
      return <div>{data ?? "waiting"}</div>;
    };
    const $demo = $(<Home />);
    await until(() => $demo.text() !== "waiting");
    expect($demo).toHaveText("ok");
  });

  // --- abort ---

  it("abort sets loading to false", async () => {
    const Home = () => {
      const { loading, abort } = useAsync(async () => {
        await delay(100);
        return "done";
      }, []);
      return (
        <div>
          <span>{loading ? "loading" : "idle"}</span>
          <button onClick={abort}>abort</button>
        </div>
      );
    };
    const $demo = $(<Home />);
    expect($demo.find("span")).toHaveText("loading");
    await $demo.find("button").click();
    expect($demo.find("span")).toHaveText("idle");
  });

  it("abort preserves existing data", async () => {
    let count = 0;
    const Home = () => {
      const { data, loading, refresh, abort } = useAsync(async () => {
        await delay(50);
        return ++count;
      }, []);
      return (
        <div>
          <span>{data}</span>
          <em>{loading ? "loading" : "idle"}</em>
          <button id="refresh" onClick={() => refresh()}>
            refresh
          </button>
          <button id="abort" onClick={abort}>
            abort
          </button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("em").text() === "idle");
    // start a refresh then abort it
    await $demo.find("#refresh").click();
    await $demo.find("#abort").click();
    // data from first load is preserved
    expect($demo.find("span")).toHaveText("1");
    expect($demo.find("em")).toHaveText("idle");
  });

  it("abort resolves any pending refresh() promises", async () => {
    const Home = () => {
      const { refresh, abort } = useAsync(async () => {
        await delay(100);
        return "ok";
      }, []);
      return (
        <div>
          <button id="refresh" onClick={() => refresh()}>
            refresh
          </button>
          <button id="abort" onClick={abort}>
            abort
          </button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("#refresh").text() === "refresh");
    let resolved = false;
    // fire refresh but don't await — capture the promise
    const p = new Promise<void>((resolve) => {
      $demo
        .find("#refresh")
        .click()
        .then(() => resolve());
    });
    await delay(20);
    await $demo.find("#abort").click();
    await expect(p).resolves.toBeUndefined();
    resolved = true;
    expect(resolved).toBe(true);
  });

  it("abort does not affect state after the callback already resolved", async () => {
    const Home = () => {
      const { data, abort } = useAsync(async () => "done", []);
      return (
        <div>
          <span>{data ?? "empty"}</span>
          <button onClick={abort}>abort</button>
        </div>
      );
    };
    const $demo = $(<Home />);
    await until(() => $demo.find("span").text() === "done");
    await $demo.find("button").click();
    // calling abort after resolution is a no-op
    expect($demo.find("span")).toHaveText("done");
  });
});
