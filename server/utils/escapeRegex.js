module.exports = (str = "") => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
