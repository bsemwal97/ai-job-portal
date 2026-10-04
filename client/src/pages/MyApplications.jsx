import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API_BASE, errorMessage } from "../config";
import { STATUS_STYLES } from "../statusStyles";

function MyApplications() {

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {

    const fetchApplications = async () => {

      try {

        const response = await axios.get(`${API_BASE}/api/applications/my-applications`);

        setApplications(response.data);

      } catch (err) {

        setError(errorMessage(err, "Could not load your applications"));

      } finally {

        setLoading(false);

      }
    };

    fetchApplications();

  }, []);

  const withdraw = async (app) => {

    if (!window.confirm(`Withdraw your application for "${app.job.title}"?`)) return;

    try {

      await axios.delete(`${API_BASE}/api/applications/${app._id}`);

      setApplications((prev) => prev.filter((a) => a._id !== app._id));

    } catch (err) {

      setError(errorMessage(err, "Could not withdraw application"));

    }
  };


  if (loading) {
    return <h1 className="text-center mt-10 text-2xl">Loading applications...</h1>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      <div className="max-w-4xl mx-auto">

        <h1 className="text-4xl font-bold mb-2">My Applications</h1>

        <p className="text-gray-600 mb-8">
          Track every job you've applied to
        </p>

        {error && (
          <div className="bg-red-100 text-red-600 px-4 py-3 rounded-lg mb-6">{error}</div>
        )}

        {!error && applications.length === 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-md text-center">
            <p className="text-gray-600 mb-4">You haven't applied to any jobs yet.</p>
            <Link to="/jobs">
              <button type="button" className="bg-black text-white px-6 py-3 rounded-lg">
                Browse Jobs
              </button>
            </Link>
          </div>
        )}

        <div className="space-y-4">

          {applications.map((app) => (

            <div
              key={app._id}
              className="bg-white p-6 rounded-2xl shadow-md flex flex-wrap justify-between items-center gap-4"
            >

              <div>
                <h3 className="text-xl font-semibold">{app.job.title}</h3>
                <p className="text-gray-600">{app.job.company} · {app.job.location}</p>
                <p className="text-sm text-gray-400 mt-1">
                  Applied on {new Date(app.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[app.status] || STATUS_STYLES.Applied}`}>
                  {app.status}
                </span>

                <Link to={`/jobs/${app.job._id}`}>
                  <button type="button" className="border border-black px-4 py-2 rounded-lg">
                    View Job
                  </button>
                </Link>

                {["Applied", "Shortlisted", "Interview"].includes(app.status) && (
                  <button
                    type="button"
                    onClick={() => withdraw(app)}
                    className="text-red-600 px-3 py-2 text-sm"
                  >
                    Withdraw
                  </button>
                )}
              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}

export default MyApplications;
