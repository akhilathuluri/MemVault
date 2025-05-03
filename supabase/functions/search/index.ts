import { GoogleGenerativeAI } from "@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, context } = await req.json();
    const parsedContext = JSON.parse(context);
    
    if (!query) {
      throw new Error("Query is required");
    }

    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY") || "");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const enhancedPrompt = `
      As an AI assistant for MemVault, analyze the following context and user query:

      User Query: "${query}"

      Available Data:
      - ${parsedContext.totalResults} total items found
      - ${parsedContext.memories.length} memories
      - ${parsedContext.files.length} files

      Context Details:
      ${JSON.stringify(parsedContext, null, 2)}

      Provide a helpful response that:
      1. Summarizes the most relevant findings
      2. Points out any patterns or connections between items
      3. Suggests related content the user might be interested in
      4. Offers specific locations or categories where relevant items can be found
      5. Provides smart recommendations based on the user's search history and content

      Format the response in a clear, concise manner with sections:
      - Summary
      - Key Findings
      - Related Content
      - Smart Suggestions

      Keep the overall response focused and actionable.
    `;

    const result = await model.generateContent(enhancedPrompt);
    const response = result.response.text();

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});