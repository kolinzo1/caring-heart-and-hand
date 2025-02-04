module.exports = {
  apps: [
    {
      name: "caring-heart-and-hand",
      script: "server.js",
      instances: "max", // Use all available CPUs
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      // Log configuration
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "logs/error.log",
      out_file: "logs/output.log",
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000,
    },
  ],
};
