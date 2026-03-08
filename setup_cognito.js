/**
 * Anveshak — AWS Cognito Setup Script
 * 
 * Creates:
 *   1. User Pool (anveshak-user-pool)
 *   2. App Client (anveshak-web-client) — no secret, SRP + password auth
 *   3. Admin user (officer@gov.in) with permanent password
 * 
 * Prerequisites:
 *   - AWS credentials configured via env vars or ~/.aws/credentials
 *   - npm install @aws-sdk/client-cognito-identity-provider
 * 
 * Usage:
 *   node setup_cognito.js
 */

const {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  CreateUserPoolClientCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  ListUserPoolsCommand,
  ListUserPoolClientsCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const fs = require("fs");
const path = require("path");

const REGION = process.env.AWS_REGION || "us-east-1";
const POOL_NAME = "anveshak-user-pool";
const CLIENT_NAME = "anveshak-web-client";
const ADMIN_EMAIL = "officer@gov.in";
const ADMIN_PASSWORD = "Admin@123456";

const client = new CognitoIdentityProviderClient({ region: REGION });

async function findExistingPool() {
  const res = await client.send(new ListUserPoolsCommand({ MaxResults: 60 }));
  return (res.UserPools || []).find((p) => p.Name === POOL_NAME);
}

async function findExistingClient(poolId) {
  const res = await client.send(
    new ListUserPoolClientsCommand({ UserPoolId: poolId, MaxResults: 60 })
  );
  return (res.UserPoolClients || []).find((c) => c.ClientName === CLIENT_NAME);
}

async function createUserPool() {
  console.log(`\n[1/3] Creating User Pool: ${POOL_NAME} ...`);

  const existing = await findExistingPool();
  if (existing) {
    console.log(`  ✔ Pool already exists: ${existing.Id}`);
    return existing.Id;
  }

  const res = await client.send(
    new CreateUserPoolCommand({
      PoolName: POOL_NAME,
      UsernameAttributes: ["email"],
      AutoVerifiedAttributes: ["email"],
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireUppercase: true,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: true,
        },
      },
      Schema: [
        { Name: "email", Required: true, Mutable: true },
        { Name: "name", Required: false, Mutable: true },
      ],
      AdminCreateUserConfig: {
        AllowAdminCreateUserOnly: true, // No self-signup — gov officers only
      },
      AccountRecoverySetting: {
        RecoveryMechanisms: [{ Name: "verified_email", Priority: 1 }],
      },
    })
  );

  const poolId = res.UserPool.Id;
  console.log(`  ✔ Created pool: ${poolId}`);
  return poolId;
}

async function createAppClient(poolId) {
  console.log(`\n[2/3] Creating App Client: ${CLIENT_NAME} ...`);

  const existing = await findExistingClient(poolId);
  if (existing) {
    console.log(`  ✔ Client already exists: ${existing.ClientId}`);
    return existing.ClientId;
  }

  const res = await client.send(
    new CreateUserPoolClientCommand({
      UserPoolId: poolId,
      ClientName: CLIENT_NAME,
      GenerateSecret: false, // Public web app — no client secret
      ExplicitAuthFlows: [
        "ALLOW_USER_SRP_AUTH",
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
      ],
      PreventUserExistenceErrors: "ENABLED",
      AccessTokenValidity: 1,  // 1 hour
      IdTokenValidity: 1,      // 1 hour
      RefreshTokenValidity: 7, // 7 days
      TokenValidityUnits: {
        AccessToken: "hours",
        IdToken: "hours",
        RefreshToken: "days",
      },
    })
  );

  const clientId = res.UserPoolClient.ClientId;
  console.log(`  ✔ Created client: ${clientId}`);
  return clientId;
}

async function createAdminUser(poolId) {
  console.log(`\n[3/3] Creating admin user: ${ADMIN_EMAIL} ...`);

  try {
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: poolId,
        Username: ADMIN_EMAIL,
        UserAttributes: [
          { Name: "email", Value: ADMIN_EMAIL },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: "Admin Officer" },
        ],
        MessageAction: "SUPPRESS", // Don't send welcome email
      })
    );
    console.log(`  ✔ User created`);
  } catch (err) {
    if (err.name === "UsernameExistsException") {
      console.log(`  ✔ User already exists`);
    } else {
      throw err;
    }
  }

  // Set permanent password (skip force-change on first login)
  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: poolId,
      Username: ADMIN_EMAIL,
      Password: ADMIN_PASSWORD,
      Permanent: true,
    })
  );
  console.log(`  ✔ Password set (permanent)`);
}

function updateEnvFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, "utf8");
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }
  fs.writeFileSync(filePath, content);
  return true;
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Anveshak — AWS Cognito Setup");
  console.log(`  Region: ${REGION}`);
  console.log("═══════════════════════════════════════════");

  // Step 1: Create User Pool
  const poolId = await createUserPool();

  // Step 2: Create App Client
  const clientId = await createAppClient(poolId);

  // Step 3: Create Admin User
  await createAdminUser(poolId);

  // Step 4: Update .env files with real IDs
  console.log("\n[4/4] Updating .env files ...");

  const updated = [];

  // Frontend
  if (
    updateEnvFile(path.join(__dirname, "anveshak", ".env.local"), {
      NEXT_PUBLIC_COGNITO_USER_POOL_ID: poolId,
      NEXT_PUBLIC_COGNITO_CLIENT_ID: clientId,
    })
  ) {
    updated.push("anveshak/.env.local");
  }

  // Analytics backend
  if (
    updateEnvFile(path.join(__dirname, "analytics", ".env"), {
      COGNITO_USER_POOL_ID: poolId,
    })
  ) {
    updated.push("analytics/.env");
  }

  // Anomaly engine backend
  if (
    updateEnvFile(path.join(__dirname, "aiAnamolyDetection", ".env"), {
      COGNITO_USER_POOL_ID: poolId,
    })
  ) {
    updated.push("aiAnamolyDetection/.env");
  }

  if (updated.length) {
    console.log(`  ✔ Updated: ${updated.join(", ")}`);
  }

  // Summary
  console.log("\n═══════════════════════════════════════════");
  console.log("  Setup Complete!");
  console.log("═══════════════════════════════════════════");
  console.log(`  User Pool ID : ${poolId}`);
  console.log(`  Client ID    : ${clientId}`);
  console.log(`  Admin User   : ${ADMIN_EMAIL}`);
  console.log(`  Admin Pass   : ${ADMIN_PASSWORD}`);
  console.log("═══════════════════════════════════════════");
  console.log("\n  Next steps:");
  console.log("  1. Restart all backend servers");
  console.log("  2. Restart frontend (pnpm dev)");
  console.log("  3. Login with officer@gov.in / Admin@123456");
  console.log("");
}

main().catch((err) => {
  console.error("\n✘ Setup failed:", err.message);
  if (err.message.includes("credentials") || err.message.includes("Could not load")) {
    console.error("\n  AWS credentials not configured. Set them via:");
    console.error("    $env:AWS_ACCESS_KEY_ID = 'your-key'");
    console.error("    $env:AWS_SECRET_ACCESS_KEY = 'your-secret'");
    console.error("    $env:AWS_SESSION_TOKEN = 'your-token'  # if using Learner Lab");
  }
  process.exit(1);
});
