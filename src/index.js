import React from "react";
import ReactDOM from "react-dom/client";
import { Auth } from "./auth/auth";
import { Router } from "./router";
import { MainProvider } from "context/main/MainProvider";

import "./styles/globals.css";
import "./styles/light.css";
import "./styles/bekstrap.css";
import "styles/page.css";
import "styles/lives.css";
import Loading from "components/loading";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <MainProvider>
    {/* <Loading /> */}
    <Auth>
      <Router />
    </Auth>
  </MainProvider>
);
