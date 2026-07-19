import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

function getGithubUsername(url: string): string | null {
  if (!url) return null;
  const match = url.match(/github\.com\/([a-zA-Z0-9\-]+)/i);
  return match ? match[1] : null;
}

function getLeetcodeUsername(url: string): string | null {
  if (!url) return null;
  // Match username from leetcode.com/username or leetcode.com/u/username
  const match = url.match(/leetcode\.com\/(?:u\/)?([a-zA-Z0-9\-_]+)/i);
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

    // 2. Try to fetch public LeetCode data if a URL is provided
    let leetcodeData = null;
    const leetcodeUsername = getLeetcodeUsername(leetcode);
    if (leetcodeUsername) {
      try {
        const lcRes = await fetch(`https://leetcode-api-faisalshohag.vercel.app/${leetcodeUsername}`);
        if (lcRes.ok) {
          const lcJson = await lcRes.json();
          leetcodeData = {
            totalSolved: lcJson.totalSolved,
            easySolved: lcJson.easySolved,
            mediumSolved: lcJson.mediumSolved,
            hardSolved: lcJson.hardSolved,
            ranking: lcJson.ranking,
            recentSubmissions: lcJson.recentSubmissions?.slice(0, 5).map((s: any) => ({
              title: s.title,
              status: s.statusDisplay,
              lang: s.lang,
            })) || [],
          };
        }
      } catch (lcErr) {
        console.error("Error fetching LeetCode profile:", lcErr);
      }
    }

    // 3. Initialize Gemini API using key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        summary: `[Mock AI Analysis] Student: ${name}. Selected choices: ${choices?.join(", ")}. GitHub: ${github || "N/A"}. LeetCode Solved: ${leetcodeData ? leetcodeData.totalSolved : "N/A"}. Please configure GEMINI_API_KEY to see real AI evaluation.`,
      });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
Analyze the following student profile details to provide a summary evaluation for recruitment:
Name: ${name || "Unknown"}
Branch/Section: ${branch || "N/A"} (${section || "N/A"})
Selected Domains: ${choices?.join(", ") || "None"}
Area of Interest: ${areaOfInterest || "None"}
LinkedIn: ${linkedin || "None"}

Real-time Public GitHub Stats Fetched:
${githubData ? JSON.stringify(githubData, null, 2) : "Could not fetch public repository data directly."}

Real-time Public LeetCode Stats Fetched:
${leetcodeData ? JSON.stringify(leetcodeData, null, 2) : "Could not fetch public LeetCode stats directly."}

Please write a highly descriptive and professional remarks note (max 3 sentences) summarizing:
1. The best feature about this student (e.g., project quality/complexity, solved LeetCode counts/difficulties, domain fit).
2. A clear recommendation of the absolute best category/domain for them to work on from their Selected Domains list, based on their skills.
3. A brief analysis of their match for the selected domains.

Guidelines:
- Write in plain English without bullet points.
- Do not use emojis.
- Start directly with the evaluation (e.g. "Candidate shows strong skill in ...").
- Explicitly state the recommended best domain.
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
