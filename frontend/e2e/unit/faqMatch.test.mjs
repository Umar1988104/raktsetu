import test from "node:test";
import assert from "node:assert/strict";
import { answerQuestion, suggestedQuestions, normalize } from "../../src/utils/faqMatch.js";
import { FAQ } from "../../src/data/faq.js";

const id = (q) => answerQuestion(q).entry?.id;

test("every FAQ question finds its own answer (English and Hindi)", () => {
  for (const e of FAQ) {
    assert.equal(id(e.q.en), e.id, `en: ${e.q.en}`);
    assert.equal(id(e.q.hi), e.id, `hi: ${e.q.hi}`);
  }
});
test("free-typed phrasings", () => {
  assert.equal(id("how do i sign out"), "logout");
  assert.equal(id("where is logout"), "logout");
  assert.equal(id("I want to donate blood"), "donate");
  assert.equal(id("can I donate again after 2 months"), "gap");
  assert.equal(id("who can see my number"), "phone-privacy");
  assert.equal(id("how to add my mother"), "family");
  assert.equal(id("download donation certificate"), "certificate");
  assert.equal(id("change language to hindi"), "language");
  assert.equal(id("what is sos"), "sos");
  assert.equal(id("लॉग आउट कैसे करें"), "logout");
  assert.equal(id("दाता कैसे बनूँ"), "donate");
});
test("light typo tolerance", () => {
  assert.equal(id("how to logot"), "logout");
  assert.equal(id("wat is sooss emergncy"), "sos");
  assert.equal(id("certifcate download"), "certificate");
  assert.equal(id("hospitl verificaton"), "hospital-verify");
});
test("gibberish and unrelated questions find nothing (never invents)", () => {
  for (const q of ["qwertyuiop", "asdf ghjk", "what is the weather today", "who won the cricket match", "bitcoin price", "", "   ", "???", "xyz abc 123"]) {
    assert.equal(answerQuestion(q).kind, "none", q);
  }
});
test("medical questions get the careful reply, not a made-up answer", () => {
  for (const q of ["can I donate if I have diabetes", "I took antibiotics medicine yesterday", "can i donate with fever", "मुझे बुखार है क्या दान कर सकता हूँ"]) {
    assert.equal(answerQuestion(q).kind, "medical", q);
  }
});
test("greetings", () => {
  assert.equal(answerQuestion("hello").kind, "greeting");
  assert.equal(answerQuestion("नमस्ते").kind, "greeting");
});
test("suggested chips all exist and normalize strips punctuation", () => {
  assert.equal(suggestedQuestions().length, 8);
  assert.equal(normalize("  Hello,   World!! "), "hello world");
});
