import { useState } from "react";
import axios from "axios";
import { API_BASE, errorMessage } from "../config";

// Recruiter tool: AI reviews a job post for clarity, missing info and biased wording
function JobPostChecker({ title, description, salary, skills }) {

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const check = async () => {

    try {

      setLoading(true);
      setError("");

      const response = await axios.post(`${API_BASE}/api/ai/check-job-post`, {
        title,
        description,
        salary,
        skills,
      });

      setResult(response.data);

    } catch (err) {

      setError(errorMessage(err, "Could not check the job post"));

    } finally {

      setLoading(false);

    }
  };

  const color =
    result?.score >= 75 ? "text-green-600" : result?.score >= 50 ? "text-yellow-600" : "text-red-600";

  return (
    <div>

      <button
        type="button"
        onClick={check}
        disabled={loading || !title || !description}
        className="text-sm border border-black px-3 py-1 rounded-lg disabled:opacity-40"
      >
        {loading ? "Checking..." : "✨ Check post quality"}
      </button>

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

      {result && (
        <div className="mt-3 border rounded-lg p-4 bg-gray-50 text-sm space-y-3">

          <p>
            <span className={`text-3xl font-bold ${color}`}>{result.score}</span>
            <span className="text-gray-500"> / 100 post quality</span>
          </p>

          {result.issues.length > 0 && (
            <div>
              <p className="font-semibold text-red-700">Issues</p>
              <ul className="list-disc ml-5">{result.issues.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

          {result.biasedPhrases.length > 0 && (
            <div>
              <p className="font-semibold text-yellow-700">Wording that may put people off</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {result.biasedPhrases.map((x, i) => (
                  <span key={i} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">{x}</span>
                ))}
              </div>
            </div>
          )}

          {result.suggestions.length > 0 && (
            <div>
              <p className="font-semibold">Suggestions</p>
              <ul className="list-disc ml-5">{result.suggestions.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

export default JobPostChecker;
