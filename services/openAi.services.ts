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

export async function generateActionPlan(notes: any[]) {
  const notesContext = notes
    .map((note) => `Title: ${note.title}\nContent: ${note.content}`)
    .join("\n\n");

  const prompt = `Based on the following notes, create a structured action plan with timeline:

${notesContext}

Please create a detailed action plan that:
1. Identifies key tasks and priorities
2. Suggests a realistic timeline for completion
3. Groups related tasks together
4. Highlights any dependencies between tasks
5. Provides estimated time requirements

Format the response as a structured plan with clear sections for immediate actions (next 7 days), short-term goals (next 30 days), and longer-term objectives. Be very to the point.`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o-mini", // Using the specified 4.0 model
  });
  return completion.choices[0].message.content;
}
