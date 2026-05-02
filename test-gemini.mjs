import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

function loadEnv() {
  try {
    const envFile = fs.readFileSync(".env.local", "utf-8");
    for (const line of envFile.split("\n")) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2].trim();
      }
    }
  } catch (e) {
    console.error("Could not load .env.local", e);
  }
}

loadEnv();

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    process.exit(1);
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  console.log("Fetching models...");
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log("Available models:");
    const models = data.models || [];
    models.forEach((m) => console.log(m.name));
    
    // Test generation
    console.log("\nTesting generation with gemini-2.0-flash...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const res = await model.generateContent("say hi");
        console.log(`Success with gemini-2.0-flash:`, res.response.text());
    } catch(e) {
        console.error("gemini-2.0-flash failed:", e);
    }
    
    console.log("\nTesting generation with gemini-1.5-flash...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const res = await model.generateContent("say hi");
        console.log(`Success with gemini-1.5-flash:`, res.response.text());
    } catch(e) {
        console.error("gemini-1.5-flash failed:", e);
    }

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
