import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token is not provided" });
  }

  jwt.verify(token, "" + process.env.ACCESS_SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(401).json({ error: "Token is not provided" });
    }
    req.user = user;
    next();
  });
};
