import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";

function JobDetails() {

  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const fetchJob = async () => {

      try {

        const response = await axios.get(
          `http://localhost:5000/api/jobs/${id}`
        );

        setJob(response.data.job);

      } catch (error) {

        console.log(
          error.response?.data || error.message
        );

      } finally {

        setLoading(false);

      }
    };

    fetchJob();

  }, [id]);


  const handleApply = async () => {

    try {

      const token = localStorage.getItem("token");

      const response = await axios.post(
        `http://localhost:5000/api/applications/${id}`,
        {},
        {
          headers: {
            authorization: token,
          },
        }
      );

      alert("Applied Successfully");

      console.log(response.data);

    } catch (error) {

      console.log(
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
        "Application failed"
      );

    }
  };


  if (loading) {

    return (
      <h1 className="text-center mt-10 text-2xl">
        Loading job...
      </h1>
    );
  }


  if (!job) {

    return (
      <h1 className="text-center mt-10 text-2xl">
        Job not found
      </h1>
    );
  }


  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center">

      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-3xl w-full">

        {job.companyLogo && (

          <img
            src={job.companyLogo}
            alt="logo"
            className="w-24 h-24 rounded-full mb-6"
          />

        )}


        <h1 className="text-4xl font-bold">
          {job.title}
        </h1>

        <p className="text-xl text-gray-600 mt-2">
          {job.company}
        </p>


        <div className="mt-4 space-y-2">

          <p>📍 {job.location}</p>

          <p>💼 {job.jobType}</p>

          <p>💰 {job.salary}</p>

        </div>


        <div className="flex flex-wrap gap-2 mt-6">

          {job.skills?.map((skill, index) => (

            <span
              key={index}
              className="bg-black text-white px-3 py-1 rounded-full text-sm"
            >
              {skill}
            </span>

          ))}

        </div>


        <div className="mt-8">

          <h2 className="text-2xl font-semibold mb-3">
            Job Description
          </h2>

          <p className="text-gray-700 leading-7">
            {job.description}
          </p>

        </div>


        <div className="mt-8 flex flex-wrap gap-3">

          <button
            type="button"
            onClick={handleApply}
            className="bg-black text-white px-6 py-3 rounded-lg"
          >
            Apply Now
          </button>

          <Link to={`/jobs/${id}/cover-letter`}>
            <button
              type="button"
              className="border border-black px-6 py-3 rounded-lg"
            >
              ✨ Generate Cover Letter
            </button>
          </Link>

          <Link to={`/jobs/${id}/interview-prep`}>
            <button
              type="button"
              className="border border-black px-6 py-3 rounded-lg"
            >
              ✨ Interview Prep
            </button>
          </Link>

        </div>

      </div>

    </div>
  );
}

export default JobDetails;