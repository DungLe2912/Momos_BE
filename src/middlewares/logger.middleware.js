export const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  const { method, url } = req;

  console.log(`[INFO] Incoming Request: ${method} ${url}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[INFO] Completed ${method} ${url} with status ${res.statusCode} in ${duration}ms`
    );
  });

  next();
};
