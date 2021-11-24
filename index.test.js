import React, { useEffect, useState } from "react";
import $, { until } from "react-test";
import "regenerator-runtime/runtime";

import { useAsyncEffect } from "./index.js";

const delay = time => new Promise(done => setTimeout(done, time));

describe("useAsyncEffect", () => {
  it("just works", async () => {
    const Home = () => {
      const [text, setText] = useState("Hello");
      useAsyncEffect(async () => {
        await delay(100);
        setText("World");
      }, []);
      return <div>{text}</div>;
    };

    const $demo = $(<Home />);
    expect($demo).toHaveText("Hello");
    await until(() => $demo.text() === "World");
    expect($demo).toHaveText("World");
  });
});
