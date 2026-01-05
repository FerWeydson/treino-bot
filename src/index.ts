import { env } from "./config/env.js";
import { buildServer } from "./server.js";


const start = async () => {
  const server = buildServer();

  try {
    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${env.PORT}]`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();