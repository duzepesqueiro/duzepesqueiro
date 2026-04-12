import React from "react";
import Routes from "./Routes";
import ThemeProvider from "./contexts/ThemeContext";
import { Toaster } from "sonner";

function App() {
  return (
    <ThemeProvider>
      <Routes />
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  );
}

export default App;