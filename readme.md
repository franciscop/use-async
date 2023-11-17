# Use Async [![npm install use-async](https://img.shields.io/badge/npm%20install-use--async-blue.svg "install badge")](https://www.npmjs.com/package/use-async) [![test badge](https://github.com/franciscop/use-async/workflows/tests/badge.svg "test badge")](https://github.com/franciscop/use-async/blob/master/.github/workflows/tests.yml) [![gzip size](https://img.badgesize.io/franciscop/use-async/master/src/index.js.svg?compression=gzip "gzip badge")](https://github.com/franciscop/use-async/blob/master/src/index.js)

Like useEffect, but async for ease of use:

```js
import { useAsyncEffect } from "use-async";

// A React hook, so follow usual React Hook rules:
useAsyncEffect(async () => {
  const info = await someAsyncOp();
  setState(info);
}, [id]);
```

The effect receives a `signal` that can be used with `fetch()`, axios, etc. to cancel ongoing promises:

```js
import { useAsyncEffect } from "use-async";

useAsyncEffect(async (signal) => {
  const res = await axios.get("/users", { signal });
  setState(res.data);
}, []);
```

This library has two named exports (feel free [to propose more](https://github.com/franciscop/use-async/discussions)!):

- [`useAsyncEffect`](#useAsyncEffect): handle async effects without race conditions
- [`useAsyncData`](#useAsyncData): handle data fetching operations and dependencies

## Getting Started

First install the library in your React (16.8+) project:

```
npm install use-async
```

Then import either of the async functions:

```js
import { useAsyncEffect } from "use-async";
```

Finally, use the hook within your component to do data fetching or other async operations:

```js
import { useAsyncEffect } from "use-async";

export default function UserProfile({ id }) {
  const [profile, setProfile] = useState(null);

  useAsyncEffect(
    async (signal) => {
      const res = await axios.get("/users/" + id, { signal });
      setProfile(res.data);
    },
    [id]
  );

  if (!profile) return <Spinner />;

  return (
    <div>
      <h1>{profile.name}</h1>...
    </div>
  );
}
```

## API

This library has two named exports:

- [`useAsyncEffect`](#useAsyncEffect): handle async effects without race conditions
- [`useAsyncData`](#useAsyncData): handle data fetching operations and dependencies

Some shared points on both functions:

- The signature of both is first an _async_ function, and second the dependencies array.
- The _async_ function receives as arguments first the signal, and then the spread of the dependencies.
- The signal will be _aborted_ either when the component itself unmounts, or when the dependencies for the hook change. AbortErrors are automatically catched so you don't need to worry about _those_.
- `useAsyncData` is a wrapper of `useAsyncEffect` for convenience, to make it easier for fetching data asynchronously to use in the current component.
- This library solves two major problems with the traditional `useEffect()`: async functions and race conditions. See [this article by Max Rozen](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect) about one of the main problems this library solves.

> The return of the hooks is different, as well as the expected return from the _async_ callbacks. Please read the documentation below for details.

### `useAsyncEffect()`

This is a similar hook to `useEffect()`, but explicitly designed to work asynchronously and to make it easy to handle race conditions:

```js
import { useAsyncEffect } from "use-async";

// Easily handle API calls
const [profile, setProfile] = useState(null);
useAsyncEffect(
  async (signal) => {
    const data = await getUserProfile(id);
    if (signal.aborted) return; // <= Avoid race conditions on the network!
    setProfile(data);
  },
  [id]
);
```

> Note: the above can be simplified even further with useAsyncData() below, but we think it's a very common usage so wanted to give a familiar example to the reader.

The arguments passed to the _async_ function inside useAsyncEffect() are:

1. `signal`: an [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) that will be aborted if the component is unmounted or the function becomes stale (when the dependencies change). If the dependencies are an empty array, then it will only indicate when the component is unmounted.
2. `dep1`: the first dependency from the array of dependencies.
3. `dep2`: the second dependency from the array of dependencies.
4. etc.

The `signal` is a standard [AbortSignal instance](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal), which both `fetch()` and `axios()` accept out of the box. This means you can cancel ongoing requests that have become stale/unwanted:

```js
// Aborts the request if it becomes invalid while ongoing
const [profile, setProfile] = useState(null);
useAsyncEffect(
  async (signal) => {
    const res = await axios.get(`/users/${id}`, { signal });
    setProfile(res.data);
  },
  [id]
);

// Aborts the request if it becomes invalid while ongoing
const [profile, setProfile] = useState(null);
useAsyncEffect(
  async (signal) => {
    const res = await fetch(`/api/users/${id}`, { signal });
    const data = await res.json();
    setProfile(data);
  },
  [id]
);
```

> It is normally to cancel any ongoing request if you know it's stale. It's normally not done for how hard it used to be compared to the light benefit of avoiding extra requests, but as you can see above with use-async it becomes easier than ever to abort stale requests!

You can add a cleanup function in two different ways: if the return value is a function, or adding an event listener to `signal`. The former is the easiest and most straightforward when you have a single async operation, but the latter might simplify your code if you have a complex series of async operations:

```js
// Simple example: adding a single side effect
useAsyncEffect(async signal => {
  const res1 = await op1();
  if (signal.aborted) return;
  const id = setTimeout(() => {...}, 1000);
  return () => {
    clearTimeout(id);
  };
}, [id]);

// Complex example: adding multiple side effects and cleanups
useAsyncEffect(async signal => {
  const res1 = await op1();
  if (signal.aborted) return;
  const id1 = setTimeout(() => {
    ...
  }, 1000);
  signal.addEventListener("abort", () => clearTimeout(id1));

  const res2 = await op2();
  if (signal.aborted) return;
  const id2 = setTimeout(() => {
    ...
  }, 2000);
  signal.addEventListener("abort", () => clearTimeout(id2));
}, [id]);
```

### `useAsyncData()`

This is a helper for those cases when you are fetching data in the async function and setting it to a local variable in the current component. It includes a state machine to make it even easier:

```js
import { useAsyncData } from 'use-async';

const myAsyncOperation = async (signal, id) => {...};

export default function MyAsyncComponent({ id }) {
  const [data, status] = useAsyncData(myAsyncOperation, [id]);

  if (status === "LOADING") return <Spinner />;
  if (status === "ERROR") return <div>{data.message}</div>;

  // Whatever the data is and you want to display
  return <div>{data.name}</div>;
}
```

It simplifies the fetching of data and the loading around it. The state machine can be completely ignored if you want a quick and easy usage, you just need to check that the data has the proper structure:

```js
export default function MyAsyncComponent({ id }) {
  const [data] = useAsyncData(myAsyncOperation, [id]);

  // Whatever the data is and you want to display
  return (
    <ul>{Array.isArray(data) ? data.map((item) => <li>{item}</li>) : null}</ul>
  );
}
```

The arguments passed to the _async_ function inside useAsyncData() are:

1. `signal`: an [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) that will be aborted if the component is unmounted or the function becomes stale (when the dependencies change). If the dependencies are an empty array, then it will only indicate when the component is unmounted.
2. `dep1`: the first dependency from the array of dependencies.
3. `dep2`: the second dependency from the array of dependencies.
4. etc.

So, the dependencies will be passed as arguments to this callback. This makes it a easier to extract the callback as a different function if wanted, specially since the data will be set when returned from the function:

```js
import { useAsyncData } from "use-async";

// Extract it into a single function accepting the signal and the deps as args.
const getUserProfile = async (signal, id) => {
  const res = await fetch(`/users/${id}`, { signal });
  const data = await res.json();
  return data;
};

const MyComponent = ({ id }) => {
  // Provide the callback and deps; which are injected as args after "signal"
  const [profile] = useAsyncData(getUserProfile, [id]);

  // ...
};
```

The default value should be done by using the destructuring default value:

```js
const [data = "myDefaultValue", status] = useAsyncData(...);
```

The `"LOADING"` status might be shown even when `data` is defined. This happens when the previous data is stale, and it gives you enough flexibility to decide what to do while loading the new data. You can hide the stale data, dim it out, overlay a loading indicator over it, etc.

Some examples on how to deal with the stale data while loading new data:

```js
const [data, status] = useAsyncData(...);

// Example 1 - replace the whole page for a spinner while loading new data
if (status === "LOADING") return <Spinner />;
return <ItemList data={data} />;

// Example 2 - replace only a part of the page for a spinner
return (
  <div>
    {status === "LOADING" ? <Spinner /> : <ItemList data={data} />}
  </div>
);

// Example 3 - overlay a spinner on top of the stale data
return (
  <Page overlaySpinner={status === "LOADING"}>
    <ItemList data={data} />
  </Page>
);

// Example 4 - show a small spinner on top, similar to pulling down on Twitter
return (
  <div>
    {status === "LOADING" && <SmallSpinner />}
    <ItemList data={data} />
  </div>
);

// etc
```

> Note: assuming that if there's no "data", ItemList graciously shows a message

## Examples

### Simple profile fetch

As we saw before, this is a simple profile fetch that also avoids race conditions:

```js
// Easily handle API calls
const [profile, setProfile] = useState(null);
useAsyncEffect(
  async (signal) => {
    const res = await axios.get(`/users/${id}`);
    if (signal.aborted) return; // <= Avoid race conditions on the network!
    setProfile(res.data);
  },
  [id]
);
```

Since Axios (and `fetch()`) accept the `signal` as an option, the above can also be converted to:

```js
const [profile, setProfile] = useState(null);
useAsyncEffect(
  async (signal) => {
    const res = await axios.get(`/users/${id}`, { signal });
    setProfile(res.data);
  },
  [id]
);
```

We also export `useAsyncData`, which makes the above even easier:

```js
const [profile, status] = useAsyncData(
  async (signal) => {
    const res = await axios.get(`/users/${id}`);
    return res.data;
  },
  [id]
);
```

Finally, the simplest we can do is if we either make axios return simply the data instead of the response (with an interceptor) or we put that as a separated function:

```js
// Outside our component
const getProfile = async (signal, id) => {
  const res = await axios.get(`/users/${id}`);
  return res.data;
};

export default function UserProfile({ id }) {
  const [profile, status] = useAsyncData(getProfile, [id]);

  return (...);
};
```

If we want to do the same with the native `useEffect`, it becomes a lot more cumbersome since now we need to track the status manually:

```js
const [profile, setProfile] = useState(null);
useEffect(() => {
  let isActive = true;
  axios.get(`/users/${id}`).then((res) => {
    if (!isActive) return;
    setProfile(res.data);
  });
  return () => {
    isActive = false;
  };
}, [id]);
```

For this code, that has the issue that it doesn't even check if the current page is still mounted before killing it:

```js
// How you might be doing it now
const [state, setState] = useState(null);
useEffect(() => {
  axios.get("/pages/" + id).then((res) => {
    setState(res.data);
  });
}, [id]);
```

Easily handle async API calls:

```js
// New way of doing it
const [state, setState] = useState(null);
useAsyncEffect(
  async (signal) => {
    const res = await axios.get("/pages/" + id);
    if (signal.aborted) return;
    setState(res.data);
  },
  [id]
);
```

### Compare to `@n1ru4l/use-async-effect`

This library for use-async-effect gets some bits right (we should support generators at some point!), but IMHO it still gives you too many shotguns to shot your foot with. Let's compare their clean example given here with our code:

```js
// After 🤩
import useAsyncEffect from "@n1ru4l/use-async-effect";

const MyComponent = ({ filter }) => {
  const [data, setData] = useState(null);

  useAsyncEffect(
    function* (onCancel, c) {
      const controller = new AbortController();

      onCancel(() => controller.abort());

      const data = yield* c(
        fetch("/data?filter=" + filter, {
          signal: controller.signal,
        }).then((res) => res.json())
      );

      setData(data);
    },
    [filter]
  );

  return data ? <RenderData data={data} /> : null;
};
```

Our solution of the same problem is this:

```js
// ✅ Name easier to remember
import { useAsyncEffect } from "use-async";

const MyComponent = ({ filter }) => {
  const [data, setData] = useState(null);

  // ✅ Signal is already provided by the library
  useAsyncEffect(
    async (signal) => {
      // ✅ More readable code, so easier to follow workflow
      // ✅ await is simpler than a generator+yield
      // ✅ signal will cancel if the component is unmounted or the deps change
      const res = await fetch("/data?filter=" + filter, { signal });
      const data = await res.json();
      setData(data);
    },
    [filter]
  );

  return data ? <RenderData data={data} /> : null;
};
```

The implementation with our library (`use-async`) is half of the lines of code (10 vs 18) while keeping your code legible and straightforward.

We've looked at this and other existing libraries, and found that we could improve meaningful upon them. That's why we decided to launch `use-async` on 2021 instead of using one of the existing ones.

## Thanks

Special thanks to:

- Max Rozen's [great article](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect) on using AbortSignal with useEffect. I had a rough idea on how to proceed, and that article cemented it!
- `use-async-effect` (to which I contributed the `isMounted()` check) for being what I've been using for a while. It's [what I've learned](https://github.com/rauldeheer/use-async-effect/issues/13) by using it that allowed me to create `use-async`.
