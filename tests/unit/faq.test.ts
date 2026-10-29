import { describe, expect, it } from "vitest";
import { matchFaq } from "@/lib/faq";

describe("matchFaq", () => {
  it.each([
    ["Is cash on delivery available?", "Which payment methods can I use?"],
    ["How do returns work?", "How do I start a return?"],
    ["return policy", "How long do I have to return something?"],
    ["When will I get my refund", "When will I get my money back?"],
    ["Which size should I buy?", "How does the size recommendation work?"],
    ["how long does delivery take to karachi", "How long does delivery take?"],
    ["I forgot my password", "I forgot my password"],
    ["how long do I have to return shoes", "How long do I have to return something?"],
  ])("answers %j", (question, expected) => {
    expect(matchFaq(question)?.q).toBe(expected);
  });

  it("stays quiet for product searches", () => {
    expect(matchFaq("navy linen shirt under 6000")).toBeNull();
    expect(matchFaq("wireless earbuds")).toBeNull();
  });
});
