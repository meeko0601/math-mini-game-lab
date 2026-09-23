import { el, visual } from "./dom.js";

export function characterPortrait(character, expression = "smile", className = "character-portrait") {
  const image = character?.expressions?.[expression]
    ?? character?.expressions?.smile
    ?? character?.idle;

  return visual(image, "🕵️‍♀️", className);
}

export function createCharacterPrompt(cast = [], text) {
  const [speaker, partner] = cast;

  return el("div", { className: "character-prompt" }, [
    el("div", {
      className: "character-prompt__cast",
      ariaLabel: [speaker?.name, partner?.name].filter(Boolean).join("と"),
    }, [
      characterPortrait(speaker, "thinking", "character-prompt__portrait character-prompt__portrait--speaker"),
      characterPortrait(partner, "smile", "character-prompt__portrait character-prompt__portrait--partner"),
    ]),
    el("div", { className: "speech-bubble" }, [
      speaker?.name ? el("small", { text: speaker.name }) : null,
      el("h2", { text }),
    ]),
  ]);
}

export function createHomeCast(characters = []) {
  return el("div", {
    className: "home-cast",
    ariaLabel: characters.map((character) => character.name).join("、"),
  }, characters.map((character, index) =>
    characterPortrait(
      character,
      "smile",
      `home-cast__portrait home-cast__portrait--${index + 1}`,
    ),
  ));
}

export function createFeedbackCast(cast = [], type = "success") {
  const [speaker, partner] = cast;
  const speakerExpression = type === "success" ? "joy" : "sad";
  const partnerExpression = type === "success" ? "joy" : "smile";

  return el("div", {
    className: `feedback-cast feedback-cast--${type}`,
    ariaLabel: [speaker?.name, partner?.name].filter(Boolean).join("と"),
  }, [
    characterPortrait(speaker, speakerExpression, "feedback-cast__portrait feedback-cast__portrait--speaker"),
    characterPortrait(partner, partnerExpression, "feedback-cast__portrait feedback-cast__portrait--partner"),
  ]);
}
