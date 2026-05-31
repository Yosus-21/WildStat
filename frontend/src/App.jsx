import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LoginPage from './features/auth/pages/LoginPage';
import PendingDetectionsPage from './features/detections/pages/PendingDetectionsPage';
import DetectionReviewPage from './features/detections/pages/DetectionReviewPage';
import ValidatedDetectionsPage from './features/detections/pages/ValidatedDetectionsPage';
import DiscardedDetectionsPage from './features/detections/pages/DiscardedDetectionsPage';
import UploadMediaPage from './features/media/pages/UploadMediaPage';
import ValidatedDatasetPage from './features/dataset/pages/ValidatedDatasetPage';
import AnalyticsDashboardPage from './features/analytics/pages/AnalyticsDashboardPage';
import ReportsPage from './features/reports/pages/ReportsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/detections/pending" replace />} />
            <Route path="media/upload" element={<UploadMediaPage />} />
            <Route path="detections/pending" element={<PendingDetectionsPage />} />
            <Route path="detections/validated" element={<ValidatedDetectionsPage />} />
            <Route path="detections/discarded" element={<DiscardedDetectionsPage />} />
            <Route path="detections/:id/review" element={<DetectionReviewPage />} />
            <Route path="dataset/validated" element={<ValidatedDatasetPage />} />
            <Route path="analytics" element={<AnalyticsDashboardPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
