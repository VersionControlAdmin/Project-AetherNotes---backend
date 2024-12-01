"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeNote = summarizeNote;
exports.generateActionPlan = generateActionPlan;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
function summarizeNote(title, content) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a concise note summarizer. Create brief, clear summaries.",
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
        }
        catch (error) {
            console.error("Error summarizing note:", error);
            throw new Error("Failed to summarize note");
        }
    });
}
function generateActionPlan(notes) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const completion = yield openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4o-mini", // Using the specified 4.0 model
        });
        return completion.choices[0].message.content;
    });
}
