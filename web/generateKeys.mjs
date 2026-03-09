import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { execSync } from "child_process";

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

const jwtKey = privateKey.trimEnd().replace(/\n/g, " ");

console.log("Setting JWT_PRIVATE_KEY...");
execSync(`npx convex env set JWT_PRIVATE_KEY -- "${jwtKey}"`, { stdio: "inherit" });

console.log("Setting JWKS...");
execSync(`npx convex env set JWKS '${jwks}'`, { stdio: "inherit" });

console.log("Setting SITE_URL...");
execSync(`npx convex env set SITE_URL http://localhost:5173`, { stdio: "inherit" });

console.log("✅ All environment variables set!");
