import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function CreateJob() {

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [jobType, setJobType] = useState("Full-Time");
  const [skills, setSkills] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [applicationLink, setApplicationLink] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const navigate = useNavigate();

  const handleGenerateDescription = async () => {

    if (!title) {
      alert("Add a job title first");
      return;
    }

    try {

      setGenerating(true);

      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:5000/api/ai/generate-job-description",
        {
          title,
          company,
          jobType,
          location,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        },
        {
          headers: {
            authorization: token,
          },
        }
      );

      setDescription(response.data.description);

    } catch (error) {

      console.log(
        error.response?.data || error.message
      );

      alert("Could not generate description");

    } finally {

      setGenerating(false);

    }
  };

  const handleCreateJob = async (e) => {

    e.preventDefault();

    try {

      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:5000/api/jobs",
        {
          title,
          company,
          location,
          salary,
          jobType,
          skills: skills.split(","),
          companyLogo,
          applicationLink,
          description,
        },
        {
          headers: {
            authorization: token,
          },
        }
      );

      console.log(response.data);

      alert("Job created successfully");

      navigate("/jobs");

    } catch (error) {

      console.log(
        error.response?.data || error.message
      );

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">

      <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-lg">

        <h1 className="text-3xl font-bold mb-8">
          Create Job
        </h1>

        <form
          onSubmit={handleCreateJob}
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
            <option>Full-Time</option>
            <option>Part-Time</option>
            <option>Internship</option>
            <option>Remote</option>
          </select>

          <input
            type="text"
            placeholder="Skills (React, Node, MongoDB)"
            value={skills}
            onChange={(e) =>
              setSkills(e.target.value)
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          <input
            type="text"
            placeholder="Company Logo URL"
            value={companyLogo}
            onChange={(e) =>
              setCompanyLogo(e.target.value)
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          <input
            type="text"
            placeholder="Application Link"
            value={applicationLink}
            onChange={(e) =>
              setApplicationLink(e.target.value)
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-gray-600">
              Job Description
            </label>

            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={generating}
              className="text-sm border border-black px-3 py-1 rounded-lg"
            >
              {generating ? "Generating..." : "✨ Generate with AI"}
            </button>
          </div>

          <textarea
            placeholder="Job Description"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-3 h-40"
          />

          <button
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg"
          >
            {loading
              ? "Creating..."
              : "Create Job"}
          </button>

        </form>

      </div>

    </div>
  );
}

export default CreateJob;