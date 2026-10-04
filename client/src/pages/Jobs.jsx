import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API_BASE, getUser, errorMessage } from "../config";
import SaveButton from "../components/SaveButton";

const PAGE_SIZE = 12;

const JOB_TYPES = ["Full-Time", "Part-Time", "Internship", "Remote"];

function Jobs() {

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [savedIds, setSavedIds] = useState(new Set());

  const [deleteId, setDeleteId] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef(null);

  const user = getUser();


  // Fetch with filters; debounced so we don't hit the API on every keystroke
  useEffect(() => {

    const handle = setTimeout(async () => {

      try {

        setLoading(true);
        setError("");

        const response = await axios.get(`${API_BASE}/api/jobs`, {
          params: {
            q: search || undefined,
            location: location || undefined,
            jobType: jobType || undefined,
            page,
            limit: PAGE_SIZE,
          },
        });

        setJobs(response.data.jobs);
        setPages(response.data.pages || 1);

      } catch (err) {

        setError(errorMessage(err, "Could not load jobs"));

      } finally {

        setLoading(false);

      }

    }, 300);

    return () => clearTimeout(handle);

  }, [search, location, jobType, page]);


  // Candidates: load which jobs are already saved (one request for the whole list)
  useEffect(() => {

    if (user?.role !== "Candidate") return;

    axios
      .get(`${API_BASE}/api/saved/ids`)
      .then((res) => setSavedIds(new Set(res.data.ids)))
      .catch(() => {});

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const setSaved = (jobId, isSaved) =>
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.add(jobId); else next.delete(jobId);
      return next;
    });


  // Any filter change goes back to page 1
  const changeFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };


  // Stop any running delete countdown if the page is left
  useEffect(() => () => clearInterval(timerRef.current), []);


  const deleteJob = async (id) => {

    try {

      await axios.delete(`${API_BASE}/api/jobs/${id}`);

      setJobs((prev) => prev.filter((job) => job._id !== id));

    } catch (err) {

      setError(errorMessage(err, "Could not delete job"));

    } finally {

      setDeleteId(null);

    }
  };


  const startDelete = (id) => {

    clearInterval(timerRef.current);

    setDeleteId(id);
    setCountdown(5);

    let remaining = 5;

    timerRef.current = setInterval(() => {

      remaining -= 1;
      setCountdown(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        deleteJob(id);
      }

    }, 1000);
  };


  // Fixes the old bug where "Cancel" hid the button but the job was still deleted
  const cancelDelete = () => {
    clearInterval(timerRef.current);
    setDeleteId(null);
  };


  const isOwner = (job) =>
    user?.role === "Recruiter" && job.createdBy?._id === user.id;


  return (
    <div className="min-h-screen bg-gray-100 p-6">

      <div className="max-w-6xl mx-auto">

        <h1 className="text-4xl font-bold mb-2">
          Find Your Next Job
        </h1>

        <p className="text-gray-600 mb-6">
          Search by title, company or skill
        </p>


        {/* Filters */}

        <div className="grid md:grid-cols-3 gap-3 mb-8">

          <input
            type="text"
            placeholder="Title, company or skill"
            value={search}
            onChange={changeFilter(setSearch)}
            className="border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-black"
          />

          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={changeFilter(setLocation)}
            className="border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-black"
          />

          <select
            value={jobType}
            onChange={changeFilter(setJobType)}
            className="border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">All job types</option>
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

        </div>


        {error && (
          <div className="bg-red-100 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading && (
          <p className="text-center text-gray-500 py-10">Loading jobs...</p>
        )}

        {!loading && !error && jobs.length === 0 && (
          <p className="text-center text-gray-500 py-10">
            No jobs match your search.
          </p>
        )}


        <div className="grid md:grid-cols-2 gap-6">

          {jobs.map((job) => (

            <div
              key={job._id}
              className="bg-white p-6 rounded-2xl shadow-md"
            >

              <div className="flex justify-between items-start gap-3">

                <h3 className="text-2xl font-semibold">{job.title}</h3>

                {user?.role === "Candidate" && (
                  <SaveButton
                    jobId={job._id}
                    saved={savedIds.has(job._id)}
                    onChange={(v) => setSaved(job._id, v)}
                  />
                )}

              </div>

              <p className="text-gray-600 mt-1">{job.company}</p>

              <p className="text-sm text-gray-500 mt-2">📍 {job.location}</p>

              <p className="text-sm text-gray-500">💼 {job.jobType}</p>

              <p className="text-sm text-gray-500">💰 {job.salary}</p>

              {job.skills?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {job.skills.slice(0, 5).map((skill) => (
                    <span
                      key={skill}
                      className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}


              <Link to={`/jobs/${job._id}`}>
                <button
                  type="button"
                  className="mt-5 bg-black text-white px-4 py-2 rounded-lg w-full"
                >
                  View Details
                </button>
              </Link>


              {/* Only the recruiter who posted the job sees these */}

              {isOwner(job) && (
                <>
                  <Link to={`/edit-job/${job._id}`}>
                    <button
                      type="button"
                      className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg w-full"
                    >
                      Edit Job
                    </button>
                  </Link>

                  {deleteId === job._id ? (

                    <div className="mt-3">

                      <button
                        type="button"
                        className="bg-red-500 text-white px-4 py-2 rounded-lg w-full"
                      >
                        Deleting in {countdown}s...
                      </button>

                      <button
                        type="button"
                        onClick={cancelDelete}
                        className="mt-2 bg-gray-300 px-4 py-2 rounded-lg w-full"
                      >
                        Cancel Delete
                      </button>

                    </div>

                  ) : (

                    <button
                      type="button"
                      onClick={() => startDelete(job._id)}
                      className="mt-3 bg-red-500 text-white px-4 py-2 rounded-lg w-full"
                    >
                      Delete Job
                    </button>

                  )}
                </>
              )}

            </div>

          ))}

        </div>


        {pages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-10">

            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border border-black px-4 py-2 rounded-lg disabled:opacity-30"
            >
              ← Previous
            </button>

            <span className="text-gray-600">Page {page} of {pages}</span>

            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="border border-black px-4 py-2 rounded-lg disabled:opacity-30"
            >
              Next →
            </button>

          </div>
        )}

      </div>

    </div>
  );
}

export default Jobs;
