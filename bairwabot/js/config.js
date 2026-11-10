/* BAIRWABOT – config.js : site-level settings (safe to edit). */
window.BB = window.BB || {};
BB.CONFIG = {
  /* Optional AI backend for open-ended questions.
     Leave empty to use the built-in knowledge base only.
     If set, the page POSTs JSON {question, language} to this URL and expects JSON {answer}.
     The URL must be YOUR OWN server-side proxy – never put an AI provider API key in this file. */
  AI_ENDPOINT: '',
  /* Speak the default greeting when the student presses "Enter the Lab". */
  AUTO_GREETING: true,
  /* Default speech language: 'en' or 'hi'. */
  LANGUAGE: 'en'
};
