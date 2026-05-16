import { useState } from "react";
import {
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";

function Navbar() {

  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const token =
    localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const handleLogout = () => {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };


  const activeLink = (path) => {

    return location.pathname === path
      ? "text-yellow-300 font-semibold"
      : "hover:text-yellow-300 transition";
  };


  return (
    <nav className="bg-black text-white shadow-lg sticky top-0 z-50">

      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

        {/* Logo */}

        <Link
          to="/"
          className="text-3xl font-bold tracking-wide"
        >
          JobPortal 
        </Link>


        {/* Desktop Menu */}

        <div className="hidden md:flex gap-6 items-center text-lg">

          <Link
            to="/"
            className={activeLink("/")}
          >
            Home
          </Link>


          <Link
            to="/jobs"
            className={activeLink("/jobs")}
          >
            Jobs
          </Link>


          {token &&
            user?.role === "Recruiter" && (

            <>

              <Link
                to="/dashboard"
                className={activeLink("/dashboard")}
              >
                Dashboard
              </Link>

              <Link
                to="/create-job"
                className={activeLink("/create-job")}
              >
                Create Job
              </Link>

            </>

          )}


          {token &&
            user?.role === "Candidate" && (

            <Link
              to="/my-applications"
              className={activeLink("/my-applications")}
            >
              My Applications
            </Link>

          )}


          {token ? (

            <button
              type="button"
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-5 py-2 rounded-xl transition"
            >
              Logout
            </button>

          ) : (

            <>

              <Link
                to="/login"
                className={activeLink("/login")}
              >
                Login
              </Link>

              <Link
                to="/register"
                className="bg-white text-black px-5 py-2 rounded-xl hover:bg-yellow-300 transition"
              >
                Register
              </Link>

            </>

          )}

        </div>


        {/* Mobile Menu Button */}

        <button
          type="button"
          className="md:hidden text-3xl"
          onClick={() =>
            setMenuOpen(!menuOpen)
          }
        >
          ☰
        </button>

      </div>


      {/* Mobile Menu */}

      {menuOpen && (

        <div className="md:hidden bg-gray-900 px-6 py-5 space-y-4 text-lg">

          <Link
            to="/"
            className="block"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            Home
          </Link>


          <Link
            to="/jobs"
            className="block"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            Jobs
          </Link>


          {token &&
            user?.role === "Recruiter" && (

            <>

              <Link
                to="/dashboard"
                className="block"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                Dashboard
              </Link>

              <Link
                to="/create-job"
                className="block"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                Create Job
              </Link>

            </>

          )}


          {token &&
            user?.role === "Candidate" && (

            <Link
              to="/my-applications"
              className="block"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              My Applications
            </Link>

          )}


          {token ? (

            <button
              type="button"
              onClick={handleLogout}
              className="bg-red-500 px-5 py-2 rounded-xl w-full"
            >
              Logout
            </button>

          ) : (

            <>

              <Link
                to="/login"
                className="block"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                Login
              </Link>

              <Link
                to="/register"
                className="block bg-white text-black px-5 py-2 rounded-xl text-center"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                Register
              </Link>

            </>

          )}

        </div>

      )}

    </nav>
  );
}

export default Navbar;