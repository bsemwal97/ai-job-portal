import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { API_BASE, getUser, errorMessage } from "../config";
import SaveButton from "../components/SaveButton";

function JobDetails() {

  const { id } = useParams();
  const user = getUser();
  const isCandidate = user?.role === "Candidate";

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const [applyMessage, setApplyMessage] = useState(null);
  const [applying, setApplying] = useState(false);

  const [match, setMatch] = useState(null);
  const [matchError, setMatchError] = useState("");
  const [matching, setMatching] = useState(false);

  const [saved, setSaved] = useState(false);

  const [roadmap, setRoadmap] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);


  useEffect(() => {

    const fetchJob = async () => {

      try {

        const response = await axios.get(`${API_BASE}/api/jobs/${id}`);

        setJob(response.data.job);

      } catch (error) {

        console.log(error.response?.data || error.message);

      } finally {

        setLoading(false);

      }
    };

    fetchJob();

  }, [id]);


  useEffect(() => {

    if (!isCandidate) return;

    axios
      .get(`${API_BASE}/api/saved/ids`)
      .then((res) => setSaved(res.data.ids.includes(id)))
      .catch(() => {});

  }, [id, isCandidate]);


  // AI: learning plan for the skills this job wants and the resume lacks
  const handleRoadmap = async () => {

    try {

      setRoadmapLoading(true);
      setMatchError("");

      const response = await axios.post(`${API_BASE}/api/ai/skill-roadmap/${id}`);

      setRoadmap(response.data.gaps);

    } catch (error) {

      setMatchError(errorMessage(error, "Could not build roadmap"));

    } finally {

      setRoadmapLoading(false);

    }
  };


  const handleApply = async () => {

    try {

      setApplying(true);
      setApplyMessage(null);

      await axios.post(`${API_BASE}/api/applications/${id}`);

      setApplyMessage({ ok: true, text: "Applied successfully! Track it in My Applications." });

    } catch (error) {

      setApplyMessage({ ok: false, text: errorMessage(error, "Application failed") });

    } finally {

      setApplying(false);

    }
  };


  // AI: how well does my saved resume fit this job?
  const handleMatch = async () => {

    try {

      setMatching(true);
      setMatchError("");

      const response = await axios.post(`${API_BASE}/api/ai/job-match/${id}`);

      setMatch(response.data);

    } catch (error) {

      setMatchError(errorMessage(error, "Could not check match"));

    } finally {

      setMatching(false);

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

  const isClosed = job.status === "Closed";

  const isOwner = user?.role === "Recruiter" && job.createdBy?._id === user.id;

  const scoreColor =
    match?.score >= 75 ? "text-green-600" : match?.score >= 50 ? "text-yellow-600" : "text-red-600";


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

        <div className="flex justify-between items-start gap-4">

          <h1 className="text-4xl font-bold">{job.title}</h1>

          {isCandidate && <SaveButton jobId={id} saved={saved} onChange={setSaved} className="mt-1" />}

        </div>

        <p className="text-xl text-gray-600 mt-2">{job.company}</p>

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
          <h2 className="text-2xl font-semibold mb-3">Job Description</h2>
          <p className="text-gray-700 leading-7 whitespace-pre-line">
            {job.description}
          </p>
        </div>


        {/* Actions depend on who is looking at the page */}

        <div className="mt-8 flex flex-wrap gap-3">

          {!user && (
            <Link to="/login">
              <button type="button" className="bg-black text-white px-6 py-3 rounded-lg">
                Login to Apply
              </button>
            </Link>
          )}

          {isCandidate && (
            <>
              <button
                type="button"
                onClick={handleApply}
                disabled={applying || isClosed}
                className="bg-black text-white px-6 py-3 rounded-lg disabled:opacity-50"
              >
                {isClosed ? "Applications closed" : applying ? "Applying..." : "Apply Now"}
              </button>

              <button
                type="button"
                onClick={handleMatch}
                disabled={matching}
                className="border border-black px-6 py-3 rounded-lg disabled:opacity-50"
              >
                {matching ? "Analyzing..." : "✨ Check My Match"}
              </button>

              <Link to={`/jobs/${id}/cover-letter`}>
                <button type="button" className="border border-black px-6 py-3 rounded-lg">
                  ✨ Generate Cover Letter
                </button>
              </Link>

              <Link to={`/jobs/${id}/interview-prep`}>
                <button type="button" className="border border-black px-6 py-3 rounded-lg">
                  ✨ Interview Prep
                </button>
              </Link>
            </>
          )}

          {isOwner && (
            <>
              <Link to={`/jobs/${id}/applicants`}>
                <button type="button" className="bg-black text-white px-6 py-3 rounded-lg">
                  ✨ View Applicants
                </button>
              </Link>

              <Link to={`/edit-job/${id}`}>
                <button type="button" className="border border-black px-6 py-3 rounded-lg">
                  Edit Job
                </button>
              </Link>
            </>
          )}

        </div>


        {applyMessage && (
          <p className={`mt-4 ${applyMessage.ok ? "text-green-600" : "text-red-600"}`}>
            {applyMessage.text}
          </p>
        )}

        {matchError && (
          <p className="mt-4 text-red-600">
            {matchError}{" "}
            {matchError.includes("Resume Builder") && (
              <Link to="/resume-builder" className="underline">Open Resume Builder</Link>
            )}
          </p>
        )}


        {/* AI match result */}

        {match && (
          <div className="mt-8 border rounded-2xl p-6 bg-gray-50">

            <div className="flex items-center gap-4">
              <p className={`text-5xl font-bold ${scoreColor}`}>{match.score}%</p>
              <p className="text-gray-600">match with your saved resume</p>
            </div>

            {match.matchedKeywords.length > 0 && (
              <div className="mt-5">
                <h3 className="font-semibold mb-2">You already have</h3>
                <div className="flex flex-wrap gap-2">
                  {match.matchedKeywords.map((k) => (
                    <span key={k} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">{k}</span>
                  ))}
                </div>
              </div>
            )}

            {match.missingKeywords.length > 0 && (
              <div className="mt-5">
                <h3 className="font-semibold mb-2">Missing from your resume</h3>
                <div className="flex flex-wrap gap-2">
                  {match.missingKeywords.map((k) => (
                    <span key={k} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">{k}</span>
                  ))}
                </div>
              </div>
            )}

            {match.suggestions.length > 0 && (
              <div className="mt-5">
                <h3 className="font-semibold mb-2">How to improve</h3>
                <ul className="list-disc ml-5 space-y-1 text-gray-700">
                  {match.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}


            <button
              type="button"
              onClick={handleRoadmap}
              disabled={roadmapLoading}
              className="mt-6 border border-black px-5 py-2 rounded-lg disabled:opacity-50"
            >
              {roadmapLoading ? "Building plan..." : "✨ Build my learning roadmap"}
            </button>

          </div>
        )}


        {roadmap && (
          <div className="mt-6 border rounded-2xl p-6 bg-gray-50">

            <h3 className="text-xl font-bold mb-4">Your learning roadmap</h3>

            {roadmap.length === 0 && (
              <p className="text-gray-600">No major skill gaps found — you're a strong fit. Go apply!</p>
            )}

            <div className="space-y-5">
              {roadmap.map((gap) => (
                <div key={gap.skill}>
                  <p className="font-semibold">
                    {gap.skill} <span className="text-gray-500 font-normal">· ~{gap.weeks} week{gap.weeks > 1 ? "s" : ""}</span>
                  </p>
                  <p className="text-sm text-gray-600">{gap.why}</p>
                  <ul className="list-disc ml-5 text-sm mt-1">
                    {gap.steps.map((st, i) => <li key={i}>{st}</li>)}
                  </ul>
                  {gap.project && (
                    <p className="text-sm mt-1"><span className="font-medium">Project idea:</span> {gap.project}</p>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}

export default JobDetails;
