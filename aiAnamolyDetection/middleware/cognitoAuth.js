const https = require("https");
const crypto = require("crypto");

// Cache for JWKS keys
let jwksCache = null;
let jwksCacheExpiry = 0;

const COGNITO_REGION = process.env.AWS_REGION || "us-east-1";
const COGNITO_POOL_ID = process.env.COGNITO_USER_POOL_ID || "";
const COGNITO_ENABLED = COGNITO_POOL_ID.includes("_");

/**
 * Fetch JWKS from Cognito. Caches for 1 hour.
 */
function fetchJWKS() {
  return new Promise((resolve, reject) => {
    if (jwksCache && Date.now() < jwksCacheExpiry) {
      return resolve(jwksCache);
    }
    const url = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_POOL_ID}/.well-known/jwks.json`;
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            jwksCache = JSON.parse(data);
            jwksCacheExpiry = Date.now() + 3600000; // 1 hour
            resolve(jwksCache);
          } catch (e) {
            reject(new Error("Failed to parse JWKS"));
          }
        });
      })
      .on("error", reject);
  });
}

/**
 * Decode a JWT without verification (to read the header for kid).
 */
function decodeJwtHeader(token) {
  const header = token.split(".")[0];
  return JSON.parse(Buffer.from(header, "base64url").toString());
}

/**
 * Decode the JWT payload.
 */
function decodeJwtPayload(token) {
  const payload = token.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString());
}

/**
 * Convert a JWK to a PEM public key for RS256 verification.
 */
function jwkToPem(jwk) {
  const keyObject = crypto.createPublicKey({ key: jwk, format: "jwk" });
  return keyObject.export({ type: "spki", format: "pem" });
}

/**
 * Verify JWT signature using RS256.
 */
function verifySignature(token, pem) {
  const parts = token.split(".");
  const signedContent = parts[0] + "." + parts[1];
  const signature = Buffer.from(parts[2], "base64url");
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(signedContent);
  return verifier.verify(pem, signature);
}

/**
 * Middleware: Validate Cognito JWT from Authorization header.
 * If Cognito is not configured, skips validation (passes through).
 * Works alongside X-Engine-Secret — either auth method is accepted.
 */
function validateCognitoJwt(req, res, next) {
  // If Cognito not configured, skip JWT validation
  if (!COGNITO_ENABLED) {
    return next();
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // No JWT present — let other auth (engine secret) handle it
    return next();
  }

  const token = authHeader.slice(7);

  (async () => {
    try {
      const header = decodeJwtHeader(token);
      const payload = decodeJwtPayload(token);

      // Verify issuer
      const expectedIssuer = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_POOL_ID}`;
      if (payload.iss !== expectedIssuer) {
        return res.status(401).json({ success: false, error: "Invalid token issuer" });
      }

      // Verify expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({ success: false, error: "Token expired" });
      }

      // Verify token_use
      if (payload.token_use !== "access" && payload.token_use !== "id") {
        return res.status(401).json({ success: false, error: "Invalid token use" });
      }

      // Fetch JWKS and find matching key
      const jwks = await fetchJWKS();
      const key = jwks.keys.find((k) => k.kid === header.kid);
      if (!key) {
        return res.status(401).json({ success: false, error: "Token signing key not found" });
      }

      // Verify signature
      const pem = jwkToPem(key);
      if (!verifySignature(token, pem)) {
        return res.status(401).json({ success: false, error: "Invalid token signature" });
      }

      // Attach user info to request
      req.cognitoUser = {
        sub: payload.sub,
        email: payload.email || payload["cognito:username"],
        groups: payload["cognito:groups"] || [],
      };

      next();
    } catch (err) {
      return res.status(401).json({ success: false, error: "JWT validation failed" });
    }
  })();
}

module.exports = { validateCognitoJwt, COGNITO_ENABLED };
