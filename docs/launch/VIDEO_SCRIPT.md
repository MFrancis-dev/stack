# Demo video script (K11.1)

About 90 seconds. Screen recording of the hosted demo (https://stack-savings.vercel.app) at desktop width, with a voiceover. No intro slides, no architecture: one saver, one complete moment. Record at 1080p; captions burned in help on X, where most people watch muted.

| Time | Screen | Voiceover |
|---|---|---|
| 0:00–0:08 | Landing page, the coin stack drops in | "If you save in Bitcoin every week, an exchange can freeze you, and small buys lose a lot to fees." |
| 0:08–0:20 | Scroll to **Fees, checked every week**. Drag the amount from $100 down to $30 | "Stack checks the fee before every buy. A $100 Bitcoin buy costs about 1.75%. At $30 it's over my 3% limit, so that week is skipped and nothing is spent." |
| 0:20–0:28 | Press **Try it with example data** → **Open the demo** | "Here's a saver with four weeks of history. No wallet, no money." |
| 0:28–0:40 | Overview: the stack, $996.70 ready, the plan | "Three buys arrived in their own Bitcoin wallet. One week was skipped: fees spiked." |
| 0:40–0:55 | **Add funds** → SOL on Solana, 2 → **Preview** → **Get deposit address**; status moves to Done | "I fund the vault from SOL on Solana. NEAR Intents turns it into dollars in my vault. No bridge, no exchange account." |
| 0:55–1:08 | Press **Fast-forward 30 days**, then **History** with the skipped row and **Download CSV** | "A month later the plan has kept buying on its own. Every skip says why, and the CSV is ready for my accountant." |
| 1:08–1:20 | Press **Pause**, then show README's "Safety model" section | "Pause is one tap. The limits live in my vault's contract on NEAR: one buy per period, never more than my amount, and only I can withdraw or change where coins go." |
| 1:20–1:30 | Landing page footer, then the GitHub repo | "Stack. Built at NEAR HACKATHON. Try the demo and tell me what fee limit you'd set." |

## Shot list
- Clear browser profile, zoom 100%, hide bookmarks bar.
- Start the demo fresh just before recording so the dates are recent (the banner's **Start over** resets it).
- If NEAR Intents is unreachable, the estimates come from the calibrated fee model; the numbers are the same shape, so recording still works.
