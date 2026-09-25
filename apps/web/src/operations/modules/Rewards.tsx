import { buyReward } from "../domain";
import { Field, text, uid, type Props } from "../module-ui";
export default function Rewards({ state, update, safely }: Props) {
  return (
    <section>
      <h2>Optional rewards</h2>
      <label>
        <input
          type="checkbox"
          checked={state.settings.gamification}
          onChange={() =>
            safely(() =>
              update((s) => ({
                ...s,
                settings: {
                  ...s.settings,
                  gamification: !s.settings.gamification,
                },
              })),
            )
          }
        />
        Enable task rewards
      </label>
      <p>
        Wallet: {state.rewards.reduce((n, r) => n + r.coins, 0)} coins. Coins
        are unrelated to the budget. Completed tasks are rewarded at most once.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = e.currentTarget,
            d = new FormData(f);
          safely(async () => {
            await update((s) => ({
              ...s,
              shop: [
                ...s.shop,
                {
                  id: uid(),
                  title: text(d, "title"),
                  cost: Number(text(d, "cost")),
                  cooldownDays: Number(text(d, "cooldown")),
                  lastDate: null,
                },
              ],
            }));
            f.reset();
          });
        }}
      >
        <Field label="Reward name">
          <input name="title" required />
        </Field>
        <Field label="Cost in coins">
          <input name="cost" type="number" min="1" required />
        </Field>
        <Field label="Cooldown days (zero allows repeat purchases)">
          <input name="cooldown" type="number" min="0" defaultValue="1" />
        </Field>
        <button>Add reward</button>
      </form>
      <ul>
        {state.shop.map((item) => (
          <li key={item.id}>
            {item.title}: {item.cost} coins{" "}
            <button
              disabled={!state.settings.gamification}
              onClick={() => safely(() => update((s) => buyReward(s, item.id)))}
            >
              Redeem {item.title}
            </button>
          </li>
        ))}
      </ul>
      <ul>
        {state.rewards
          .slice(-100)
          .reverse()
          .map((r) => (
            <li key={r.id}>
              {r.date}: {r.label}, {r.coins} coins
            </li>
          ))}
      </ul>
    </section>
  );
}
