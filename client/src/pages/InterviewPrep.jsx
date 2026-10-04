import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { API_BASE, errorMessage } from "../config";


// One question with an answer box and AI feedback (mock interview)
function QuestionCard({ question, jobId }) {

  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const evaluate = async () => {

    try {

      setLoading(true);
      setError("");

      const response = await axios.post(`${API_BASE}/api/ai/evaluate-answer`, {
        question,
        answer,
        jobId,
      });

      setResult(response.data);

    } catch (err) {

      setError(errorMessage(err, "Could not get feedback"));

    } finally {

      setLoading(false);

    }
  };

  const scoreColor =
    result?.score >= 8 ? "text-green-600" : result?.score >= 5 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="border rounded-xl p-4">

      <p className="font-medium">{question}</p>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        maxLength={3000}
        placeholder="Type your answer here to practise..."
        className="w-full mt-3 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black"
      />

      <button
        type="button"
        onClick={evaluate}
        disabled={loading || answer.trim().length < 10}
        className="mt-2 border border-black px-4 py-2 rounded-lg text-sm disabled:opacity-40"
      >
        {loading ? "Evaluating..." : "✨ Get AI feedback"}
      </button>

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

      {result && (
        <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-3 text-sm">

          <p>
            <span className={`text-2xl font-bold ${scoreColor}`}>{result.score}/10</span>{" "}
            <span className="text-gray-700">{result.feedback}</span>
          </p>

          {result.strengths.length > 0 && (
            <div>
              <p className="font-semibold text-green-700">What worked</p>
              <ul className="list-disc ml-5">
                {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {result.improvements.length > 0 && (
            <div>
              <p className="font-semibold text-red-700">Improve</p>
              <ul className="list-disc ml-5">
                {result.improvements.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {result.betterAnswer && (
            <div>
              <p className="font-semibold">A stronger answer</p>
              <p className="text-gray-700 whitespace-pre-line">{result.betterAnswer}</p>
            </div>
          )}

        </div>
      )}

    </div>
  );
}


function InterviewPrep() {

  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const [prep, setPrep] = useState(null);
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

      const response = await axios.post(`${API_BASE}/api/ai/interview-questions`, { jobId: id });

      setPrep(response.data);

    } catch (err) {

      setError(errorMessage(err, "Could not generate interview prep"));

    } finally {

      setGenerating(false);

    }
  };

  if (loading) {
    return <h1 className="text-center mt-10 text-2xl">Loading...</h1>;
  }

  if (!job) {
    return <h1 className="text-center mt-10 text-2xl">Job not found</h1>;
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
          className="bg-black text-white px-6 py-3 rounded-lg disabled:opacity-50"
        >
          {generating
            ? "Preparing..."
            : prep
            ? "✨ Regenerate"
            : "✨ Generate Interview Questions"}
        </button>

        {error && <p className="text-red-600">{error}</p>}

        {prep && (
          <div className="space-y-8">

            <p className="text-sm text-gray-500">
              Tip: write your answer under any question and get instant AI feedback.
            </p>

            <div>
              <h2 className="text-xl font-bold mb-3">Technical Questions</h2>
              <div className="space-y-4">
                {prep.technical?.map((q) => (
                  <QuestionCard key={q} question={q} jobId={id} />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Behavioral Questions</h2>
              <div className="space-y-4">
                {prep.behavioral?.map((q) => (
                  <QuestionCard key={q} question={q} jobId={id} />
                ))}
              </div>
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
