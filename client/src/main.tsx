// main.tsx
import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import "./index.css";
import React from "react";

// Using a simple data provider for now - you can implement the full DataContext later
const DataProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const App = lazy(() => import("./App")); //Lazy loading App component

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <DataProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <App />
      </Suspense>
      <Toaster />
    </DataProvider>
  </React.StrictMode>
);


// index.js (original file - remains mostly unchanged, except for the import of App)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; //Import from the same directory.  main.tsx handles lazy loading
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


// index.css (example, needs to be created)
body {
  margin: 0;
  font-family: sans-serif;
}

//App.js (example, needs to be created)
import React from 'react';

function App() {
  return (
    <div>
      <h1>Hello from App!</h1>
    </div>
  );
}

export default App;


//@/components/ui/toaster.tsx (example, needs to be created)
import React from 'react';

const Toaster = () => {
  return (
    <div>
      {/* Toaster implementation would go here */}
      <p>This is a placeholder toaster</p>
    </div>
  );
};

export default Toaster;