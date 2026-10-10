import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./i18n";
import { UiProvider } from "./components/UiFeedback";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import CompleteProfile from "./pages/CompleteProfile";
import Dashboard from "./pages/Dashboard";
import NewRequestPage from "./pages/NewRequestPage";
import MyRequestsPage from "./pages/MyRequestsPage";
import RequestStatusPage from "./pages/RequestStatusPage";
import DonorNetworkPage from "./pages/DonorNetworkPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import HospitalVerifyPage from "./pages/HospitalVerifyPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import EmergencyRequestPage from "./pages/EmergencyRequestPage";
import CampsPage from "./pages/CampsPage";
import TrackPage from "./pages/TrackPage";
import CertificatePage from "./pages/CertificatePage";
import UpdatesPage from "./pages/UpdatesPage";

export default function App() {
  return (
    <LanguageProvider>
    <UiProvider>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/emergency" element={<EmergencyRequestPage />} />
        <Route path="/camps" element={<CampsPage />} />
        <Route path="/track/:token" element={<TrackPage />} />
        <Route
          path="/certificate/:donorId/:entryId"
          element={
            <ProtectedRoute>
              <CertificatePage />
            </ProtectedRoute>
          }
        />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute requireProfile={false}>
              <CompleteProfile />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/requests/new" element={<NewRequestPage />} />
          <Route path="/requests" element={<MyRequestsPage />} />
          <Route path="/requests/:id" element={<RequestStatusPage />} />
          <Route path="/donors" element={<DonorNetworkPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/verify" element={<HospitalVerifyPage />} />
          <Route path="/updates" element={<UpdatesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </AuthProvider>
    </UiProvider>
    </LanguageProvider>
  );
}
