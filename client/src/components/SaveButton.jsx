import { useState } from "react";
import axios from "axios";
import { API_BASE } from "../config";

// Heart toggle for saving a job. `saved` + `onChange` are controlled by the parent
// so a list of jobs can load all saved ids with a single request.
function SaveButton({ jobId, saved, onChange, className = "" }) {

  const [busy, setBusy] = useState(false);

  const toggle = async () => {

    try {

      setBusy(true);

      if (saved) {
        await axios.delete(`${API_BASE}/api/saved/${jobId}`);
      } else {
        await axios.post(`${API_BASE}/api/saved/${jobId}`);
      }

      onChange(!saved);

    } catch {
      // leave the heart as it was; nothing else to do
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={saved ? "Remove from saved jobs" : "Save job"}
      title={saved ? "Remove from saved jobs" : "Save job"}
      className={`text-2xl leading-none disabled:opacity-50 ${className}`}
    >
      {saved ? "❤️" : "🤍"}
    </button>
  );
}

export default SaveButton;
