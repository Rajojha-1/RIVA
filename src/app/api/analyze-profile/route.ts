import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

function getGithubUsername(url: string): string | null {
  if (!url) return null;
  // Match username from github.com/username
  const match = url.match(/github\.com\/([a-zA-Z0-9\-]+)/i);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, branch, section, choices, github, leetcode, linkedin, areaOfInterest } = body;

    // 1. Try to fetch public GitHub data if a URL is provided
    let githubData = null;
    const githubUsername = getGithubUsername(github);
    if (githubUsername) {
      try {
        const userRes = await fetch(`https://api.github.com/users/${githubUsername}`, {
          headers: { "User-Agent": "RIVA-App" },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          // Fetch last 5 updated public repositories
          const reposRes = await fetch(
            `https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=5`,
            { headers: { "User-Agent": "RIVA-App" } }
          );
          const reposData = reposRes.ok ? await reposRes.json() : [];

          githubData = {
            bio: userData.bio || "No bio set",
            public_repos: userData.public_repos,
            followers: userData.followers,
            top_repos: reposData.map((r: any) => ({
              name: r.name,
              language: r.language || "Not specified",
              description: r.description || "No description",
            })),
          };
        }
      } catch (ghErr) {
        console.error("Error fetching GitHub profile:", ghErr);
      }
    }

    // 2. Initialize Gemini API using key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        summary: `[Mock AI Analysis] Student has selected: ${choices?.join(", ")}. GitHub link is ${github || "N/A"}. Please configure GEMINI_API_KEY in your env to get real analysis.`,
      });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Analyze the following student profile details to provide a summary evaluation for recruitment:
Name: ${name || "Unknown"}
Branch/Section: ${branch || "N/A"} (${section || "N/A"})
Selected Domains: ${choices?.join(", ") || "None"}
Area of Interest: ${areaOfInterest || "None"}
LinkedIn: ${linkedin || "None"}
LeetCode: ${leetcode || "None"}
GitHub Link: ${github || "None"}

Real-time Public GitHub Stats Fetched:
${githubData ? JSON.stringify(githubData, null, 2) : "Could not fetch public repository data directly."}

Please write a highly descriptive and professional remarks note (max 3 sentences) summarizing:
1. The best feature about this student (e.g., project variety, choice alignment, profile strength).
2. A brief analysis of their skills and match for the selected domains.

Guidelines:
- Write in plain English without bullet points.
- Do not use emojis.
- Start directly with the evaluation (e.g. "Candidate shows strong skill in ...").
`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const summary = result.response.text() || "Failed to generate evaluation remarks.";
    return NextResponse.json({ summary: summary.trim() });
  } catch (error: any) {
    console.error("AI Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI profile analysis." },
      { status: 500 }
    );
  }
}
