import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import UserManagement from "./pages/UserManagement";
import RoomManagement from "./pages/RoomManagement";
import Profile from "./pages/Profile";
import Bookings from "./pages/Bookings";
import ProtectedRoute from "./components/ProtectedRoute";
import Settings from "./pages/Settings";
import RoomDetails from "./pages/RoomDetails";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/user-management" element={<UserManagement />} />
          <Route path="/admin/room-management" element={<RoomManagement />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["guest", "admin"]} />}>
          <Route path="/user/dashboard" element={<UserDashboard />} />
          <Route path="/user/profile" element={<Profile />} />
          <Route path="/user/bookings" element={<Bookings />} />
          <Route path="/user/settings" element={<Settings />} />
          <Route path="/room/:id" element={<RoomDetails />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
