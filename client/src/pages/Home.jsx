import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function Home() {

  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-6 md:px-10 py-20 overflow-hidden relative">

      {/* Background Glow */}

      <div className="absolute top-0 left-0 w-72 h-72 bg-yellow-300 opacity-20 blur-3xl rounded-full"></div>

      <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-300 opacity-20 blur-3xl rounded-full"></div>


      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-14 items-center">

        {/* LEFT SIDE */}

        <motion.div
          initial={{
            opacity: 0,
            x: -50,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 1,
          }}
        >

          <motion.p
            initial={{
              opacity: 0,
              y: -20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.8,
            }}
            className="inline-block bg-black text-white px-5 py-2 rounded-full text-sm mb-6 shadow-lg"
          >
            🚀 AI Powered Career Platform
          </motion.p>


          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight text-gray-900">

            Build Your

            <span className="text-yellow-500">
              {" "}Dream Career{" "}
            </span>

            with AI ⚡

          </h1>


          <p className="mt-8 text-lg text-gray-600 leading-8 max-w-xl">

            Discover opportunities, connect with recruiters,
            and unlock intelligent career recommendations
            tailored to your skills and ambitions.

          </p>


          <div className="mt-10 flex flex-wrap gap-4">

            <Link to="/register">

              <button
                type="button"
                className="bg-black text-white px-8 py-4 rounded-2xl hover:scale-105 hover:bg-gray-800 transition shadow-xl"
              >
                Get Started
              </button>

            </Link>


            <Link to="/jobs">

              <button
                type="button"
                className="border-2 border-black px-8 py-4 rounded-2xl hover:bg-black hover:text-white transition shadow-lg"
              >
                Browse Jobs
              </button>

            </Link>

          </div>


          {/* Quote Card */}

          <motion.div
            initial={{
              opacity: 0,
              y: 40,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 1.2,
            }}
            className="mt-12 bg-white/80 backdrop-blur-lg border border-gray-200 rounded-3xl shadow-xl p-6 max-w-xl"
          >

            <p className="text-gray-700 leading-7 italic">
              “Opportunities rarely knock loudly.
              They usually whisper through consistency.”
            </p>

          </motion.div>

        </motion.div>


        {/* RIGHT SIDE */}

        <motion.div
          initial={{
            opacity: 0,
            y: 60,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 1,
          }}
          className="relative bg-white/80 backdrop-blur-lg border border-gray-200 rounded-3xl shadow-2xl p-10 overflow-hidden"
        >

          {/* Glow */}

          <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-300 rounded-full blur-3xl opacity-30"></div>


          <h2 className="text-3xl font-bold mb-4 text-gray-900">
            Featured Skills ⚡
          </h2>

          <p className="text-gray-600 leading-7 mb-8">
            Explore the most in-demand technologies
            shaping the future of careers.
          </p>


          <div className="grid grid-cols-2 gap-4">

            <motion.div
              whileHover={{
                scale: 1.05,
              }}
              className="bg-black text-white rounded-2xl p-5 shadow-lg"
            >
              React
            </motion.div>


            <motion.div
              whileHover={{
                scale: 1.05,
              }}
              className="bg-yellow-300 text-black rounded-2xl p-5 shadow-lg"
            >
              Node.js
            </motion.div>


            <motion.div
              whileHover={{
                scale: 1.05,
              }}
              className="bg-gray-900 text-white rounded-2xl p-5 shadow-lg"
            >
              MongoDB
            </motion.div>


            <motion.div
              whileHover={{
                scale: 1.05,
              }}
              className="bg-white border rounded-2xl p-5 shadow-lg"
            >
              AI Tools
            </motion.div>


            <motion.div
              whileHover={{
                scale: 1.05,
              }}
              className="bg-blue-100 rounded-2xl p-5 shadow-lg"
            >
              UI / UX
            </motion.div>


            <motion.div
              whileHover={{
                scale: 1.05,
              }}
              className="bg-green-100 rounded-2xl p-5 shadow-lg"
            >
              Cloud Computing
            </motion.div>

          </div>


          {/* Floating Rocket */}

          <motion.div
            animate={{
              y: [0, -12, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
            }}
            className="mt-10 text-6xl text-center"
          >
            🚀
          </motion.div>

        </motion.div>

      </div>

    </section>
  );
}

export default Home;