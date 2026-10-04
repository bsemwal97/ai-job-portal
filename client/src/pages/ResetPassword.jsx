import { useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_BASE, errorMessage } from "../config";

function ResetPassword() {

  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (password.length < 8) {
      return setMessage({ ok: false, text: "Password must be at least 8 characters" });
    }

    if (password !== confirm) {
      return setMessage({ ok: false, text: "Passwords do not match" });
    }

    try {

      setLoading(true);
      setMessage(null);

      const response = await axios.post(`${API_BASE}/api/auth/reset-password/${token}`, { password });

      setMessage({ ok: true, text: response.data.message });

      setTimeout(() => navigate("/login"), 1500);

    } catch (err) {

      setMessage({ ok: false, text: errorMessage(err, "Could not reset password") });

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-6">

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md space-y-5">

        <h1 className="text-3xl font-bold">Set a new password</h1>

        {message && (
          <p className={message.ok ? "text-green-600" : "text-red-600"}>{message.text}</p>
        )}

        <input
          type="password"
          required
          placeholder="New password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
        />

        <input
          type="password"
          required
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
        />

        <button
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg disabled:opacity-50"
        >
          {loading ? "Saving..." : "Update password"}
        </button>

        <Link to="/forgot-password" className="block text-center text-gray-500 hover:text-black">
          Link expired? Request a new one
        </Link>

      </form>

    </div>
  );
}

export default ResetPassword;
