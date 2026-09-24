import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const API_BASE = "http://localhost:5000";

function authHeaders() {
  return {
    authorization: localStorage.getItem("token"),
  };
}

function InterviewPrep() {
  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const [prep, setPrep] = useState(null);
  const [generating, setGenerating] = useState(false);

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

      const response = await axios.post(
        `${API_BASE}/api/ai/interview-questions`,
        { jobId: id },
        { headers: authHeaders() }
      );

      setPrep(response.data);

    } catch (err) {
      console.log(err.response?.data || err.message);
      alert("Could not generate interview prep");
    } finally {
      setGenerating(false);
    }
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

        <h1 className="text-3xl font-bold">Interview Prep ✨</h1>
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
            ? "Preparing..."
            : prep
            ? "✨ Regenerate"
            : "✨ Generate Interview Questions"}
        </button>

        {prep && (
          <div className="space-y-6">

            <div>
              <h2 className="text-xl font-bold mb-2">Technical Questions</h2>
              <ul className="list-disc list-inside space-y-1">
                {prep.technical?.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2">Behavioral Questions</h2>
              <ul className="list-disc list-inside space-y-1">
                {prep.behavioral?.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2">Prep Tips</h2>
              <ul className="list-disc list-inside space-y-1">
                {prep.tips?.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default InterviewPrep;
