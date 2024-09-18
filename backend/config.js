require('dotenv').config(); // Load environment variables from .env file

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,
  // Add other configuration settings as needed
};
