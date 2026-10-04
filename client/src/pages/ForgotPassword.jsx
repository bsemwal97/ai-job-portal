import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API_BASE, errorMessage } from "../config";

function ForgotPassword() {

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      setLoading(true);
      setMessage(null);

      const response = await axios.post(`${API_BASE}/api/auth/forgot-password`, { email });

      setMessage({ ok: true, text: response.data.message });

    } catch (err) {

      setMessage({ ok: false, text: errorMessage(err, "Something went wrong") });

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-6">

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md space-y-5">

        <h1 className="text-3xl font-bold">Forgot password?</h1>

        <p className="text-gray-600">
          Enter your email and we'll send you a link to reset it.
        </p>

        {message && (
          <p className={message.ok ? "text-green-600" : "text-red-600"}>{message.text}</p>
        )}

        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
        />

        <button
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>

        <Link to="/login" className="block text-center text-gray-500 hover:text-black">
          ← Back to login
        </Link>

      </form>

    </div>
  );
}

export default ForgotPassword;
