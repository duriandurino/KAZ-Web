import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import UserManagement from "./pages/UserManagement";
import RoomManagement from "./pages/RoomManagement";
import RoomTypeManagement from "./pages/RoomTypeManagement";
import ReviewManagement from "./pages/ReviewManagement";
import AmenityManagement from "./pages/AmenityManagement";
import ServiceManagement from "./pages/ServiceManagement";
import PaymentManagement from "./pages/PaymentManagement";
import Profile from "./pages/Profile";
import Bookings from "./pages/Bookings";
import MyBookings from "./pages/MyBookings";
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
          <Route path="/admin/room-type-management" element={<RoomTypeManagement />} />
          <Route path="/admin/bookings" element={<Bookings />} />
          <Route path="/admin/reviews" element={<ReviewManagement />} />
          <Route path="/admin/amenities" element={<AmenityManagement />} />
          <Route path="/admin/services" element={<ServiceManagement />} />
          <Route path="/admin/payments" element={<PaymentManagement />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["guest"]} />}>
          <Route path="/user/dashboard" element={<UserDashboard />} />
          <Route path="/user/profile" element={<Profile />} />
          <Route path="/user/bookings" element={<MyBookings />} />
          <Route path="/user/settings" element={<Settings />} />
          <Route path="/user/room/:id" element={<RoomDetails />} />
        </Route>
        <Route path="/room/:id" element={<RoomDetails />} />
        <Route path="/rooms/:id" element={<RoomDetails />} />
      </Routes>
    </Router>
  )
}

export default App
