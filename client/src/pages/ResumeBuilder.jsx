import { useEffect, useRef, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const API_BASE = "http://localhost:5000";

const emptyExperience = {
  role: "",
  company: "",
  location: "",
  startDate: "",
  endDate: "",
  current: false,
  bullets: [],
};

const emptyEducation = {
  degree: "",
  school: "",
  location: "",
  startDate: "",
  endDate: "",
  details: "",
};

const emptyProject = {
  name: "",
  link: "",
  description: "",
};

function authHeaders() {
  return {
    authorization: localStorage.getItem("token"),
  };
}

function resumeToPlainText(resume) {
  const lines = [];

  lines.push(`${resume.fullName || ""} - ${resume.title || ""}`);
  lines.push(resume.summary || "");
  lines.push(`Skills: ${(resume.skills || []).join(", ")}`);

  (resume.experience || []).forEach((exp) => {
    lines.push(
      `${exp.role} at ${exp.company} (${exp.startDate} - ${
        exp.current ? "Present" : exp.endDate
      })`
    );
    (exp.bullets || []).forEach((b) => lines.push(`- ${b}`));
  });

  (resume.education || []).forEach((edu) => {
    lines.push(`${edu.degree}, ${edu.school} (${edu.startDate} - ${edu.endDate})`);
  });

  (resume.projects || []).forEach((proj) => {
    lines.push(`${proj.name}: ${proj.description}`);
  });

  if ((resume.certifications || []).length) {
    lines.push(`Certifications: ${resume.certifications.join(", ")}`);
  }

  return lines.filter(Boolean).join("\n");
}

function ResumeBuilder() {
  const [resume, setResume] = useState({
    fullName: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    portfolio: "",
    summary: "",
    targetRole: "",
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
  });

  const [skillsInput, setSkillsInput] = useState("");
  const [certificationsInput, setCertificationsInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState(null); // tracks which AI action is in flight

  const [jobDescription, setJobDescription] = useState("");
  const [matchResult, setMatchResult] = useState(null);
  const [matching, setMatching] = useState(false);

  const previewRef = useRef(null);

  useEffect(() => {
    loadResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadResume = async () => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_BASE}/api/resume`, {
        headers: authHeaders(),
      });

      const loaded = response.data.resume;

      setResume((prev) => ({ ...prev, ...loaded }));
      setSkillsInput((loaded.skills || []).join(", "));
      setCertificationsInput((loaded.certifications || []).join(", "));

    } catch (error) {
      console.log(error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveResume = async () => {
    try {
      setSaving(true);

      const payload = {
        ...resume,
        skills: skillsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        certifications: certificationsInput
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      };

      const response = await axios.put(
        `${API_BASE}/api/resume`,
        payload,
        { headers: authHeaders() }
      );

      setResume(response.data.resume);
      alert("Resume saved");

    } catch (error) {
      console.log(error.response?.data || error.message);
      alert("Could not save resume");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setResume((prev) => ({ ...prev, [field]: value }));
  };

  // ---------- AI actions ----------

  const generateSummary = async () => {
    if (!resume.targetRole) {
      alert("Add a target role first so the AI knows what to write for");
      return;
    }

    try {
      setBusyKey("summary");

      const response = await axios.post(
        `${API_BASE}/api/ai/generate-summary`,
        {
          targetRole: resume.targetRole,
          skills: skillsInput.split(",").map((s) => s.trim()).filter(Boolean),
          highlights: resume.summary,
        },
        { headers: authHeaders() }
      );

      updateField("summary", response.data.summary);

    } catch (error) {
      console.log(error.response?.data || error.message);
      alert("AI request failed");
    } finally {
      setBusyKey(null);
    }
  };

  const improveSummary = async () => {
    if (!resume.summary) return;

    try {
      setBusyKey("summary");

      const response = await axios.post(
        `${API_BASE}/api/ai/improve-text`,
        { text: resume.summary, context: "resume professional summary" },
        { headers: authHeaders() }
      );

      updateField("summary", response.data.improved);

    } catch (error) {
      console.log(error.response?.data || error.message);
      alert("AI request failed");
    } finally {
      setBusyKey(null);
    }
  };

  const generateBulletsForExperience = async (index) => {
    const exp = resume.experience[index];

    if (!exp.role) {
      alert("Add a role/title for this experience first");
      return;
    }

    try {
      setBusyKey(`exp-bullets-${index}`);

      const response = await axios.post(
        `${API_BASE}/api/ai/generate-bullets`,
        {
          role: exp.role,
          company: exp.company,
          responsibilities: exp.bullets.join("; "),
          count: 4,
        },
        { headers: authHeaders() }
      );

      updateExperience(index, "bullets", response.data.bullets);

    } catch (error) {
      console.log(error.response?.data || error.message);
      alert("AI request failed");
    } finally {
      setBusyKey(null);
    }
  };

  const improveBullet = async (expIndex, bulletIndex) => {
    const exp = resume.experience[expIndex];
    const text = exp.bullets[bulletIndex];

    if (!text) return;

    try {
      setBusyKey(`exp-bullet-${expIndex}-${bulletIndex}`);

      const response = await axios.post(
        `${API_BASE}/api/ai/improve-text`,
        { text, context: `resume bullet point for ${exp.role} at ${exp.company}` },
        { headers: authHeaders() }
      );

      const bullets = [...exp.bullets];
      bullets[bulletIndex] = response.data.improved;

      updateExperience(expIndex, "bullets", bullets);

    } catch (error) {
      console.log(error.response?.data || error.message);
      alert("AI request failed");
    } finally {
      setBusyKey(null);
    }
  };

  const improveProjectDescription = async (index) => {
    const proj = resume.projects[index];

    if (!proj.description) return;

    try {
      setBusyKey(`proj-${index}`);

      const response = await axios.post(
        `${API_BASE}/api/ai/improve-text`,
        { text: proj.description, context: `resume project description for ${proj.name}` },
        { headers: authHeaders() }
      );

      updateProject(index, "description", response.data.improved);

    } catch (error) {
      console.log(error.response?.data || error.message);
      alert("AI request failed");
    } finally {
      setBusyKey(null);
    }
  };

  const analyzeMatch = async () => {
    if (!jobDescription.trim()) {
      alert("Paste a job description first");
      return;
    }

    try {
      setMatching(true);
      setMatchResult(null);

      const response = await axios.post(
        `${API_BASE}/api/ai/match-job`,
        {
          resumeText: resumeToPlainText(resume),
          jobDescription,
        },
        { headers: authHeaders() }
      );

      setMatchResult(response.data);

    } catch (error) {
      console.log(error.response?.data || error.message);
      alert("AI request failed");
    } finally {
      setMatching(false);
    }
  };

  // ---------- array helpers ----------

  const updateExperience = (index, field, value) => {
    setResume((prev) => {
      const experience = [...prev.experience];
      experience[index] = { ...experience[index], [field]: value };
      return { ...prev, experience };
    });
  };

  const addExperience = () => {
    setResume((prev) => ({
      ...prev,
      experience: [...prev.experience, { ...emptyExperience }],
    }));
  };

  const removeExperience = (index) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  const addBulletToExperience = (index) => {
    updateExperience(index, "bullets", [
      ...resume.experience[index].bullets,
      "",
    ]);
  };

  const updateExperienceBullet = (expIndex, bulletIndex, value) => {
    const bullets = [...resume.experience[expIndex].bullets];
    bullets[bulletIndex] = value;
    updateExperience(expIndex, "bullets", bullets);
  };

  const removeExperienceBullet = (expIndex, bulletIndex) => {
    const bullets = resume.experience[expIndex].bullets.filter(
      (_, i) => i !== bulletIndex
    );
    updateExperience(expIndex, "bullets", bullets);
  };

  const updateEducation = (index, field, value) => {
    setResume((prev) => {
      const education = [...prev.education];
      education[index] = { ...education[index], [field]: value };
      return { ...prev, education };
    });
  };

  const addEducation = () => {
    setResume((prev) => ({
      ...prev,
      education: [...prev.education, { ...emptyEducation }],
    }));
  };

  const removeEducation = (index) => {
    setResume((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  const updateProject = (index, field, value) => {
    setResume((prev) => {
      const projects = [...prev.projects];
      projects[index] = { ...projects[index], [field]: value };
      return { ...prev, projects };
    });
  };

  const addProject = () => {
    setResume((prev) => ({
      ...prev,
      projects: [...prev.projects, { ...emptyProject }],
    }));
  };

  const removeProject = (index) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  const downloadPDF = async () => {
    const node = previewRef.current;

    if (!node) return;

    const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${(resume.fullName || "resume").replace(/\s+/g, "_")}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading resume builder...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="text-3xl font-bold">AI Resume Builder ✨</h1>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={saveResume}
              disabled={saving}
              className="bg-black text-white px-6 py-3 rounded-lg"
            >
              {saving ? "Saving..." : "Save Resume"}
            </button>

            <button
              type="button"
              onClick={downloadPDF}
              className="bg-yellow-400 text-black px-6 py-3 rounded-lg font-semibold"
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ---------------- FORM ---------------- */}
          <div className="space-y-6">

            {/* Personal info */}
            <section className="bg-white rounded-2xl shadow p-6 space-y-3">
              <h2 className="text-xl font-bold mb-2">Personal Info</h2>

              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                placeholder="Full Name"
                value={resume.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
              />

              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                placeholder="Headline / Current Title (e.g. Frontend Developer)"
                value={resume.title}
                onChange={(e) => updateField("title", e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  placeholder="Email"
                  value={resume.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
                <input
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  placeholder="Phone"
                  value={resume.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>

              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                placeholder="Location"
                value={resume.location}
                onChange={(e) => updateField("location", e.target.value)}
              />

              <div className="grid grid-cols-3 gap-3">
                <input
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  placeholder="LinkedIn URL"
                  value={resume.linkedin}
                  onChange={(e) => updateField("linkedin", e.target.value)}
                />
                <input
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  placeholder="GitHub URL"
                  value={resume.github}
                  onChange={(e) => updateField("github", e.target.value)}
                />
                <input
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  placeholder="Portfolio URL"
                  value={resume.portfolio}
                  onChange={(e) => updateField("portfolio", e.target.value)}
                />
              </div>
            </section>

            {/* Summary */}
            <section className="bg-white rounded-2xl shadow p-6 space-y-3">
              <h2 className="text-xl font-bold mb-2">Professional Summary</h2>

              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                placeholder="Target Role (e.g. Backend Developer)"
                value={resume.targetRole}
                onChange={(e) => updateField("targetRole", e.target.value)}
              />

              <textarea
                className="w-full border border-gray-300 rounded-lg px-4 py-3 h-32"
                placeholder="A short summary about you..."
                value={resume.summary}
                onChange={(e) => updateField("summary", e.target.value)}
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={generateSummary}
                  disabled={busyKey === "summary"}
                  className="bg-black text-white px-4 py-2 rounded-lg text-sm"
                >
                  {busyKey === "summary" ? "Working..." : "✨ Generate with AI"}
                </button>

                <button
                  type="button"
                  onClick={improveSummary}
                  disabled={busyKey === "summary" || !resume.summary}
                  className="border border-black px-4 py-2 rounded-lg text-sm"
                >
                  ✨ Improve wording
                </button>
              </div>
            </section>

            {/* Skills */}
            <section className="bg-white rounded-2xl shadow p-6 space-y-3">
              <h2 className="text-xl font-bold mb-2">Skills</h2>

              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                placeholder="React, Node.js, MongoDB, Tailwind..."
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
              />
              <p className="text-sm text-gray-500">Comma separated</p>
            </section>

            {/* Experience */}
            <section className="bg-white rounded-2xl shadow p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Experience</h2>
                <button
                  type="button"
                  onClick={addExperience}
                  className="text-sm bg-black text-white px-4 py-2 rounded-lg"
                >
                  + Add
                </button>
              </div>

              {resume.experience.map((exp, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-4 space-y-3">

                  <div className="flex justify-between items-start gap-3">
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      <input
                        className="border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Role"
                        value={exp.role}
                        onChange={(e) => updateExperience(index, "role", e.target.value)}
                      />
                      <input
                        className="border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Company"
                        value={exp.company}
                        onChange={(e) => updateExperience(index, "company", e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeExperience(index)}
                      className="text-red-500 text-sm mt-2"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Location"
                      value={exp.location}
                      onChange={(e) => updateExperience(index, "location", e.target.value)}
                    />
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Start (e.g. Jan 2023)"
                      value={exp.startDate}
                      onChange={(e) => updateExperience(index, "startDate", e.target.value)}
                    />
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                      placeholder="End (e.g. Present)"
                      value={exp.current ? "Present" : exp.endDate}
                      disabled={exp.current}
                      onChange={(e) => updateExperience(index, "endDate", e.target.value)}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={exp.current}
                      onChange={(e) => updateExperience(index, "current", e.target.checked)}
                    />
                    I currently work here
                  </label>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Achievements / Bullet points</p>

                    {exp.bullets.map((bullet, bIndex) => (
                      <div key={bIndex} className="flex gap-2">
                        <textarea
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                          value={bullet}
                          onChange={(e) =>
                            updateExperienceBullet(index, bIndex, e.target.value)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => improveBullet(index, bIndex)}
                          disabled={busyKey === `exp-bullet-${index}-${bIndex}`}
                          className="text-xs border border-black rounded-lg px-2"
                        >
                          {busyKey === `exp-bullet-${index}-${bIndex}` ? "..." : "✨"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExperienceBullet(index, bIndex)}
                          className="text-red-500 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => addBulletToExperience(index)}
                        className="text-sm text-blue-600"
                      >
                        + Add bullet
                      </button>

                      <button
                        type="button"
                        onClick={() => generateBulletsForExperience(index)}
                        disabled={busyKey === `exp-bullets-${index}`}
                        className="text-sm bg-black text-white px-3 py-1 rounded-lg"
                      >
                        {busyKey === `exp-bullets-${index}`
                          ? "Working..."
                          : "✨ Generate bullets with AI"}
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </section>

            {/* Education */}
            <section className="bg-white rounded-2xl shadow p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Education</h2>
                <button
                  type="button"
                  onClick={addEducation}
                  className="text-sm bg-black text-white px-4 py-2 rounded-lg"
                >
                  + Add
                </button>
              </div>

              {resume.education.map((edu, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-4 space-y-3">

                  <div className="flex justify-between items-start gap-3">
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      <input
                        className="border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Degree"
                        value={edu.degree}
                        onChange={(e) => updateEducation(index, "degree", e.target.value)}
                      />
                      <input
                        className="border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="School / University"
                        value={edu.school}
                        onChange={(e) => updateEducation(index, "school", e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="text-red-500 text-sm mt-2"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Location"
                      value={edu.location}
                      onChange={(e) => updateEducation(index, "location", e.target.value)}
                    />
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Start"
                      value={edu.startDate}
                      onChange={(e) => updateEducation(index, "startDate", e.target.value)}
                    />
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="End"
                      value={edu.endDate}
                      onChange={(e) => updateEducation(index, "endDate", e.target.value)}
                    />
                  </div>

                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Details (GPA, honors, relevant coursework...)"
                    value={edu.details}
                    onChange={(e) => updateEducation(index, "details", e.target.value)}
                  />
                </div>
              ))}
            </section>

            {/* Projects */}
            <section className="bg-white rounded-2xl shadow p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Projects</h2>
                <button
                  type="button"
                  onClick={addProject}
                  className="text-sm bg-black text-white px-4 py-2 rounded-lg"
                >
                  + Add
                </button>
              </div>

              {resume.projects.map((proj, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-4 space-y-3">

                  <div className="flex justify-between items-start gap-3">
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      <input
                        className="border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Project Name"
                        value={proj.name}
                        onChange={(e) => updateProject(index, "name", e.target.value)}
                      />
                      <input
                        className="border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Link (GitHub / Live URL)"
                        value={proj.link}
                        onChange={(e) => updateProject(index, "link", e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeProject(index)}
                      className="text-red-500 text-sm mt-2"
                    >
                      Remove
                    </button>
                  </div>

                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Description"
                    value={proj.description}
                    onChange={(e) => updateProject(index, "description", e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={() => improveProjectDescription(index)}
                    disabled={busyKey === `proj-${index}` || !proj.description}
                    className="text-sm border border-black px-3 py-1 rounded-lg"
                  >
                    {busyKey === `proj-${index}` ? "Working..." : "✨ Improve wording"}
                  </button>
                </div>
              ))}
            </section>

            {/* Certifications */}
            <section className="bg-white rounded-2xl shadow p-6 space-y-3">
              <h2 className="text-xl font-bold mb-2">Certifications</h2>

              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                placeholder="AWS Certified Developer, Google UX Design..."
                value={certificationsInput}
                onChange={(e) => setCertificationsInput(e.target.value)}
              />
              <p className="text-sm text-gray-500">Comma separated</p>
            </section>

            {/* Job match analyzer */}
            <section className="bg-white rounded-2xl shadow p-6 space-y-3">
              <h2 className="text-xl font-bold mb-2">
                Match Against a Job Description
              </h2>

              <textarea
                className="w-full border border-gray-300 rounded-lg px-4 py-3 h-32"
                placeholder="Paste a job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />

              <button
                type="button"
                onClick={analyzeMatch}
                disabled={matching}
                className="bg-black text-white px-6 py-3 rounded-lg"
              >
                {matching ? "Analyzing..." : "✨ Analyze Match"}
              </button>

              {matchResult && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3 mt-3">
                  <p className="text-lg font-bold">
                    Match Score: {matchResult.score}/100
                  </p>

                  {matchResult.matchedKeywords?.length > 0 && (
                    <div>
                      <p className="font-semibold text-sm">Matched keywords</p>
                      <p className="text-sm text-green-700">
                        {matchResult.matchedKeywords.join(", ")}
                      </p>
                    </div>
                  )}

                  {matchResult.missingKeywords?.length > 0 && (
                    <div>
                      <p className="font-semibold text-sm">Missing keywords</p>
                      <p className="text-sm text-red-600">
                        {matchResult.missingKeywords.join(", ")}
                      </p>
                    </div>
                  )}

                  {matchResult.suggestions?.length > 0 && (
                    <div>
                      <p className="font-semibold text-sm">Suggestions</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {matchResult.suggestions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>

          </div>

          {/* ---------------- LIVE PREVIEW ---------------- */}
          <div className="lg:sticky lg:top-24 self-start">
            <div
              ref={previewRef}
              className="bg-white rounded-2xl shadow p-8 space-y-4"
            >
              <div>
                <h2 className="text-2xl font-bold">{resume.fullName || "Your Name"}</h2>
                <p className="text-gray-600">{resume.title || "Your Headline"}</p>
                <p className="text-sm text-gray-500">
                  {[resume.email, resume.phone, resume.location]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="text-sm text-blue-600">
                  {[resume.linkedin, resume.github, resume.portfolio]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              {resume.summary && (
                <div>
                  <h3 className="font-bold border-b border-gray-300 mb-1">Summary</h3>
                  <p className="text-sm">{resume.summary}</p>
                </div>
              )}

              {resume.skills?.length > 0 && (
                <div>
                  <h3 className="font-bold border-b border-gray-300 mb-1">Skills</h3>
                  <p className="text-sm">{resume.skills.join(" · ")}</p>
                </div>
              )}

              {resume.experience?.length > 0 && (
                <div>
                  <h3 className="font-bold border-b border-gray-300 mb-1">Experience</h3>
                  {resume.experience.map((exp, i) => (
                    <div key={i} className="mb-2">
                      <p className="text-sm font-semibold">
                        {exp.role} — {exp.company}
                      </p>
                      <p className="text-xs text-gray-500">
                        {exp.location} | {exp.startDate} -{" "}
                        {exp.current ? "Present" : exp.endDate}
                      </p>
                      <ul className="list-disc list-inside text-sm">
                        {exp.bullets.filter(Boolean).map((b, bi) => (
                          <li key={bi}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {resume.projects?.length > 0 && (
                <div>
                  <h3 className="font-bold border-b border-gray-300 mb-1">Projects</h3>
                  {resume.projects.map((proj, i) => (
                    <div key={i} className="mb-2">
                      <p className="text-sm font-semibold">{proj.name}</p>
                      <p className="text-sm">{proj.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {resume.education?.length > 0 && (
                <div>
                  <h3 className="font-bold border-b border-gray-300 mb-1">Education</h3>
                  {resume.education.map((edu, i) => (
                    <div key={i} className="mb-2">
                      <p className="text-sm font-semibold">
                        {edu.degree}, {edu.school}
                      </p>
                      <p className="text-xs text-gray-500">
                        {edu.location} | {edu.startDate} - {edu.endDate}
                      </p>
                      {edu.details && <p className="text-sm">{edu.details}</p>}
                    </div>
                  ))}
                </div>
              )}

              {resume.certifications?.length > 0 && (
                <div>
                  <h3 className="font-bold border-b border-gray-300 mb-1">
                    Certifications
                  </h3>
                  <p className="text-sm">{resume.certifications.join(" · ")}</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ResumeBuilder;
