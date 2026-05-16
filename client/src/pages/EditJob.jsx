import { useEffect, useState } from "react";
import axios from "axios";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

function EditJob() {

  const { id } = useParams();

  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [jobType, setJobType] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const fetchJob = async () => {

      try {

        const response = await axios.get(
          `http://localhost:5000/api/jobs/${id}`
        );

        const job = response.data.job;

        setTitle(job.title);
        setCompany(job.company);
        setLocation(job.location);
        setSalary(job.salary);
        setJobType(job.jobType);
        setDescription(job.description);

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


  const handleUpdate = async (e) => {

    e.preventDefault();

    try {

      const token = localStorage.getItem("token");

      await axios.put(
        `http://localhost:5000/api/jobs/${id}`,
        {
          title,
          company,
          location,
          salary,
          jobType,
          description,
        },
        {
          headers: {
            authorization: token,
          },
        }
      );

      navigate("/dashboard");

    } catch (error) {

      console.log(
        error.response?.data || error.message
      );

    }
  };


  if (loading) {

    return (
      <h1 className="text-center mt-10 text-2xl">
        Loading Job...
      </h1>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">

      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-2xl">

        <h1 className="text-3xl font-bold mb-6">
          Edit Job
        </h1>

        <form
          onSubmit={handleUpdate}
          className="space-y-5"
        >

          <input
            type="text"
            placeholder="Job Title"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          <input
            type="text"
            placeholder="Company"
            value={company}
            onChange={(e) =>
              setCompany(e.target.value)
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) =>
              setLocation(e.target.value)
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          <input
            type="text"
            placeholder="Salary"
            value={salary}
            onChange={(e) =>
              setSalary(e.target.value)
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          <select
            value={jobType}
            onChange={(e) =>
              setJobType(e.target.value)
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          >

            <option value="">
              Select Job Type
            </option>

            <option value="Full-Time">
              Full-Time
            </option>

            <option value="Part-Time">
              Part-Time
            </option>

            <option value="Internship">
              Internship
            </option>

            <option value="Remote">
              Remote
            </option>

          </select>

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-3 h-40"
          />

          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-lg"
          >
            Update Job
          </button>

        </form>

      </div>

    </div>
  );
}

export default EditJob;