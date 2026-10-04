const mongoose = require("mongoose");

// Rejects malformed ids with a 400 instead of letting Mongoose throw a CastError (500)
module.exports = (...params) => (req, res, next) => {
  for (const name of params) {
    if (!mongoose.isValidObjectId(req.params[name])) {
      return res.status(400).json({ message: `Invalid ${name}` });
    }
  }
  next();
};
