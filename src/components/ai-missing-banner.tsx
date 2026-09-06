export function AiMissingBanner() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">חסר מפתח AI — שיוך ידני</p>
      <p className="mt-1 text-amber-900/80">
        לא הוגדר `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` או `OPENAI_API_KEY`. אפשר לשייך כרטיס ידנית כמו קודם.
      </p>
    </div>
  );
}
