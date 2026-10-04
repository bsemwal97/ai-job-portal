import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API_BASE, errorMessage } from "../config";
import SaveButton from "../components/SaveButton";

function SavedJobs() {

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {

    axios
      .get(`${API_BASE}/api/saved`)
      .then((res) => setJobs(res.data.jobs))
      .catch((err) => setError(errorMessage(err, "Could not load saved jobs")))
      .finally(() => setLoading(false));

  }, []);

  if (loading) {
    return <h1 className="text-center mt-10 text-2xl">Loading saved jobs...</h1>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      <div className="max-w-4xl mx-auto">

        <h1 className="text-4xl font-bold mb-8">Saved Jobs</h1>

        {error && (
          <div className="bg-red-100 text-red-600 px-4 py-3 rounded-lg mb-6">{error}</div>
        )}

        {!error && jobs.length === 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-md text-center">
            <p className="text-gray-600 mb-4">No saved jobs yet. Tap the heart on any job to keep it here.</p>
            <Link to="/jobs">
              <button type="button" className="bg-black text-white px-6 py-3 rounded-lg">Browse Jobs</button>
            </Link>
          </div>
        )}

        <div className="space-y-4">

          {jobs.map((job) => (

            <div
              key={job._id}
              className="bg-white p-6 rounded-2xl shadow-md flex flex-wrap justify-between items-center gap-4"
            >

              <div>
                <h3 className="text-xl font-semibold">
                  {job.title}{" "}
                  {job.status === "Closed" && (
                    <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full align-middle">Closed</span>
                  )}
                </h3>
                <p className="text-gray-600">{job.company} · {job.location}</p>
                <p className="text-sm text-gray-500">{job.jobType} · {job.salary}</p>
              </div>

              <div className="flex items-center gap-4">

                <Link to={`/jobs/${job._id}`}>
                  <button type="button" className="bg-black text-white px-4 py-2 rounded-lg">
                    View Job
                  </button>
                </Link>

                <SaveButton
                  jobId={job._id}
                  saved
                  onChange={() => setJobs((prev) => prev.filter((j) => j._id !== job._id))}
                />

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}

export default SavedJobs;
