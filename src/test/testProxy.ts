import { GoogleGenAI } from "@google/genai";

async function testProxy() {
  const apiKey = process.env.GEMINI_API_KEY|| "";
  const baseUrl = process.env.USE_PROXY|| "";

  if (!apiKey) {
    console.error("ERROR: environment variable GENAI_API_KEY is not set.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({
    apiKey,
    apiVersion: "v1beta",
    httpOptions: {
      baseUrl, // 代理地址（可通过环境变量覆盖）
    },
  });

  try {
    console.log("Testing Proxy Configuration...");
    const response = await ai.models.list();
    console.log("Proxy Test Response:", response);
  } catch (error) {
    console.error("Proxy Test Failed:", error);
  }
}

testProxy();