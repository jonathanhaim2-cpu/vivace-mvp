export function AiMissingBanner() {
  return (
    <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm">
      <p className="font-medium text-foreground">חסר מפתח AI — שיוך ידני</p>
      <p className="mt-1 text-muted-foreground">
        לא הוגדר `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` או `OPENAI_API_KEY`. אפשר לשייך קטגוריה ידנית כמו קודם.
      </p>
    </div>
  );
}
