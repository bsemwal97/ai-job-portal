import { useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Register() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [role, setRole] =
    useState("Candidate");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const navigate = useNavigate();

  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);


  const handleRegister = async (e) => {

    e.preventDefault();

    setError("");


    if (!name) {

      setError("Name is required");
      nameRef.current.focus();

      return;
    }

    if (!email) {

      setError("Email is required");
      emailRef.current.focus();

      return;
    }

    if (!password) {

      setError("Password is required");
      passwordRef.current.focus();

      return;
    }

    if (password.length < 6) {

      setError(
        "Password must be at least 6 characters"
      );

      passwordRef.current.focus();

      return;
    }


    try {

      setLoading(true);

      await axios.post(
        "http://localhost:5000/api/auth/register",
        {
          name,
          email,
          password,
          role,
        }
      );

      alert(
        "Registration Successful"
      );

      navigate("/login");

    } catch (error) {

      console.log(
        error.response?.data ||
        error.message
      );

      setError(
        error.response?.data?.message ||
        "Registration failed"
      );

    } finally {

      setLoading(false);

    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-6">

      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">

        <h1 className="text-3xl font-bold mb-2 text-center">
          Create Account
        </h1>

        <p className="text-gray-500 text-center mb-6">
          Join the AI Job Portal
        </p>


        {error && (

          <div className="bg-red-100 text-red-600 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>

        )}


        <form
          onSubmit={handleRegister}
          className="space-y-5"
        >

          <div>

            <label className="block mb-2 font-medium">
              Full Name
            </label>

            <input
              ref={nameRef}
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            />

          </div>


          <div>

            <label className="block mb-2 font-medium">
              Email
            </label>

            <input
              ref={emailRef}
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            />

          </div>


          <div>

            <label className="block mb-2 font-medium">
              Password
            </label>

            <input
              ref={passwordRef}
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            />

            <p className="text-sm text-gray-500 mt-2">
              Password must contain at least
              6 characters.
            </p>

          </div>


          <div>

            <label className="block mb-2 font-medium">
              Select Role
            </label>

            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            >

              <option value="Candidate">
                Candidate
              </option>

              <option value="Recruiter">
                Recruiter
              </option>

            </select>

          </div>


          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition"
          >
            {loading
              ? "Creating Account..."
              : "Register"}
          </button>

        </form>

      </div>

    </div>
  );
}

export default Register;