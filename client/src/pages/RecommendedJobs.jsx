import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_BASE = "http://localhost:5000";

function authHeaders() {
  return {
    authorization: localStorage.getItem("token"),
  };
}

function RecommendedJobs() {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const findMatches = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE}/api/ai/recommended-jobs`,
        { headers: authHeaders() }
      );

      setRecommendations(response.data.recommendations);

    } catch (err) {
      console.log(err.response?.data || err.message);
      setError(
        err.response?.data?.message || "Could not fetch recommendations"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-3xl font-bold mb-2">AI Job Matches ✨</h1>
        <p className="text-gray-600 mb-6">
          Ranked using your saved resume from the Resume Builder.
        </p>

        <button
          type="button"
          onClick={findMatches}
          disabled={loading}
          className="bg-black text-white px-6 py-3 rounded-lg mb-6"
        >
          {loading ? "Analyzing jobs..." : "✨ Find My Best Matches"}
        </button>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm mb-6">
            {error}{" "}
            {error.includes("Resume Builder") && (
              <Link to="/resume-builder" className="underline font-semibold">
                Go to Resume Builder
              </Link>
            )}
          </div>
        )}

        {recommendations && recommendations.length === 0 && (
          <p className="text-gray-600">
            No strong matches found in the current job listings.
          </p>
        )}

        <div className="space-y-4">
          {recommendations?.map((rec) => (
            <div
              key={rec.job._id}
              className="bg-white p-6 rounded-2xl shadow-md flex justify-between items-start gap-4"
            >
              <div>
                <h2 className="text-xl font-semibold">{rec.job.title}</h2>
                <p className="text-gray-600">{rec.job.company}</p>
                <p className="text-sm text-gray-500 mt-2">📍 {rec.job.location}</p>
                <p className="text-sm text-gray-700 mt-2 italic">{rec.reason}</p>

                <Link to={`/jobs/${rec.job._id}`}>
                  <button
                    type="button"
                    className="mt-4 bg-black text-white px-4 py-2 rounded-lg text-sm"
                  >
                    View Job
                  </button>
                </Link>
              </div>

              <div className="text-right shrink-0">
                <p className="text-3xl font-bold">{rec.score}</p>
                <p className="text-xs text-gray-500">match score</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default RecommendedJobs;
