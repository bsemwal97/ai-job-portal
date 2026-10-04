import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API_BASE, getUser, errorMessage } from "../config";

// Recruiter dashboard — shows only the jobs this recruiter posted
function Dashboard() {

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = getUser();

  useEffect(() => {

    const fetchJobs = async () => {

      try {

        const response = await axios.get(`${API_BASE}/api/jobs/mine`);

        setJobs(response.data.jobs);

      } catch (err) {

        setError(errorMessage(err, "Could not load your jobs"));

      } finally {

        setLoading(false);

      }
    };

    fetchJobs();

  }, []);


  const handleDelete = async (job) => {

    if (!window.confirm(`Delete "${job.title}" and all its applications?`)) return;

    try {

      await axios.delete(`${API_BASE}/api/jobs/${job._id}`);

      setJobs((prev) => prev.filter((j) => j._id !== job._id));

    } catch (err) {

      setError(errorMessage(err, "Could not delete job"));

    }
  };


  if (loading) {
    return (
      <h1 className="text-center mt-10 text-2xl">
        Loading Dashboard...
      </h1>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      <div className="max-w-6xl mx-auto">

        <h1 className="text-4xl font-bold mb-2">
          Welcome {user?.name} 👋
        </h1>

        <p className="text-gray-600 mb-8">
          Manage your jobs and review applicants
        </p>


        <div className="grid md:grid-cols-3 gap-6 mb-10">

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold">My Jobs</h2>
            <p className="text-4xl font-bold mt-4">{jobs.length}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold">Quick Action</h2>
            <Link to="/create-job">
              <button
                type="button"
                className="mt-4 bg-black text-white px-5 py-2 rounded-lg"
              >
                Create Job
              </button>
            </Link>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold">Browse Jobs</h2>
            <Link to="/jobs">
              <button
                type="button"
                className="mt-4 bg-black text-white px-5 py-2 rounded-lg"
              >
                View Jobs
              </button>
            </Link>
          </div>

        </div>


        <h2 className="text-3xl font-bold mb-6">My Posted Jobs</h2>

        {error && (
          <div className="bg-red-100 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {jobs.length === 0 && !error && (
          <p className="text-gray-500">
            You haven't posted any jobs yet. Create your first one!
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-6">

          {jobs.map((job) => (

            <div
              key={job._id}
              className="bg-white p-6 rounded-2xl shadow-md"
            >

              <h3 className="text-2xl font-semibold">{job.title}</h3>

              <p className="text-gray-600 mt-1">{job.company}</p>

              <p className="text-sm text-gray-500 mt-2">📍 {job.location}</p>

              <p className="text-sm text-gray-500">💰 {job.salary}</p>

              <Link to={`/jobs/${job._id}/applicants`}>
                <button
                  type="button"
                  className="mt-5 bg-black text-white px-4 py-2 rounded-lg w-full"
                >
                  ✨ View Applicants ({job.applicantCount ?? 0})
                </button>
              </Link>

              <div className="grid grid-cols-3 gap-2 mt-3">

                <Link to={`/jobs/${job._id}`}>
                  <button
                    type="button"
                    className="border border-black px-3 py-2 rounded-lg w-full"
                  >
                    View
                  </button>
                </Link>

                <Link to={`/edit-job/${job._id}`}>
                  <button
                    type="button"
                    className="bg-blue-500 text-white px-3 py-2 rounded-lg w-full"
                  >
                    Edit
                  </button>
                </Link>

                <button
                  type="button"
                  onClick={() => handleDelete(job)}
                  className="bg-red-500 text-white px-3 py-2 rounded-lg w-full"
                >
                  Delete
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}

export default Dashboard;
