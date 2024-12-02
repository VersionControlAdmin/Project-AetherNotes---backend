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
      model: "gpt-4o-mini",
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

export async function generateActionPlan(notes: any[]) {
  const notesContext = notes
    .map(({title, content}) => `Title: ${title}\nContent: ${content}`)
    .join("\n\n");

  const prompt = `Create a concise action plan from these notes:\n\n${notesContext}\n\n
Format as:
- Next 7 days: [tasks with time estimates]
- Next 30 days: [tasks with dependencies]
- Long-term: [key objectives]
Be brief and specific.`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o-mini",
    max_tokens: 500,
    temperature: 0.7,
  });
  
  return completion.choices[0].message.content;
}
