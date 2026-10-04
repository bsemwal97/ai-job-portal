import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { API_BASE, errorMessage } from "../config";
import { STATUS_STYLES } from "../statusStyles";

const STATUSES = ["Applied", "Shortlisted", "Interview", "Rejected", "Hired"];

// Recruiter view: applicants for one job, with status updates and AI screening
function Applicants() {

  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [screening, setScreening] = useState(false);
  const [aiResults, setAiResults] = useState({});   // applicationId -> result
  const [skipped, setSkipped] = useState(0);
  const [aiRan, setAiRan] = useState(false);


  useEffect(() => {

    const fetchApplicants = async () => {

      try {

        const response = await axios.get(`${API_BASE}/api/applications/job/${id}`);

        setJob(response.data.job);
        setApplications(response.data.applications);

      } catch (err) {

        setError(errorMessage(err, "Could not load applicants"));

      } finally {

        setLoading(false);

      }
    };

    fetchApplicants();

  }, [id]);


  const updateStatus = async (applicationId, status) => {

    try {

      await axios.patch(`${API_BASE}/api/applications/${applicationId}/status`, { status });

      setApplications((prev) =>
        prev.map((a) => (a._id === applicationId ? { ...a, status } : a))
      );

    } catch (err) {

      setError(errorMessage(err, "Could not update status"));

    }
  };


  const runScreening = async () => {

    try {

      setScreening(true);
      setError("");

      const response = await axios.post(`${API_BASE}/api/ai/screen-applicants/${id}`);

      const byId = {};
      response.data.results.forEach((r) => { byId[r.applicationId] = r; });

      setAiResults(byId);
      setSkipped(response.data.skipped || 0);
      setAiRan(true);

    } catch (err) {

      setError(errorMessage(err, "AI screening failed"));

    } finally {

      setScreening(false);

    }
  };


  const downloadResume = async (userId, fallbackName) => {

    try {

      const response = await axios.get(`${API_BASE}/api/upload/resume/${userId}`, {
        responseType: "blob",
      });

      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = url;
      link.download = fallbackName || "resume";
      link.click();

      URL.revokeObjectURL(url);

    } catch {

      setError("Could not download resume (the candidate may not have uploaded one)");

    }
  };


  // After AI screening, show best matches first
  const sorted = [...applications].sort(
    (a, b) => (aiResults[b._id]?.score ?? -1) - (aiResults[a._id]?.score ?? -1)
  );


  if (loading) {
    return <h1 className="text-center mt-10 text-2xl">Loading applicants...</h1>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      <div className="max-w-5xl mx-auto">

        <Link to="/dashboard" className="text-gray-500 hover:text-black">
          ← Back to dashboard
        </Link>

        <div className="flex flex-wrap justify-between items-end gap-4 mt-4 mb-8">

          <div>
            <h1 className="text-4xl font-bold">Applicants</h1>
            {job && (
              <p className="text-gray-600 mt-1">
                {job.title} · {job.company} · {applications.length} applied
              </p>
            )}
          </div>

          {applications.length > 0 && (
            <button
              type="button"
              onClick={runScreening}
              disabled={screening}
              className="bg-black text-white px-6 py-3 rounded-lg disabled:opacity-50"
            >
              {screening ? "Screening with AI..." : "✨ AI Rank Applicants"}
            </button>
          )}

        </div>

        {error && (
          <div className="bg-red-100 text-red-600 px-4 py-3 rounded-lg mb-6">{error}</div>
        )}

        {aiRan && skipped > 0 && (
          <div className="bg-yellow-50 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            {skipped} applicant{skipped > 1 ? "s" : ""} without a saved resume profile
            {skipped > 1 ? " were" : " was"} not scored.
          </div>
        )}

        {!error && applications.length === 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-md text-center text-gray-600">
            No one has applied to this job yet.
          </div>
        )}

        <div className="space-y-4">

          {sorted.map((app) => {

            const ai = aiResults[app._id];

            return (
              <div key={app._id} className="bg-white p-6 rounded-2xl shadow-md">

                <div className="flex flex-wrap justify-between gap-4">

                  <div>
                    <h3 className="text-xl font-semibold">{app.user?.name || "Deleted user"}</h3>
                    <p className="text-gray-600">{app.user?.email}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Applied on {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">

                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[app.status]}`}>
                      {app.status}
                    </span>

                    <select
                      value={app.status}
                      onChange={(e) => updateStatus(app._id, e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>

                  </div>

                </div>

                {app.user?.resumeFile?.originalName && (
                  <button
                    type="button"
                    onClick={() => downloadResume(app.user._id, app.user.resumeFile.originalName)}
                    className="mt-4 border border-black px-4 py-2 rounded-lg text-sm"
                  >
                    📄 Download resume ({app.user.resumeFile.originalName})
                  </button>
                )}

                {ai && (
                  <div className="mt-5 border-t pt-4">

                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold">{ai.score}</span>
                      <span className="text-gray-500">/ 100 AI fit score</span>
                    </div>

                    <p className="text-gray-700 mt-2">{ai.summary}</p>

                    <div className="grid md:grid-cols-2 gap-4 mt-3 text-sm">

                      {ai.strengths.length > 0 && (
                        <div>
                          <p className="font-semibold text-green-700 mb-1">Strengths</p>
                          <ul className="list-disc ml-5 text-gray-700">
                            {ai.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}

                      {ai.gaps.length > 0 && (
                        <div>
                          <p className="font-semibold text-red-700 mb-1">Gaps</p>
                          <ul className="list-disc ml-5 text-gray-700">
                            {ai.gaps.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}

                    </div>

                  </div>
                )}

              </div>
            );
          })}

        </div>

        {aiRan && (
          <p className="text-xs text-gray-400 mt-6">
            AI scores are a screening aid based on saved resume profiles, not a hiring decision.
            Always review candidates yourself.
          </p>
        )}

      </div>

    </div>
  );
}

export default Applicants;
