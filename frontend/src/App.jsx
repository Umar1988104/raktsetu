import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./i18n";
import { PrefsProvider } from "./prefs";
import { UiProvider } from "./components/UiFeedback";
import MotionRoot from "./motion/MotionRoot";
import ProtectedRoute from "./components/ProtectedRoute";
import MaybeLayout from "./components/MaybeLayout";
import HelpChat from "./components/HelpChat";
import { BridgeLoader } from "./components/Brand";

// Route-level code splitting: each screen is its own small download, fetched
// when someone first opens it (instead of one ~1 MB file up front).
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const Landing = lazy(() => import("./pages/Landing"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewRequestPage = lazy(() => import("./pages/NewRequestPage"));
const MyRequestsPage = lazy(() => import("./pages/MyRequestsPage"));
const RequestStatusPage = lazy(() => import("./pages/RequestStatusPage"));
const DonorNetworkPage = lazy(() => import("./pages/DonorNetworkPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const HospitalVerifyPage = lazy(() => import("./pages/HospitalVerifyPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const EmergencyRequestPage = lazy(() => import("./pages/EmergencyRequestPage"));
const CampsPage = lazy(() => import("./pages/CampsPage"));
const TrackPage = lazy(() => import("./pages/TrackPage"));
const CertificatePage = lazy(() => import("./pages/CertificatePage"));
const UpdatesPage = lazy(() => import("./pages/UpdatesPage"));
const MyImpactPage = lazy(() => import("./pages/MyImpactPage"));
const StockPage = lazy(() => import("./pages/StockPage"));
const ImpactPage = lazy(() => import("./pages/ImpactPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const MyCardPage = lazy(() => import("./pages/MyCardPage"));
const PublicCardPage = lazy(() => import("./pages/PublicCardPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

export default function App() {
  return (
    <PrefsProvider>
    <LanguageProvider>
    <MotionRoot>
    <UiProvider>
    <AuthProvider>
      <Suspense fallback={<BridgeLoader fullscreen />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/emergency" element={<EmergencyRequestPage />} />
          {/* Public pages: inside the app shell when logged in, plain page when not. */}
          <Route element={<MaybeLayout />}>
            <Route path="/camps" element={<CampsPage />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/stock" element={<StockPage />} />
          </Route>
          <Route path="/track/:token" element={<TrackPage />} />
          <Route path="/card/:id" element={<PublicCardPage />} />
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
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/card" element={<MyCardPage />} />
            <Route path="/my-impact" element={<MyImpactPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <HelpChat />
    </AuthProvider>
    </UiProvider>
    </MotionRoot>
    </LanguageProvider>
    </PrefsProvider>
  );
}
