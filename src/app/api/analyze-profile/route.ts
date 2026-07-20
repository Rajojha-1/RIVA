import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

function getGithubUsername(url: string): string | null {
  if (!url) return null;
  const match = url.match(/github\.com\/([a-zA-Z0-9\-]+)/i);
  return match ? match[1] : null;
}

function getLeetcodeUsername(url: string): string | null {
  if (!url) return null;
  const match = url.match(/leetcode\.com\/(?:u\/)?([a-zA-Z0-9\-_]+)/i);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, branch, section, choices, github, leetcode, linkedin, areaOfInterest } = body;

    // 1. Fetch all available selection choices/domains from Firestore
    const choicesSnap = await getDocs(collection(db, "choices"));
    const allGlobalChoices: string[] = [];
    choicesSnap.forEach((doc) => {
      allGlobalChoices.push(doc.data().name);
    });

    // 2. Fetch public GitHub data if available
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
            login: userData.login,
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

    // 3. Fetch public LeetCode data if available
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

    // 4. Initialize Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        summary: `[Mock AI Analysis] Student: ${name}. Selected choices: ${choices?.join(", ")}. GitHub: ${github || "N/A"}. LeetCode Solved: ${leetcodeData ? leetcodeData.totalSolved : "N/A"}. Please configure GEMINI_API_KEY to see real AI evaluation.`,
        recommendedDomain: allGlobalChoices[0] || "",
      });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    const prompt = `
Analyze the following student profile details to provide a summary evaluation and recommend the absolute best category choice for recruitment:
Name: ${name || "Unknown"}
Branch/Section: ${branch || "N/A"} (${section || "N/A"})
Student's Chosen Domains: ${choices?.join(", ") || "None"}
Area of Interest: ${areaOfInterest || "None"}
LinkedIn: ${linkedin || "None"}

Real-time Public GitHub Stats Fetched:
${githubData ? JSON.stringify(githubData, null, 2) : "Could not fetch public repository data directly."}

Real-time Public LeetCode Stats Fetched:
${leetcodeData ? JSON.stringify(leetcodeData, null, 2) : "Could not fetch public LeetCode stats directly."}

EVALUATION CRITICALITY RULES:
- You MUST be extremely critical, strict, and brutally honest in your evaluation. 
- Do NOT use generic praise or sugarcoating. 
- If the student's portfolio is weak, lacks projects, has empty repositories, or has solved very few/easy LeetCode problems, call it out directly and be very hard.
- Assess their engineering readiness strictly based on the real statistics provided. If their work is low quality, say so plainly.

Please output a JSON response containing exactly two fields:
1. "summary": A highly critical, descriptive, and professional evaluation (max 3 sentences) assessing the student. Be brutally honest about weaknesses and strengths. Avoid emojis.
2. "recommendedDomain": Recommend the single best category/domain for them to work on from the list of ALL globally available domains: [${allGlobalChoices.join(", ")}]. This string MUST match exactly one of the options in that list. Select the absolute best fit based on their skills, regardless of whether it matches their personal choices or not.

Return ONLY a valid JSON object. Do not include markdown code block formatting (like \`\`\`json).
`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
    });

    const responseText = result.response.text().trim();
    
    // Parse JSON safely
    let summary = "";
    let recommendedDomain = "";
    try {
      const cleanJson = responseText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleanJson);
      summary = parsed.summary || cleanJson;
      recommendedDomain = parsed.recommendedDomain || "";
    } catch (e) {
      console.error("JSON parsing error for Gemini response, returning raw response:", e);
      summary = responseText;
    }

    // Match recommendation strictly against the global choices list
    let matchedDomain = "";
    if (allGlobalChoices && allGlobalChoices.length > 0) {
      const cleanRec = (recommendedDomain || "").toLowerCase().trim();
      if (cleanRec) {
        const found = allGlobalChoices.find(
          (c: string) =>
            c.toLowerCase().trim() === cleanRec ||
            cleanRec.includes(c.toLowerCase().trim()) ||
            c.toLowerCase().trim().includes(cleanRec)
        );
        if (found) {
          matchedDomain = found;
        } else {
          for (const choice of allGlobalChoices) {
            const words = choice.toLowerCase().split(/\s+/);
            if (words.some((w: string) => w.length > 3 && cleanRec.includes(w))) {
              matchedDomain = choice;
              break;
            }
          }
        }
      }
      if (!matchedDomain) {
        matchedDomain = allGlobalChoices[0];
      }
    }

    // Append recommendation to the summary text so it is written inside the textarea
    let finalSummary = summary.trim();
    if (matchedDomain && !finalSummary.toLowerCase().includes("recommended domain")) {
      finalSummary = `${finalSummary} Recommended Domain: ${matchedDomain}.`;
    }

    return NextResponse.json({ summary: finalSummary, recommendedDomain: matchedDomain });
  } catch (error: any) {
    console.error("AI Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI profile analysis." },
      { status: 500 }
    );
  }
}
