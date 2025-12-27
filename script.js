// INSTRUCTIONS:
// 1. Get a FREE Gemini API key from: https://makersuite.google.com/app/apikey
// 2. Replace "PUT_YOUR_GEMINI_API_KEY_HERE" below with your actual key
// 3. Your key should look like: "AIzaSyABC123..."
// 4. Save the file and refresh the page
//I am using the GEMINI 2.5 FLASH for the text generation u can use as u like

const AI_CONFIG = {
    //change this
    API_KEY: "PUT_YOUR_GEMINI_API_KEY_HERE",
    GEMINI_URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
};

const genButton = document.getElementById("generateButton");
const nextButton = document.getElementById("nextButton");
const prevButton = document.getElementById("prevButton");
const moreButton = document.getElementById("moreButton");
const input = document.querySelector("input");
const flashcardContainer = document.getElementById("flashcardContainer");

let flashcards = [];
let counter = 0;
let flipped = false;
let lastUserInput = "";

async function generateFlashcards(userInput) {
    const prompt = `
You are a flashcard generator.

Based on the following user request, create exactly 5 flashcards.

User request: "${userInput}"

Each flashcard MUST be formatted exactly like this:

Q: [clear and concise question]
A: [accurate,concise and educational answer]

Continue this pattern for 5 flashcards.
Do NOT add numbering, bullet points, or extra text before or after the cards.
Just output the 5 Q/A pairs in that format.
`;

    try {
        const response = await fetch(`${AI_CONFIG.GEMINI_URL}?key=${AI_CONFIG.API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Generation API error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Generation raw response:", data);

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const generatedText = data.candidates[0].content.parts[0].text;
            return parseFlashcardsFromResponse(generatedText);
        } else if (data.error) {
            console.error("Gemini API error (generation):", data.error);
            throw new Error(
                `Gemini generation error: ${data.error.message || "Unknown error"}`
            );
        } else {
            throw new Error("Invalid response format from Gemini API");
        }
    } catch (error) {
        console.error("Error generating flashcards:", error);
        throw error;
    }
}

function parseFlashcardsFromResponse(text) {
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
                    back: currentAnswer.trim()
                });
            }

            currentQuestion = trimmedLine.replace(/^(Q:|Question:)\s*/, "");
            currentAnswer = "";
            foundFirstCard = true;
        } else if (
            (trimmedLine.startsWith("A:") ||
                trimmedLine.startsWith("Answer:")) &&
            foundFirstCard
        ) {
            currentAnswer = trimmedLine.replace(/^(A:|Answer:)\s*/, "");
        } else if (foundFirstCard && trimmedLine && !trimmedLine.startsWith("---")) {
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
            back: currentAnswer.trim()
        });
    }

    console.log("Parsed flashcards:", flashcards);

    return flashcards;
}

function createFlashcardElement() {
    const flashcard = document.createElement("div");
    flashcard.className = "flashcard";

    const flashcardInner = document.createElement("div");
    flashcardInner.className = "flashcard-inner";

    const flashcardFront = document.createElement("div");
    flashcardFront.className = "flashcard-front";

    const flashcardBack = document.createElement("div");
    flashcardBack.className = "flashcard-back";

    flashcardInner.appendChild(flashcardFront);
    flashcardInner.appendChild(flashcardBack);
    flashcard.appendChild(flashcardInner);

    return { flashcard, flashcardFront, flashcardBack };
}

const { flashcard, flashcardFront, flashcardBack } = createFlashcardElement();
flashcardContainer.appendChild(flashcard);

function showFlashcard() {
    flashcardContainer.style.display = "block";

    if (counter >= 0 && counter < flashcards.length) {
        flashcardFront.textContent = flashcards[counter].front;
        flashcardBack.textContent = flashcards[counter].back;
        flashcard.classList.remove("flipped");
        flipped = false;
    }

    prevButton.classList.toggle("hidden", flashcards.length <= 1);
    nextButton.classList.toggle("hidden", flashcards.length <= 1);
    moreButton.classList.toggle("hidden", counter < flashcards.length - 1);

    prevButton.disabled = counter === 0;
    nextButton.disabled = counter === flashcards.length - 1;
}

function getFallbackFlashcards(topic) {
    return [
        {
            front: `What is the basic definition of ${topic}?`,
            back: `${topic} is a subject that involves studying specific concepts and principles.`
        },
        {
            front: `Why is ${topic} important?`,
            back: `Understanding ${topic} helps us solve real-world problems and advance knowledge.`
        },
        {
            front: `What are the key concepts in ${topic}?`,
            back: `Key concepts include fundamental theories, applications, and methodologies.`
        },
        {
            front: `Who are notable figures in ${topic}?`,
            back: `Many researchers and thinkers have contributed to the development of ${topic}.`
        },
        {
            front: `How is ${topic} applied today?`,
            back: `${topic} has applications in technology, research, education, and industry.`
        }
    ];
}

genButton.addEventListener("click", async () => {
    const userInput = input.value.trim();
    if (!userInput) {
        alert("Please enter a topic first!");
        return;
    }

    lastUserInput = userInput;
    genButton.disabled = true;
    genButton.textContent = "Generating...";

    try {
        flashcards = await generateFlashcards(userInput);
        counter = 0;

        if (flashcards.length > 0) {
            showFlashcard();
        } else {
            throw new Error("No flashcards generated");
        }
    } catch (error) {
        console.error("Generation error:", error);
        const topic = userInput.split(" ")[0] || "general";
        flashcards = getFallbackFlashcards(topic);
        counter = 0;
        showFlashcard();
        alert("Using demo flashcards. AI generation failed.");
    } finally {
        genButton.disabled = false;
        genButton.textContent = "Generate";
    }
});

flashcard.addEventListener("click", () => {
    flashcard.classList.toggle("flipped");
    flipped = !flipped;
});

nextButton.addEventListener("click", () => {
    if (counter < flashcards.length - 1 && !flipped) {
        counter++;
        showFlashcard();
    }
});

prevButton.addEventListener("click", () => {
    if (counter > 0 && !flipped) {
        counter--;
        showFlashcard();
    }
});

moreButton.addEventListener("click", async () => {
    if (!lastUserInput) {
        alert("Generate some flashcards first!");
        return;
    }

    moreButton.disabled = true;
    genButton.disabled = true;
    genButton.textContent = "Generating...";

    try {
        const newCards = await generateFlashcards(lastUserInput);

        if (newCards && newCards.length > 0) {
            const startIndex = flashcards.length;
            flashcards = flashcards.concat(newCards);
            counter = startIndex;
            showFlashcard();
        } else {
            alert("Couldn't generate more flashcards.");
        }
    } catch (error) {
        console.error("Error generating more flashcards:", error);
        alert("Error generating more flashcards.");
    } finally {
        moreButton.disabled = false;
        genButton.disabled = false;
        genButton.textContent = "Generate";
    }
});

console.log(`
Flashcard App Initialized!

To get started:
1. Get free Gemini API key: https://makersuite.google.com/app/apikey
2. Open script.js and replace "PUT_YOUR_GEMINI_API_KEY_HERE"
3. Refresh this page
`);