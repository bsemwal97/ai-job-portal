const express = require("express");
const OpenAI = require("openai");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


// ANALYZE RESUME
router.post(
  "/analyze-resume",
  authMiddleware,
  async (req, res) => {

    try {

      const { resumeText } = req.body;

      const completion =
        await openai.chat.completions.create({

          model: "gpt-4.1-mini",

          messages: [
            {
              role: "system",
              content:
                "You are an expert resume reviewer and career coach.",
            },

            {
              role: "user",
              content:
                `Analyze this resume and give detailed improvement suggestions:\n\n${resumeText}`,
            },
          ],
        });

      res.json({
        feedback:
          completion.choices[0].message.content,
      });

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);

module.exports = router;