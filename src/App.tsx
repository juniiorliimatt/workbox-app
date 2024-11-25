import * as React from 'react'
import './App.css'
import {RouterProvider} from "react-router-dom";
import router from "@/routes/routes.tsx";
import {AuthProvider} from "@/contexts/AuthContext.tsx";

function App() {
  return (
    <React.StrictMode>
      <AuthProvider>
        <RouterProvider router={router}/>
      </AuthProvider>
    </React.StrictMode>
  )
}

export default App
