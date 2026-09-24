import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";

const API_BASE = "http://localhost:5000";

function authHeaders() {
  return {
    authorization: localStorage.getItem("token"),
  };
}

function CoverLetter() {
  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const [coverLetter, setCoverLetter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/jobs/${id}`);
        setJob(response.data.job);
      } catch (err) {
        console.log(err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  const generate = async () => {
    try {
      setGenerating(true);
      setError("");

      const response = await axios.post(
        `${API_BASE}/api/ai/generate-cover-letter`,
        { jobId: id },
        { headers: authHeaders() }
      );

      setCoverLetter(response.data.coverLetter);

    } catch (err) {
      console.log(err.response?.data || err.message);
      setError(
        err.response?.data?.message ||
          "Could not generate cover letter"
      );
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(coverLetter);
    alert("Copied to clipboard");
  };

  if (loading) {
    return (
      <h1 className="text-center mt-10 text-2xl">Loading...</h1>
    );
  }

  if (!job) {
    return (
      <h1 className="text-center mt-10 text-2xl">Job not found</h1>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-3xl w-full space-y-5">

        <h1 className="text-3xl font-bold">Cover Letter ✨</h1>
        <p className="text-gray-600">
          For <span className="font-semibold">{job.title}</span> at{" "}
          <span className="font-semibold">{job.company}</span>
        </p>

        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="bg-black text-white px-6 py-3 rounded-lg"
        >
          {generating
            ? "Writing..."
            : coverLetter
            ? "✨ Regenerate"
            : "✨ Generate Cover Letter"}
        </button>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm">
            {error}{" "}
            {error.includes("Resume Builder") && (
              <Link to="/resume-builder" className="underline font-semibold">
                Go to Resume Builder
              </Link>
            )}
          </div>
        )}

        {coverLetter && (
          <div className="space-y-3">
            <textarea
              className="w-full border border-gray-300 rounded-lg px-4 py-3 h-80"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />

            <button
              type="button"
              onClick={copyToClipboard}
              className="border border-black px-6 py-3 rounded-lg"
            >
              Copy to Clipboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default CoverLetter;
