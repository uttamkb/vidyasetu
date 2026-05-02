import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

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
    data.models?.forEach((m: any) => console.log(m.name));
    
    // Test a simple generation
    console.log("\nTesting generation with the first available flash model...");
    const flashModel = data.models?.find((m: any) => m.name.includes("flash"));
    if (flashModel) {
        const modelName = flashModel.name.replace("models/", "");
        const model = genAI.getGenerativeModel({ model: modelName });
        const res = await model.generateContent("say hi");
        console.log(`Success with ${modelName}:`, res.response.text());
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
