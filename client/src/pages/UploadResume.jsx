import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API_BASE, errorMessage } from "../config";

const MAX_MB = 5;
const ALLOWED = [".pdf", ".doc", ".docx"];

function UploadResume() {

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [current, setCurrent] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [aiMessage, setAiMessage] = useState(null);


  // Show the resume that is already on file
  useEffect(() => {

    axios
      .get(`${API_BASE}/api/auth/me`)
      .then((res) => setCurrent(res.data.resumeFile?.originalName || ""))
      .catch(() => {});

  }, []);


  const handleChange = (e) => {

    const picked = e.target.files[0];

    setMessage(null);

    if (!picked) return setFile(null);

    const ext = picked.name.slice(picked.name.lastIndexOf(".")).toLowerCase();

    if (!ALLOWED.includes(ext)) {
      setFile(null);
      return setMessage({ ok: false, text: "Only PDF, DOC or DOCX files are allowed" });
    }

    if (picked.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      return setMessage({ ok: false, text: `File is too large (max ${MAX_MB} MB)` });
    }

    setFile(picked);
  };


  const handleUpload = async (e) => {

    e.preventDefault();

    if (!file) {
      return setMessage({ ok: false, text: "Choose a file first" });
    }

    try {

      setUploading(true);
      setMessage(null);

      const formData = new FormData();
      formData.append("resume", file);

      await axios.post(`${API_BASE}/api/upload/resume`, formData);

      setCurrent(file.name);
      setFile(null);
      e.target.reset();

      setMessage({ ok: true, text: "Resume uploaded! Recruiters can download it when you apply." });

    } catch (err) {

      setMessage({ ok: false, text: errorMessage(err, "Upload failed") });

    } finally {

      setUploading(false);

    }
  };


  const handleDeleteFile = async () => {

    if (!window.confirm("Delete your uploaded resume file?")) return;

    try {

      await axios.delete(`${API_BASE}/api/upload/resume`);

      setCurrent("");
      setAnalysis(null);
      setAiMessage(null);
      setMessage({ ok: true, text: "Resume file deleted" });

    } catch (err) {

      setMessage({ ok: false, text: errorMessage(err, "Could not delete file") });

    }
  };


  const handleAnalyze = async () => {

    try {

      setAnalyzing(true);
      setAiMessage(null);

      const response = await axios.post(`${API_BASE}/api/ai/analyze-uploaded-resume`);

      setAnalysis(response.data);

    } catch (err) {

      setAiMessage({ ok: false, text: errorMessage(err, "Could not analyze resume") });

    } finally {

      setAnalyzing(false);

    }
  };


  const handleImport = async () => {

    try {

      setImporting(true);
      setAiMessage(null);

      const response = await axios.post(`${API_BASE}/api/ai/import-resume`);

      const filled = response.data.filled;

      setAiMessage({
        ok: true,
        text: filled.length
          ? `Imported into Resume Builder: ${filled.join(", ")}. Existing sections were left untouched.`
          : "Nothing to import — your Resume Builder already has all these sections filled.",
      });

    } catch (err) {

      setAiMessage({ ok: false, text: errorMessage(err, "Could not import resume") });

    } finally {

      setImporting(false);

    }
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-6 py-10 gap-6">

      <form
        onSubmit={handleUpload}
        className="bg-white p-8 rounded-2xl shadow-lg space-y-5 w-full max-w-md"
      >

        <h1 className="text-3xl font-bold">Upload Resume 📄</h1>

        {current && (
          <p className="text-sm text-gray-600">
            Current file: <span className="font-medium">{current}</span>{" "}
            <button type="button" onClick={handleDeleteFile} className="text-red-600 underline ml-2">
              Delete
            </button>
          </p>
        )}

        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleChange}
          className="w-full"
        />

        <p className="text-xs text-gray-500">
          PDF, DOC or DOCX · up to {MAX_MB} MB. Uploading again replaces your current file.
        </p>

        {message && (
          <p className={message.ok ? "text-green-600" : "text-red-600"}>{message.text}</p>
        )}

        <button
          disabled={uploading || !file}
          className="bg-black text-white px-6 py-3 rounded-lg w-full disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

      </form>


      {/* AI tools work on the file that is already uploaded */}

      {current && (
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md space-y-4">

          <h2 className="text-xl font-bold">AI tools ✨</h2>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="border border-black px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {analyzing ? "Analyzing..." : "Analyze my resume"}
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="border border-black px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import into Resume Builder"}
            </button>

          </div>

          {aiMessage && (
            <p className={aiMessage.ok ? "text-green-600" : "text-red-600"}>
              {aiMessage.text}{" "}
              {aiMessage.ok && <Link to="/resume-builder" className="underline">Open Resume Builder</Link>}
            </p>
          )}

          {analysis && (
            <div className="space-y-4 text-sm">

              <p>
                <span className="text-4xl font-bold">{analysis.score}</span>
                <span className="text-gray-500"> / 100 resume score</span>
              </p>

              {[
                ["Strengths", analysis.strengths, "text-green-700"],
                ["Weaknesses", analysis.weaknesses, "text-red-700"],
                ["Suggestions", analysis.suggestions, "text-gray-900"],
                ["ATS tips", analysis.atsTips, "text-blue-700"],
              ].map(([title, items, color]) =>
                items.length > 0 && (
                  <div key={title}>
                    <p className={`font-semibold ${color}`}>{title}</p>
                    <ul className="list-disc ml-5 text-gray-700">
                      {items.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}

export default UploadResume;
