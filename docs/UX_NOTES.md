# UX notes from the Mobile Game UX Handbook (v1.2)

This is a digest of the handbook the user shared (2026-10-10). Four readers split its twelve documents and pulled out what applies to Nico's City. The handbook itself is not in this repo. Section numbers point back into it.

## Rules we're applying to v2 (the business loop)
- **One new thing at a time.** Each system arrives after the last one is understood: units, then the workbench, then the build, the test, the sale, then Appraiser. Appraiser unlocks after 3 units. It arrives after a unit, not during a build or test, so it is never piled on the prototype moment. (03 §6–8)
- **One goal on screen.** A single goal chip says what to do next. It is not a task list. (02 §9, §19; 06 §14)
- **No unseen losses.** Before buying, show the price, a value range and a peek inside. The first visit offers only the starter unit, which always makes a profit and contains wheels for the car. (02 §11; handoff §5)
- **Costly taps are protected.** Buying a unit takes a second "Buy it" tap. Closing a card never spends money. A button works once (the card closes on the first tap), so a double-tap can't charge twice. (01 §2.1, §6.1; 10 §9)
- **Drag and snap** (01 §6; 04 §4; 11 §5):
  - the part lifts above the finger with a shadow on touch-down, so the finger doesn't hide it;
  - the matching slot glows;
  - a part snaps when dropped within about a slot's width;
  - a wrong drop slides the part back, with nothing used up.
- **Soft, funny failure.** A ramp run that falls short wobbles to a stop with a "boing", says why ("try a higher ramp"), and offers a one-tap retry. Nothing is lost. (06 §5; 04 §11; 11 §19)
- **Response chain.** Acknowledge every touch within about 100–200 ms. Big moments (the first car passing the test, the first sale) get a stronger tier than routine coins. (11 §2–3, §16)
- **Ritual, not bureaucracy.** The first build is hands-on. Repeat builds use a short tap routine, and finds can be sold in one go ("Sell all"). (02 §14; 06 §4.1; handoff §6)
- **The world shows progress.** Toy cars Nico sells appear in the toy shop's window. (02 §5–6; 06 §9)
- **Never colour or sound alone.** Every sound has a visual partner, so the game works muted. (01 §13; 09 §2, §8)

## Later, not now
- A reduced-motion setting (09 §7, §10) and an accessibility pass with larger text and one hand.
- Coins that fly to the money counter (11, recipe d).
- A townsperson who asks for a toy car (06 §12).
- The update pop-up saying what changed (10 §10).
- Thumb conflict between the stick and the action button (01 §12): watch for it in playtests.

## Playtesting with Nico (08)
Our evidence so far is "passes scripted interaction tests". Only Nico's own sessions count as "observed with one 12-year-old".

- **Three-second test.** Show a screen and ask: where are you, what can you do, what's next?
- **No-help run.** Don't explain unless he's stuck. Note his first touch, hesitations, repeated taps and moments of delight.
- **v2 tasks:**
  1. Buy a storage unit with no hints.
  2. Is the money clear before and after?
  3. Build and test the car. Does a failed run feel funny and easy to retry?
  4. Sell it. Did the money match what was shown?
  5. Close the app mid-build, reopen it, and check progress is intact.
  6. Double-tap Buy and Sell, and check the money only changes once.
- **Afterwards, open questions:** "best moment?", "what would you do next?" Write his answers down word for word.
