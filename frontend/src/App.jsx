import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Home from "./pages/Home";
import DonorProfile from "./pages/DonorProfile";
import MyDonorProfile from "./pages/MyDonorProfile";
import EditDonorProfile from "./pages/EditDonorProfile";
import FindDonors from "./pages/FindDonors";
import RequestBlood from "./pages/RequestBlood";
import PublicBloodRequests from "./pages/PublicBloodRequests";
import Inbox from "./pages/Inbox";

import GlobalChatNotifications from "./components/chat/GlobalChatNotifications";

const hasToken = () => Boolean(localStorage.getItem("authToken"));

function Protected({ children }) {
  return hasToken() ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ children }) {
  return hasToken() ? <Navigate to="/home" replace /> : children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />

        <Route path="/home" element={<Home />} />

        <Route
          path="/register"
          element={
            <GuestOnly>
              <Register />
            </GuestOnly>
          }
        />

        <Route
          path="/login"
          element={
            <GuestOnly>
              <Login />
            </GuestOnly>
          }
        />

        <Route
          path="/become-donor"
          element={
            <Protected>
              <DonorProfile />
            </Protected>
          }
        />

        <Route
          path="/donor-profile"
          element={
            <Protected>
              <MyDonorProfile />
            </Protected>
          }
        />

        <Route
          path="/donor-profile/edit"
          element={
            <Protected>
              <EditDonorProfile />
            </Protected>
          }
        />

        <Route
          path="/donors"
          element={
            <Protected>
              <FindDonors />
            </Protected>
          }
        />

        <Route
          path="/request-blood"
          element={
            <Protected>
              <RequestBlood />
            </Protected>
          }
        />

        <Route path="/public-requests" element={<PublicBloodRequests />} />

        <Route
          path="/inbox"
          element={
            <Protected>
              <Inbox />
            </Protected>
          }
        />
      </Routes>

      {/* Global notifications stay mounted across page navigation */}
      <GlobalChatNotifications />
    </BrowserRouter>
  );
}

export default App;
