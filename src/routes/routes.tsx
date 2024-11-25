import {createBrowserRouter} from "react-router-dom";
import Login from "@/pages/Login.tsx";
import {Dashboard} from "@mui/icons-material";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
]);

export default router;
