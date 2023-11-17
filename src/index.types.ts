import { useAsyncData, useAsyncEffect } from "../";

// Basics
useAsyncEffect(() => {});
useAsyncEffect(async () => {});
useAsyncEffect(() => {}, []);
useAsyncEffect(async () => {}, []);

// Cancellation
useAsyncEffect(async () => () => {}, []);

// Deps
useAsyncEffect(() => {}, []);
useAsyncEffect(() => {}, [10]);
useAsyncEffect(() => {}, ["a"]);
useAsyncEffect(() => {}, [true]);
useAsyncEffect(() => {}, [true, false, "a", 10]);

// Check that is an AbortSignal
useAsyncEffect(async (signal) => {
  signal.aborted;
  signal.onabort = () => console.log("Aborted");
}, []);

// Basics
{
  const [out, status] = useAsyncData(() => {});
  console.log(out, status);
}
{
  const [out, status] = useAsyncData(async () => {});
  console.log(out, status);
}
{
  const [out, status] = useAsyncData(() => {}, []);
  console.log(out, status);
}
{
  const [out, status] = useAsyncData(async () => {}, []);
  console.log(out, status);
}
// Deps
{
  const [out, status] = useAsyncData(() => {}, []);
  console.log(out, status);
}
{
  const [out, status] = useAsyncData(() => {}, [10]);
  console.log(out, status);
}
{
  const [out, status] = useAsyncData(() => {}, ["a"]);
  console.log(out, status);
}
{
  const [out, status] = useAsyncData(() => {}, [true]);
  console.log(out, status);
}
{
  const [out, status] = useAsyncData(() => {}, [true, false, "a", 10]);
  console.log(out, status);
}
{
  // Check that is an AbortSignal
  const [out, status] = useAsyncData(async (signal) => {
    signal.aborted;
    signal.onabort = () => console.log("Aborted");
  }, []);
  console.log(out, status);
}
