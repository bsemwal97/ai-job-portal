import { useState } from "react";
import axios from "axios";

function UploadResume() {

  const [file, setFile] = useState(null);

  const handleUpload = async (e) => {

    e.preventDefault();

    try {

      const token = localStorage.getItem("token");

      const formData = new FormData();

      formData.append("resume", file);

      const response = await axios.post(
        "http://localhost:5000/api/upload/resume",
        formData,
        {
          headers: {
            authorization: token,
          },
        }
      );

      console.log(response.data);

      alert("Resume uploaded");

    } catch (error) {

      console.log(
        error.response?.data || error.message
      );

    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">

      <form
        onSubmit={handleUpload}
        className="bg-white p-8 rounded-2xl shadow space-y-5"
      >

        <h1 className="text-3xl font-bold">
          Upload Resume 📄
        </h1>

        <input
          type="file"
          onChange={(e) =>
            setFile(e.target.files[0])
          }
        />

        <button
          className="bg-black text-white px-6 py-3 rounded-lg"
        >
          Upload
        </button>

      </form>

    </div>
  );
}

export default UploadResume;