import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import CreateJob from "./pages/CreateJob";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import UploadResume from "./pages/UploadResume";
import EditJob from "./pages/EditJob";
const ResumeBuilder = lazy(() => import("./pages/ResumeBuilder"));
import CoverLetter from "./pages/CoverLetter";
import InterviewPrep from "./pages/InterviewPrep";
import RecommendedJobs from "./pages/RecommendedJobs";
import MyApplications from "./pages/MyApplications";
import Applicants from "./pages/Applicants";
import SavedJobs from "./pages/SavedJobs";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";


function App() {
  return (
    <>
      <Navbar />

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="Recruiter">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-job"
          element={
            <ProtectedRoute role="Recruiter">
              <CreateJob />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs"
          element={<Jobs />}
        />

        <Route
          path="/jobs/:id"
          element={<JobDetails />}
        />

        <Route
          path="/upload-resume"
          element={
            <ProtectedRoute role="Candidate">
              <UploadResume />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-job/:id"
          element={
            <ProtectedRoute role="Recruiter">
              <EditJob />
            </ProtectedRoute>
          }
        />

        <Route
          path="/resume-builder"
          element={
            <ProtectedRoute role="Candidate">
              <Suspense fallback={<p className="text-center mt-10">Loading...</p>}>
                <ResumeBuilder />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs/:id/cover-letter"
          element={
            <ProtectedRoute role="Candidate">
              <CoverLetter />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs/:id/interview-prep"
          element={
            <ProtectedRoute role="Candidate">
              <InterviewPrep />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recommended-jobs"
          element={
            <ProtectedRoute role="Candidate">
              <RecommendedJobs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-applications"
          element={
            <ProtectedRoute role="Candidate">
              <MyApplications />
            </ProtectedRoute>
          }
        />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password/:token" element={<ResetPassword />} />

        <Route
          path="/saved-jobs"
          element={
            <ProtectedRoute role="Candidate">
              <SavedJobs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs/:id/applicants"
          element={
            <ProtectedRoute role="Recruiter">
              <Applicants />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <h1 className="text-center mt-20 text-3xl font-bold">
              404 — Page not found
            </h1>
          }
        />

      </Routes>
    </>
  );
}

export default App;