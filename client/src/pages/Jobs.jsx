import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function Dashboard() {

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deleteId, setDeleteId] = useState(null);
  const [countdown, setCountdown] = useState(5);

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  useEffect(() => {

    const fetchJobs = async () => {

      try {

        const response = await axios.get(
          "http://localhost:5000/api/jobs"
        );

        setJobs(response.data.jobs);

      } catch (error) {

        console.log(
          error.response?.data || error.message
        );

      } finally {

        setLoading(false);

      }
    };

    fetchJobs();

  }, []);


  const handleDelete = (id) => {

    setDeleteId(id);
    setCountdown(5);

    const timer = setInterval(() => {

      setCountdown((prev) => {

        if (prev === 1) {

          clearInterval(timer);

          deleteJob(id);

          return 0;
        }

        return prev - 1;

      });

    }, 1000);
  };


  const deleteJob = async (id) => {

    try {

      const token = localStorage.getItem("token");

      await axios.delete(
        `http://localhost:5000/api/jobs/${id}`,
        {
          headers: {
            authorization: token,
          },
        }
      );

      setJobs(
        jobs.filter((job) => job._id !== id)
      );

      setDeleteId(null);

    } catch (error) {

      console.log(
        error.response?.data || error.message
      );

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
          Manage your jobs and applications
        </p>


        <div className="grid md:grid-cols-3 gap-6 mb-10">

          <div className="bg-white p-6 rounded-2xl shadow-md">

            <h2 className="text-xl font-semibold">
              Total Jobs
            </h2>

            <p className="text-4xl font-bold mt-4">
              {jobs.length}
            </p>

          </div>


          <div className="bg-white p-6 rounded-2xl shadow-md">

            <h2 className="text-xl font-semibold">
              Quick Action
            </h2>

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

            <h2 className="text-xl font-semibold">
              Browse Jobs
            </h2>

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


        <h2 className="text-3xl font-bold mb-6">
          Recent Jobs
        </h2>


        <div className="grid md:grid-cols-2 gap-6">

          {jobs.map((job) => (

            <div
              key={job._id}
              className="bg-white p-6 rounded-2xl shadow-md"
            >

              <h3 className="text-2xl font-semibold">
                {job.title}
              </h3>

              <p className="text-gray-600 mt-1">
                {job.company}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                📍 {job.location}
              </p>

              <p className="text-sm text-gray-500">
                💰 {job.salary}
              </p>


              <Link to={`/jobs/${job._id}`}>

                <button
                  type="button"
                  className="mt-5 bg-black text-white px-4 py-2 rounded-lg w-full"
                >
                  View Details
                </button>

              </Link>


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
                    onClick={() =>
                      setDeleteId(null)
                    }
                    className="mt-2 bg-gray-300 px-4 py-2 rounded-lg w-full"
                  >
                    Cancel Delete
                  </button>

                </div>

              ) : (

                <button
                  type="button"
                  onClick={() =>
                    handleDelete(job._id)
                  }
                  className="mt-3 bg-red-500 text-white px-4 py-2 rounded-lg w-full"
                >
                  Delete Job
                </button>

              )}

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}

export default Dashboard;