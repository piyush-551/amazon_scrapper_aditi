import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI;

function getClient() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

export async function optimizeListing(originalData) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
Original Title:
${originalData.title}

Original Bullets:
${originalData.bullets.join("\n")}

Original Description:
${originalData.description}

Return ONLY valid JSON:
{
  "opt_title": "",
  "opt_bullets": [],
  "opt_description": "",
  "keywords": ""
}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Gemini returned no JSON");

  return JSON.parse(jsonMatch[0]);
}
