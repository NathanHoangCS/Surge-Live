console.log("Surge Live UI loaded");
// API config for pulling live odds/events
const API_KEY = "PASTE_YOUR_ODDS_API_KEY";
const SPORTS = ["basketball_nba", "tennis_atp"]; // sports to request
const REGIONS = "us"; // odds region
const MARKETS = "h2h"; // head-to-head winner market

// Load saved app state (balance, bets, markets) from localStorage
let state = loadState();

// App boot sequence
init();

async function init() {
  // Try replacing demo markets with live API markets
  await hydrateMarketsFromApi();

  // Render UI whether API succeeds or fails
  render();
}

async function hydrateMarketsFromApi() {
  // If no real key yet, skip API and keep seed/demo markets
  if (!API_KEY || API_KEY.includes("PASTE_YOUR")) return;

  try {
    // Fetch all events for selected sports
    const events = await fetchLiveEvents();

    // Convert API events -> your internal market format
    if (events.length > 0) {
      state.markets = events.map(mapEventToMarket);
      saveState();
    }
  } catch (err) {
    // Fallback path: keep seed markets if API fails
    console.warn("Live feed failed, using seed markets.", err);
  }
}

async function fetchLiveEvents() {
  // One request per sport, then combine all results
  const requests = SPORTS.map((sport) =>
    fetch(
      `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=${REGIONS}&markets=${MARKETS}&oddsFormat=decimal`,
    ).then((res) => {
      if (!res.ok) throw new Error(`Failed ${sport}: ${res.status}`);
      return res.json();
    }),
  );

  const results = await Promise.all(requests);
  return results.flat();
}

function mapEventToMarket(event) {
  // Try grabbing the first bookmaker's h2h market
  const h2h = event.bookmakers?.[0]?.markets?.find((m) => m.key === "h2h");
  const outcomes = h2h?.outcomes || [];

  // Match API outcome prices to home/away teams
  const home = outcomes.find((o) => o.name === event.home_team);
  const away = outcomes.find((o) => o.name === event.away_team);

  // Return shape used by your app's betting UI
  return {
    id: event.id,
    category: event.sport_title || "Sports",
    title: `${event.home_team} vs ${event.away_team}`,
    startsAt: new Date(event.commence_time).toLocaleString(),
    status: "open",
    options: [
      { id: `${event.id}-home`, label: event.home_team, odds: home?.price ?? 1.9 },
      { id: `${event.id}-away`, label: event.away_team, odds: away?.price ?? 1.9 }
    ],
    winningOptionId: null
  };
}
