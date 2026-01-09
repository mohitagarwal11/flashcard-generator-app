require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = 3000;

app.use(require("cors")());

app.use(express.json());

app.post("/api/generate-flashcards", async (req, res) => {
  try {
    const { topic } = req.body;

    console.log("Generating flashcards for:", topic);

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: "Topic is required",
      });
    }

    const totalCards = 15;
    const prompt = `
You are a flashcard generator.

Based on the following user request, create exactly ${totalCards} flashcards.

User request: "${topic}"

Each flashcard MUST be formatted exactly like this:

Q: [clear and concise question]
A: [accurate, concise and educational answer]

Continue this pattern for ${totalCards} flashcards.
Do NOT add numbering, bullet points, or extra text before or after the cards.
Just output the ${totalCards} Q/A pairs in that format.
`;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const generatedText = data.candidates[0].content.parts[0].text;
      const allFlashcards = parseFlashcards(generatedText);

      res.json({
        success: true,
        flashcards: allFlashcards,
        totalGenerated: allFlashcards.length,
      });
    } else {
      throw new Error("Invalid response from Gemini API");
    }
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

function parseFlashcards(text) {
  const flashcards = [];
  const lines = text.split("\n");
  let currentQuestion = "";
  let currentAnswer = "";
  let foundFirstCard = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("Q:") || trimmedLine.startsWith("Question:")) {
      if (currentQuestion && currentAnswer && foundFirstCard) {
        flashcards.push({
          front: currentQuestion.trim(),
          back: currentAnswer.trim(),
        });
      }

      currentQuestion = trimmedLine.replace(/^(Q:|Question:)\s*/, "");
      currentAnswer = "";
      foundFirstCard = true;
    } else if (
      (trimmedLine.startsWith("A:") || trimmedLine.startsWith("Answer:")) &&
      foundFirstCard
    ) {
      currentAnswer = trimmedLine.replace(/^(A:|Answer:)\s*/, "");
    } else if (
      foundFirstCard &&
      trimmedLine &&
      !trimmedLine.startsWith("---")
    ) {
      if (currentAnswer) {
        currentAnswer += " " + trimmedLine;
      } else if (currentQuestion) {
        currentQuestion += " " + trimmedLine;
      }
    }
  }

  if (currentQuestion && currentAnswer && foundFirstCard) {
    flashcards.push({
      front: currentQuestion.trim(),
      back: currentAnswer.trim(),
    });
  }

  console.log("Server parsed", flashcards.length, "flashcards");
  return flashcards;
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
