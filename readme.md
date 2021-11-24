# Use Async  [![npm install use-async](https://img.shields.io/badge/npm%20install-use--async-blue.svg "install badge")](https://www.npmjs.com/package/use-async) [![test badge](https://github.com/franciscop/use-async/workflows/tests/badge.svg "test badge")](https://github.com/franciscop/use-async/blob/master/.github/workflows/tests.yml) [![gzip size](https://img.badgesize.io/franciscop/use-async/master/index.min.js.svg?compression=gzip "gzip badge")](https://github.com/franciscop/use-async/blob/master/index.min.js)

React hooks to make handling async operations a breeze:

```js
import { useAsyncEffect, useAsyncData } from "use-async";

// Handle async effects while avoiding race conditions with the dependencies
useAsyncEffect(async signal => {
  const res = await axios.get("/users/" + id);
  if (signal.aborted) return;  // <= This avoids race conditions
  setState(res.data);
}, [id]);

// Handle async functions whose primary objective is to fetch data for the
// current component. Status is a state machine of "LOADING", "READY", "ERROR"
const [data, status] = useAsyncData(async signal => {
  const res = await axios.get("/users/" + id, { signal });  // <= Cancels stale requests
  return res.data;
}, [id]);
```

This library has two main exports (feel free to propose more!):
- [`useAsyncEffect`](#useAsyncEffect): handle async effects without race conditions
- [`useAsyncData`](#useAsyncData): handle data fetching operations and dependencies

## `useAsyncEffect()`

This is a similar hook to `useEffect()`, but explicitly designed to handle async effects. It has multiple advantages over the plain `useEffect()`:

- Use `async` / `await` effectively, avoiding callback hell.
- Avoid race conditions very easily, without keeping track of callbacks manually.
- Create async cleanup functions easily.

```js
// Easily handle API calls
const [profile, setProfile] = useState(null);
useAsyncEffect(async signal => {
  const data = await getUserProfile(id);
  if (signal.aborted) return;  // <= Avoid race conditions on the network!
  setProfile(data);
}, [id]);
```

> Note: the above can be simplified even further with useAsyncData() below, but we think it's a very common usage so wanted to give a familiar example to the reader.

You can also abort ongoing requests by using `signal` within `fetch()` or `axios()`, since they both work with `signal` straight out of the box:

```js
// Aborts the request if it becomes invalid while ongoing!
const [profile, setProfile] = useState(null);
useAsyncEffect(async signal => {
  const res = await axios.get("/users/" + id, { signal });
  setProfile(res.data);
}, [id]);
```

> It is in fact recommendable to cancel any ongoing request if you know it's stale. It's normally not done for how hard it used to be compared to the light benefit of avoiding extra requests, but as you can see above with useAsyncEffect() it becomes trivial to abort stale requests!

You can add a cleanup function in two different ways: if the return value is a function, or adding an event listener to `signal`. The former is the easiest, but if you want to cancel multiple effects the latter might actually become easier because you don't need to track what you are returning on each `if (signal.aborted)`:

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
  const id = setTimeout(() => {
    ...
  }, 1000);
  signal.addEventListener("abort", () => clearTimeout(id));

  const res2 = await op2();
  if (signal.aborted) return;
  const id2 = setTimeout(() => {
    ...
  }, 2000);
  signal.addEventListener("abort", () => clearTimeout(id2));
}, [id]);
```


### Examples

#### Simple profile fetch

As we saw before, this is a simple profile fetch that also avoids race conditions:

```js
// Easily handle API calls
const [profile, setProfile] = useState(null);
useAsyncEffect(async signal => {
  const res = await axios.get("/users/" + id);
  if (signal.aborted) return;  // <= Avoid race conditions on the network!
  setProfile(res.data);
}, [id]);
```

Since Axios (and `fetch()`) accept the `signal` as an option, the above can also be converted to:

```js
const [profile, setProfile] = useState(null);
useAsyncEffect(async signal => {
  const res = await axios.get("/users/" + id, { signal });
  setProfile(res.data);
}, [id]);
```

We also export `useAsyncData`, which makes the above even easier:

```js
const [profile, status] = useAsyncData(async signal => {
  const res = await axios.get("/users/" + id);
  return res.data;
}, [id]);
```

Finally, the simplest we can do is if we either make axios return simply the data instead of the response (with an interceptor) or we put that as a separated function:

```js
// Outside our component
const getProfile = async (signal, id) => {
  const res = await axios.get("/users/" + id);
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
  axios.get("/users/" + id).then(res => {
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
  axios.get("/pages/" + id).then(res => {
    setState(res.data);
  });
}, [id]);
```

Easily handle async API calls:

```js
// New way of doing it
const [state, setState] = useState(null);
useAsyncEffect(async signal => {
  const res = await axios.get("/pages/" + id);
  if (signal.aborted) return;
  setState(res.data);
}, [id]);
```


## `useAsyncData()`

This is normally expected to be used simply in this way:

```js
export default function MyAsyncComponent({ id }) {
  const [data, status] = useAsyncData(myAsyncOperation, [id]);

  if (status === "LOADING") return <Spinner />;
  if (status === "ERROR") return <div>{data.message}</div>;

  // Whatever the data is and you want to display
  return (

  );
}
```

So it simplifies greatly the actual fetching. The state machine can be completely ignored if you want a quick and easy usage, you just need to check that the data has the proper structure:

```js
export default function MyAsyncComponent({ id }) {
  const [data] = useAsyncData(myAsyncOperation, [id]);

  // Whatever the data is and you want to display
  return (
    <ul>
      {Array.isArray(data)
        ? data.map(it => <li>{it.name}</li>)
        : <li>Unable to load data</li>}
    </ul>
  );
}
```

The default data can and should be loaded just by using the destructuring default value:

```js
const [data = "myDefaultValue", status] = useAsyncData(...);
```

The `"LOADING"` status might be shown even when `data` is defined. This happens when the previous data is stale, and it gives you enough flexibility to decide what to do. You can hide the stale data, dim it out, overlay a loading indicator over it, etc.

```js
const [data, status] = useAsyncData(...);

// Example 1 -  replace the whole page for a spinner (problem: too much flashing)
if (status === "LOADING") return <Spinner />;
return <ItemList data={data} />;

// Example 2 - show spinner only within the data scope
return (
  <div>
    {status === "LOADING" ? <Spinner /> : <ItemList data={data} />}
  </div>
);

// Example 3 - overlay a spinner but keep the previous visible
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
