import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function summarizeNote(
  title: string,
  content: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a concise note summarizer. Create brief, clear summaries.",
        },
        {
          role: "user",
          content: `Note Title: ${title}\nNote Content: ${content}\n\nProvide a concise summary in 2-3 sentences of the provided note. Be very to the point and easy to understand.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 150,
    });

    return response.choices[0].message.content || "Unable to generate summary";
  } catch (error) {
    console.error("Error summarizing note:", error);
    throw new Error("Failed to summarize note");
  }
}
