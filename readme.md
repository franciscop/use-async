# useAsync() [![npm install use-async](https://img.shields.io/badge/npm%20install-use--async-blue.svg "install badge")](https://www.npmjs.com/package/use-async) [![test badge](https://github.com/franciscop/use-async/workflows/tests/badge.svg "test badge")](https://github.com/franciscop/use-async/blob/master/.github/workflows/tests.yml) [![gzip size](https://badgen.net/bundlephobia/minzip/use-async?label=gzip&color=green "gzip badge")](https://github.com/franciscop/use-async/blob/master/index.min.js)

A Hook for all your async operations in React. Use it like a simple `async` + `useEffect()`, all the way to more complex usecases like returning data, data refresh, etc.

```ts
// Basic usage, like useEffect() + async
useAsync(async (signal) => {
  const res = await axios.get("/users/", { signal });
  setUsers(res.data);
}, []);
```

<details><summary>Example without <code>useAsync</code></summary>
  
```ts
// Equivalent without it:
useEffect(() => {
  const ctrl = new AbortController();
  (async () => {
    const res = await axios.get("/users/", { signal });
    setUsers(res.data);
  })();
  return () => {
    if (!ctrl.aborted) ctrl.abort();
  };
}, []);
```

</details>

For data fetching you can use the return value of `useAsync()` directly to get the state of the operation. This will automatically retrigger when the `id` changes, cancelling the previous `signal`:

```ts
import useAsync from "use-async";

const { data, error, loading } = useAsync(async (signal) => {
  const res = await axios.get(`/users/${id}`, { signal });
  return res.data;
}, [id]);

if (error) // ...
if (loading) // ...
// ...
```

Since this function can be defined to depend only on the arguments you can often extract the operations in a pure function, and add nice types:

```ts
const getUser = async (signal, id) => {
  const res = await axios.get(`/users/${id}`, { signal });
  return res.data;
};

const { data, error, loading } = useAsync<User>(getUser, [id]);
```

## Getting started


