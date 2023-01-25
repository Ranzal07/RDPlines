import "./App";
import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import LayoutContextProvider from "./components/LayoutContext";
import Home from "./pages/home";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Results from "./pages/results";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/results",
    element: <Results />,
  },
]);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ToastContainer />
    <LayoutContextProvider>
      <RouterProvider router={router} />
    </LayoutContextProvider>
  </React.StrictMode>
);
