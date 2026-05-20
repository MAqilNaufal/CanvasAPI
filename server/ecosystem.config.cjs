module.exports = {
  apps: [{
    name: 'canvasapi-server',
    script: 'server.mjs',
    cwd: __dirname,
    interpreter: 'node',
    instances: 1,
    autorestart: true,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