First create a React project (try [Vite with React or React-TS](https://vite.dev/guide/)) and install `use-async`:

```sh
npm install use-async
```

Then you can use `useAsync()` anywhere you want:

```tsx
import useAsync from 'use-async';

export default function UserList() {
  const { data, loading, error } = useAsync(() => api.get('/users'), []);
  
  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage>{error.message}</ErrorMessage>;
  
  return (
    <div>
      {data.map(user => <div>{user.name}</div>)}
    </div>
  );
}
````


## API

This is the full definition of the API, but most often you won't need even half of the options. Go to examples to see how to do the simple and more complex operations:

```ts
const { data, error, loading, refresh, update, abort } = useAsync<DataType>(async (signal, dep1, dep2) => {
  // ...
}, deps);
```

### `data`

The returned value from the callback with optional types as `T | undefined`. It's `undefined` on the initial load:

```tsx
const { data, error, loading } = useAsync<User>(async (signal, id) => {
  const res = await axios.get<User>(`/users/${id}`, { signal });
  return res.data;
}, [id]);

if (loading) return <Spinner />;
if (error) return <ErrorMessage />;
if (data) // ...
```

During a re-fetch (dependencies change, or `refresh()` is called), the previous value is preserved until the callback finishes. This means that you can use two loading methods, either a simple one with guards (as seen above), or one where you preserve the previous data and show a "refreshing..." indicator while reloading it:

```tsx
function UserList () {
  const { data, refresh } = useAsync<User[]>(async (signal) => {
    const res = await axios.get<User[]>("/users/", { signal });
    return res.data;
  }, []);
  
  const onAdd = async (newUser: User) => {
    await api.post('/users', user);
    // Trigger an update
    await refresh();
  };
  
  return (
    <div>
      <AddUserModal onAdd={onAdd} />
      {loading ? (data ? <RefreshingNotice /> : <InitialLoading />) : null}
      {error ? (data ? <FailedToRefresh /> : <InitialError />) : null}
      {data ? data.map(user => <UserCard {...user} />) : null}
    </div>
  );
}
```

### error

The caught error, typed as `Error | undefined`. It is `undefined` initially, while loading and after a successful resolution. Can be set at the same time as `data` when a re-fetch fails `data` holds the last successful value.

```tsx
const { data, error, refresh } = useAsync(fetchItems, []);

return (
  <div>
    {error && <Banner>Failed to refresh: {error.message}</Banner>}
    <ItemList data={data} />
    <button onClick={refresh}>Retry</button>
  </div>
);
```

### loading

`true` while the callback is running, including during re-fetches triggered by dep changes or `refresh()`. Can be `true` while `data` still holds a previous (stale) value:

```ts
const { data, loading } = useAsync(fetchItems, []);

// Swap entire view for spinner:
if (loading) return <Spinner />;

// Or overlay spinner on stale data:
return <Page loading={loading}><ItemList data={data} /></Page>;
```

### refresh()

Re-runs the callback with the latest deps. Returns a `Promise<void>` that resolves when the new data is ready, so you can sequence operations:

```ts
const { refresh } = useAsync(fetchItems, []);

const handleAdd = async (item) => {
  await api.post("/items", item);
  await refresh();
  showToast("Done!");
};
```

### update(value | fn)

Directly sets `data` without re-running the callback. Accepts either a value or an updater function that receives the previous value:

```ts
const { update } = useAsync(fetchItems, []);

// Set directly:
update(newItems);

// Or derive from previous:
update((prev) => prev.map((item) =>
  item.id === id ? { ...item, done: true } : item
));
```


### abort()

Cancels the in-flight request and sets `loading` to `false`, preserving whatever `data` was there before. The aborted callback's state updates are silently ignored. Any pending `await refresh()` promises also resolve immediately.

Useful for giving users a cancel button on slow operations:

```tsx
const { data, loading, abort } = useAsync(async (signal) => {
  const res = await axios.get("/reports/generate", { signal });
  return res.data;
}, []);

return (
  <div>
    {loading && <button onClick={abort}>Cancel</button>}
    {data && <ReportView report={data} />}
  </div>
);
```

Calling `abort()` when nothing is in flight is a no-op.

### callback

An async function (or regular function returning a value). Receives the `signal` as the first argument, followed by the spread of `deps`. Errors thrown inside are caught and stored in `error`.

```ts
useAsync(async (signal, id) => {
  const res = await axios.get(`/users/${id}`, { signal });
  return res.data;
}, [id]);
```

### signal

An [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) passed as the first argument to the callback. It aborts when the component unmounts or the deps change, cancelling any in-flight request automatically. Pass it to `axios`, `fetch`, etc.:

```ts
useAsync(async (signal) => {
  const res = await axios.get("/users", { signal });
  return res.data;
}, []);
```

To run cleanup after an async step, use `signal.addEventListener("abort", ...)`:

```ts
useAsync(async (signal) => {
  const res = await connectToStream();
  signal.addEventListener("abort", () => res.close());
  // ...
}, []);
```


### dependencies

The dependency array, same as `useEffect`. The hook re-runs whenever any value changes. Defaults to `[]`. Each dep is also passed as an argument to the callback, so you can extract it as a standalone function:

```ts
const getUser = async (signal: AbortSignal, id: number, userId: number) => { ... };

useAsync(getUser, [id, userId]);
```

## Simple async effect

When you don't need the return value, use it like `useEffect` but async. The signal aborts automatically when the component unmounts or when a dep changes, so stale requests never cause state updates on an unmounted component:

```ts
useAsync(async (signal) => {
  const res = await axios.get(`/users/${id}`, { signal });
  setProfile(res.data);
}, [id]);
```

Without `useAsync`, this requires manual boilerplate to get right:

```ts
useEffect(() => {
  const ctrl = new AbortController();
  (async () => {
    const res = await axios.get(`/users/${id}`, { signal: ctrl.signal });
    if (ctrl.signal.aborted) return; // guard against stale updates
    setProfile(res.data);
  })();
  return () => ctrl.abort();
}, [id]);
```

## Data fetching

Return the value from the callback and destructure `data`, `error`, and `loading`. The hook handles the full lifecycle with no extra state management:

```tsx
type User = { id: number; name: string; email: string };

export default function UserProfile({ id }: { id: number }) {
  const { data, error, loading } = useAsync(async (signal, id) => {
    const res = await axios.get<User>(`/users/${id}`, { signal });
    return res.data;
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}
```

## Extracting the callback

Since deps are passed as arguments to the callback, it depends only on its parameters. This makes it easy to pull out as a standalone, reusable, and testable function:

```ts
// Defined outside the component. No closures, easy to unit test
const getUser = async (signal: AbortSignal, id: number): Promise<User> => {
  const res = await axios.get<User>(`/users/${id}`, { signal });
  return res.data;
};

export default function UserProfile({ id }: { id: number }) {
  const { data, error, loading } = useAsync(getUser, [id]);
  // ...
}
```

## Search with race condition prevention

When `query` changes on every keystroke, each keystroke fires a new request. Without cancellation, slow responses from earlier keystrokes can arrive after newer ones, showing the wrong results. The signal handles this automatically, when `query` changes, the previous request is aborted before the new one starts:

```tsx
export default function UserSearch() {
  const [query, setQuery] = useState("");

  const { data: results, loading } = useAsync(async (signal, query) => {
    if (!query) return [];
    const res = await axios.get<User[]>(`/search?q=${query}`, { signal });
    return res.data;
  }, [query]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {loading && <Spinner />}
      {results?.map((user) => <UserRow key={user.id} user={user} />)}
    </div>
  );
}
```

No debouncing library needed for correctness, even if you fire 10 requests rapidly, only the last one's result will ever be set as `data`. Debouncing is still useful to reduce server load, but it's no longer required for correctness.

## Refresh after mutation

`refresh()` returns a `Promise` that resolves only when the new data has been fetched and stored. This lets you sequence a mutation and a reload without managing any extra loading state:

```tsx
export default function TodoList() {
  const { data: todos, refresh } = useAsync(async (signal) => {
    const res = await axios.get<Todo[]>("/todos", { signal });
    return res.data;
  }, []);

  const handleAdd = async (text: string) => {
    // POST the new item
    await axios.post("/todos", { text });
    // refresh() re-runs the callback; awaiting it means the list is
    // already up-to-date by the time the next line runs
    await refresh();
    showToast("Added!");
  };

  const handleDelete = async (id: number) => {
    await axios.delete(`/todos/${id}`);
    await refresh();
  };

  return (
    <div>
      <AddTodoForm onAdd={handleAdd} />
      {todos?.map((todo) => (
        <TodoRow key={todo.id} todo={todo} onDelete={handleDelete} />
      ))}
    </div>
  );
}
```

## Optimistic update with rollback

`update()` sets `data` immediately so the UI feels instant. If the request fails, roll back to the previous value by re-running the callback with `refresh()`. The combination of the two gives you the full optimistic update pattern:

```tsx
export default function TodoList() {
  const { data: todos, update, refresh } = useAsync(async (signal) => {
    const res = await axios.get<Todo[]>("/todos", { signal });
    return res.data;
  }, []);

  const handleToggle = async (id: number) => {
    // Snapshot current state for rollback
    const previous = todos;

    // Apply optimistically. UI updates immediately, no spinner
    update((prev) => prev.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    ));

    try {
      await axios.post(`/todos/${id}/toggle`);
    } catch {
      // Server rejected the change, roll back to the last known good state
      update(previous);
      showToast("Failed to update, reverted.");
    }
  };

  return todos?.map((todo) => (
    <TodoRow key={todo.id} todo={todo} onToggle={handleToggle} />
  ));
}
```

## Pagination / load more

Use `update(fn)` to accumulate pages rather than replace them. The dep tracks the current page number; each time it increments, the callback fetches that page and appends it to the existing list:

```tsx
export default function PostFeed() {
  const [page, setPage] = useState(1);

  const { data: posts, loading } = useAsync(async (signal, page) => {
    const res = await axios.get<Post[]>(`/posts?page=${page}`, { signal });
    const newPosts = res.data;

    // For page 1 return directly; for subsequent pages, append to previous
    if (page === 1) return newPosts;

    // update() gives us the previous value so we can merge
    return (prev: Post[] | undefined) => [...(prev ?? []), ...newPosts];
  }, [page]);

  return (
    <div>
      {posts?.map((post) => <PostCard key={post.id} post={post} />)}
      <button onClick={() => setPage((p) => p + 1)} disabled={loading}>
        {loading ? "Loading..." : "Load more"}
      </button>
    </div>
  );
}
```

## With statux

[statux](https://statux.dev) is a global state manager. The natural pattern is to load data into the store once on mount, then have any component read from it. `useAsync` replaces the manual `useEffect` + fetch pattern the statux docs suggest:

```tsx
import { Store, useStore } from "statux";
import useAsync from "use-async";

// In a top-level component, fetch once and store globally
function App() {
  const [, setBooks] = useStore("books");

  useAsync(async (signal) => {
    const res = await api.get("/books", { signal });
    setBooks(res.data);
  }, []);

  return <BookList />;
}

// Any child can read from the store — no prop drilling, no re-fetch
function BookList() {
  const [books] = useStore("books");
  return books?.map((book) => <BookCard key={book.id} book={book} />);
}

// Root
<Store books={[]}>
  <App />
</Store>
```

For user-specific data that should reload when the logged-in user changes, pass the user id as a dep:

```tsx
function App() {
  const userId = useSelector("user.id");
  const [, setProfile] = useStore("profile");

  useAsync(async (signal, userId) => {
    if (!userId) return;
    const res = await api.get(`/users/${userId}`, { signal });
    setProfile(res.data);
  }, [userId]);
}
```

## With form-mate

[form-mate](https://form-mate.dev) handles form submission and its loading/error state. Combined with `useAsync`, you get the full data lifecycle: load data into the form, submit changes, and refresh the list — all without managing extra state:

```tsx
import Form, { FormLoading, FormError } from "form-mate";
import useAsync from "use-async";

export default function TodoList() {
  const { data: todos, update } = useAsync(async (signal) => {
    const res = await api.get("/todos", { signal });
    return res.data as Todo[];
  }, []);

  const handleSubmit = async ({ title }: { title: string }) => {
    const todo = await api.post("/todos", { title });
    update(prev => [todo, ...prev]);
  };

  return (
    <div>
      <Form onSubmit={handleSubmit} autoReset>
        <input name="title" placeholder="New todo" required />
        <button>Add</button>
        <FormLoading>Adding...</FormLoading>
        <FormError />
      </Form>

      {todos?.map((todo) => <TodoRow key={todo.id} todo={todo} />)}
    </div>
  );
}
```

`form-mate` handles the submission loading/error state; `useAsync` handles the list loading/error state — each does its job independently, and `update()` is the single connection point between them.

If you prefer to trigger a full server-side refresh (other users in the app, etc), could do so with a `await refresh()` better:

```ts
const handleSubmit = async ({ title }: { title: string }) => {
  await api.post("/todos", { title });
  await refresh();
};
````

## With fch

[fch](https://github.com/franciscop/fetch) is a tiny fetch wrapper that returns the parsed body directly (no `.json()` unwrapping, no `.data` property). It also throws automatically on non-2xx responses, which aligns perfectly with how `useAsync` captures errors:

```tsx
import fch from "fch";
import useAsync from "use-async";

// Create a configured instance once
const api = fch.create({ baseUrl: "https://api.example.com" });
function getUser (signal: AbortSignal, id: number): User {
  return api.get(`/users/${id}`, { signal });
};

export default function UserProfile({ id }: { id: number }) {
  // fch returns the body directly — no unwrapping needed
  const { data, error, loading } = useAsync(getUser, [id]);

  if (loading) return <Spinner />;
  if (error) return <div>{error.message}</div>;
  return <h1>{data.name}</h1>;
}
```

Since `fch` throws on non-2xx responses, errors from the server land in `error` automatically. For mutations, `fch.post` / `fch.del` pair cleanly with `refresh()`:

```tsx
const { data: items, refresh } = useAsync(
  (signal) => api.get("/items", { signal }),
  []
);

const handleDelete = async (id: number) => {
  await api.del(`/items/${id}`);
  await refresh();
};
```

## Cleanup via signal

For subscriptions or any resource that must be explicitly released, use `signal.addEventListener("abort", ...)`. This runs the cleanup whenever the component unmounts or the deps change, even if it happens mid-async:

```tsx
export default function LiveFeed({ channelId }: { channelId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);

  useAsync(async (signal, channelId) => {
    const source = new EventSource(`/channels/${channelId}/events`);

    // Clean up the connection when channelId changes or component unmounts
    signal.addEventListener("abort", () => source.close());

    source.onmessage = (e) => {
      // The signal is already aborted by the time this fires on a stale
      // channel. The EventSource is closed so this will never run
      setMessages((prev) => [...prev, JSON.parse(e.data)]);
    };
  }, [channelId]);

  return messages.map((msg) => <MessageRow key={msg.id} message={msg} />);
}
```
