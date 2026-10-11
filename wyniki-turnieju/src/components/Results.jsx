
import { useState, useEffect, Fragment } from "react";
import "../styles/Results.css";

const Results = () => {
  const [group, setGroup] = useState("podstawowa");
  const [resultsPodstawowa, setResultsPodstawowa] = useState({});
  const [resultsSredniozaawansowana, setResultsSredniozaawansowana] = useState({});
  const [resultsZaawansowana, setResultsZaawansowana] = useState({});
  const [playersPodstawowa, setPlayersPodstawowa] = useState([]);
  const [playersSredniozaawansowana, setPlayersSredniozaawansowana] = useState([]);
  const [playersZaawansowana, setPlayersZaawansowana] = useState([]);

  const MIGRATION_DATE = "2026-10-11";

  const punkty = {
    1: 100, 2: 94, 3: 89, 4: 84, 5: 80, 6: 76,
    7: 72, 8: 68, 9: 64, 10: 60, 11: 56, 12: 52,
    13: 48, 14: 44, 15: 40, 16: 36, 17: 33, 18: 30,
    19: 27, 20: 24, 21: 22, 22: 20, 23: 18, 24: 16,
    25: 14, 26: 12, 27: 10, 28: 8, 29: 6, 30: 5,
    31: 4, 32: 4, 33: 3, 34: 3, 35: 3, 36: 2,
    37: 2, 38: 2, 39: 2, 40: 2, 41: 1, 42: 1,
    43: 1, 44: 1, 45: 1, 46: 1, 47: 1, 48: 1,
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const responses = await Promise.all([
          fetch("/results-podstawowa.json"),
          fetch("/results-sredniozaawansowana.json"),
          fetch("/results-zaawansowana.json"),
          fetch("/players-podstawowa.json"),
          fetch("/players-sredniozaawansowana.json"),
          fetch("/players-zaawansowana.json"),
        ]);

        if (responses.some((response) => !response.ok)) {
          throw new Error("Nie udało się pobrać jednego z plików JSON");
        }

        const [
          podstawowaResults,
          sredniozaawansowanaResults,
          zaawansowanaResults,
          podstawowaPlayers,
          sredniozaawansowanaPlayers,
          zaawansowanaPlayers,
        ] = await Promise.all(responses.map((response) => response.json()));

        setResultsPodstawowa(podstawowaResults || {});
        setResultsSredniozaawansowana(sredniozaawansowanaResults || {});
        setResultsZaawansowana(zaawansowanaResults || {});
        setPlayersPodstawowa(podstawowaPlayers || []);
        setPlayersSredniozaawansowana(sredniozaawansowanaPlayers || []);
        setPlayersZaawansowana(zaawansowanaPlayers || []);
      } catch (error) {
        console.error("Błąd podczas pobierania danych:", error);
      }
    };

    fetchData();
  }, []);

  const normalizeGroup = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (["podstawowa", "średniozaawansowana", "zaawansowana"].includes(normalized)) {
      return normalized;
    }
    return null;
  };

  const getDateOnly = (date) => date ? String(date).substring(0, 10) : null;

  const getGroupLabel = (playerGroup) => {
    const labels = {
      podstawowa: "Podstawowa",
      "średniozaawansowana": "Średniozaawansowana",
      zaawansowana: "Zaawansowana",
    };
    return labels[playerGroup] || "";
  };

  const allPlayersMap = new Map();

  const addPlayersToMap = (list, sourceGroup) => {
    list.forEach((player) => {
      const playerId = Number(player.id);
      if (!Number.isFinite(playerId)) return;

      const normalizedPlayer = {
        ...player,
        grupa: normalizeGroup(player.grupa) || sourceGroup,
      };

      const existing = allPlayersMap.get(playerId);
      if (!existing) {
        allPlayersMap.set(playerId, normalizedPlayer);
        return;
      }

      const existingDate = getDateOnly(existing.group_change_date);
      const newDate = getDateOnly(normalizedPlayer.group_change_date);

      if (newDate && (!existingDate || newDate > existingDate)) {
        allPlayersMap.set(playerId, normalizedPlayer);
      }
    });
  };

  addPlayersToMap(playersPodstawowa, "podstawowa");
  addPlayersToMap(playersSredniozaawansowana, "średniozaawansowana");
  addPlayersToMap(playersZaawansowana, "zaawansowana");

  const playersData = Array.from(allPlayersMap.values()).filter(
    (player) => normalizeGroup(player.grupa) === group
  );

  const dates = Array.from(new Set([
    ...Object.keys(resultsPodstawowa),
    ...Object.keys(resultsSredniozaawansowana),
    ...Object.keys(resultsZaawansowana),
  ]))
    .map(getDateOnly)
    .filter(Boolean)
    .sort();

  const getLegacyPreviousGroup = (currentGroup) => {
    if (currentGroup === "zaawansowana") return "podstawowa";
    if (currentGroup === "podstawowa") return "zaawansowana";
    return null;
  };

  const getPlayerTransitions = (player) => {
    const transitions = [];
    const currentGroup = normalizeGroup(player.grupa);
    const migrationPreviousGroup = normalizeGroup(player.zmiana_2_turniej);
    const normalChangeDate = getDateOnly(player.group_change_date);
    const normalChangeFrom = normalizeGroup(player.group_change_from);

    if (migrationPreviousGroup) {
      let migrationTarget = currentGroup;

      if (normalChangeDate && normalChangeDate > MIGRATION_DATE && normalChangeFrom) {
        migrationTarget = normalChangeFrom;
      }

      if (migrationTarget && migrationPreviousGroup !== migrationTarget) {
        transitions.push({
          date: MIGRATION_DATE,
          from: migrationPreviousGroup,
          to: migrationTarget,
        });
      }
    }

    if (normalChangeDate) {
      let afterGroup = currentGroup;

      if (migrationPreviousGroup && normalChangeDate < MIGRATION_DATE) {
        afterGroup = migrationPreviousGroup;
      }

      let beforeGroup = normalChangeFrom;
      if (!beforeGroup) beforeGroup = getLegacyPreviousGroup(afterGroup);

      if (beforeGroup && afterGroup && beforeGroup !== afterGroup) {
        transitions.push({
          date: normalChangeDate,
          from: beforeGroup,
          to: afterGroup,
        });
      }
    }

    return transitions.sort((a, b) => a.date.localeCompare(b.date));
  };

  const hasChangedGroup = (player) => Boolean(player.group_change_date);

  const getPlayerGroupForDate = (player, date) => {
    const tournamentDate = getDateOnly(date);
    let playerGroup = normalizeGroup(player.grupa);

    if (!tournamentDate || !playerGroup) return playerGroup;

    const transitions = getPlayerTransitions(player).sort(
      (a, b) => b.date.localeCompare(a.date)
    );

    transitions.forEach((transition) => {
      if (tournamentDate < transition.date) {
        playerGroup = transition.from;
      }
    });

    return playerGroup;
  };

  const getTransitionMultiplier = (fromGroup, toGroup) => {
    if (fromGroup === "podstawowa" && toGroup === "średniozaawansowana") return 0.7;
    if (fromGroup === "średniozaawansowana" && toGroup === "zaawansowana") return 0.7;
    if (fromGroup === "podstawowa" && toGroup === "zaawansowana") return 0.5;
    return 1;
  };

  const getPointsMultiplier = (player, date) => {
    const tournamentDate = getDateOnly(date);
    if (!tournamentDate) return 1;

    let multiplier = 1;

    getPlayerTransitions(player).forEach((transition) => {
      if (tournamentDate < transition.date) {
        multiplier *= getTransitionMultiplier(transition.from, transition.to);
      }
    });

    return multiplier;
  };

  const getResultsByGroup = (playerGroup) => {
    if (playerGroup === "podstawowa") return resultsPodstawowa;
    if (playerGroup === "średniozaawansowana") return resultsSredniozaawansowana;
    if (playerGroup === "zaawansowana") return resultsZaawansowana;
    return {};
  };

  const getResultsForDate = (playerGroup, date) => {
    if (!playerGroup) return [];

    const dateKey = getDateOnly(date);
    if (!dateKey) return [];

    const results = getResultsByGroup(playerGroup);

    if (Array.isArray(results[dateKey])) return results[dateKey];

    const matchingKey = Object.keys(results).find(
      (key) => getDateOnly(key) === dateKey
    );

    return matchingKey && Array.isArray(results[matchingKey])
      ? results[matchingKey]
      : [];
  };

  const getResultFromGroup = (playerId, date, playerGroup) => {
    const resultList = getResultsForDate(playerGroup, date);
    const numericPlayerId = Number(playerId);

    if (!Number.isFinite(numericPlayerId)) return null;

    return resultList.find((item) => {
      const resultPlayerId = item.zawodnik_id ?? item.player_id ?? item.id;

      if (resultPlayerId === null || resultPlayerId === undefined || resultPlayerId === "") {
        return false;
      }

      return Number(resultPlayerId) === numericPlayerId;
    }) || null;
  };

  const getPoints = (player, miejsce, date) => {
    const place = Number(miejsce);
    if (!Number.isFinite(place)) return 0;

    const normalPoints = punkty[place] || 0;
    return Math.ceil(normalPoints * getPointsMultiplier(player, date));
  };

  const getChangeDescription = (player) => {
    return getPlayerTransitions(player)
      .map((transition) =>
        `${getGroupLabel(transition.from)} → ${getGroupLabel(transition.to)} od ${transition.date}`
      )
      .join(" | ");
  };

  const players = playersData
    .map((player) => {
      const playerResults = {};
      const tournamentResults = [];

      dates.forEach((date) => {
        const playerGroup = getPlayerGroupForDate(player, date);
        if (!playerGroup) return;

        const result = getResultFromGroup(player.id, date, playerGroup);

        if (!result) {
          tournamentResults.push({
            date,
            miejsce: null,
            punkty: 0,
            grupa: playerGroup,
            multiplier: 1,
            reduced: false,
            absent: true,
          });
          return;
        }

        const multiplier = getPointsMultiplier(player, date);

        tournamentResults.push({
          date,
          miejsce: Number(result.miejsce),
          punkty: getPoints(player, result.miejsce, date),
          grupa: playerGroup,
          multiplier,
          reduced: multiplier < 1,
          absent: false,
        });
      });

      let worstTournamentIndex = -1;

      if (tournamentResults.length >= 2) {
        let lowestPoints = Infinity;

        tournamentResults.forEach((tournament, index) => {
          if (tournament.punkty < lowestPoints) {
            lowestPoints = tournament.punkty;
            worstTournamentIndex = index;
          }
        });
      }

      let totalPoints = 0;

      tournamentResults.forEach((tournament, index) => {
        const excluded = index === worstTournamentIndex;

        playerResults[tournament.date] = {
          ...tournament,
          excluded,
        };

        if (!excluded) totalPoints += tournament.punkty;
      });

      return {
        ...player,
        results: playerResults,
        totalPoints,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || Number(a.id) - Number(b.id));

  return (
    <div className="results">
      <div className="tournament-header">
        <h1>Grupa {getGroupLabel(group)}</h1>
        <div className="tournament-buttons">
          <button
            className={group === "podstawowa" ? "active" : ""}
            onClick={() => setGroup("podstawowa")}
          >
            Grupa Podstawowa
          </button>
          <button
            className={group === "średniozaawansowana" ? "active" : ""}
            onClick={() => setGroup("średniozaawansowana")}
          >
            Grupa Średniozaawansowana
          </button>
          <button
            className={group === "zaawansowana" ? "active" : ""}
            onClick={() => setGroup("zaawansowana")}
          >
            Grupa Zaawansowana
          </button>
        </div>
      </div>

      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th className="place-column" rowSpan="2">#</th>
              <th className="player-column" rowSpan="2">Zawodnik</th>
              <th className="points-column" rowSpan="2">Punkty</th>
              {dates.map((date) => (
                <th key={date} className="date-header" colSpan="2">{date}</th>
              ))}
            </tr>
            <tr>
              {dates.map((date) => (
                <Fragment key={date}>
                  <th className="place-column">Miejsce</th>
                  <th className="points-column">Pkt.</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.length > 0 ? (
              players.map((player, index) => {
                const changed = hasChangedGroup(player);

                return (
                  <tr
                    key={player.id}
                    className={changed ? "player-changed-group" : ""}
                  >
                    <td className="position">{index + 1}</td>
                    <td className="player-name">
                      {player.fname} {player.lname}
                      {changed && (
                        <span className="group-change" title={getChangeDescription(player)}>
                          {" "}🔄
                        </span>
                      )}
                    </td>
                    <td className="total-points">{player.totalPoints}</td>
                    {dates.map((date) => {
                      const result = player.results[date];

                      return (
                        <Fragment key={date}>
                          <td className="place">
                            {result ? (
                              result.absent ? (
                                <span style={{ opacity: 0.5 }} title="Nieobecność">—</span>
                              ) : (
                                <span
                                  style={result.excluded ? {
                                    textDecoration: "line-through",
                                    opacity: 0.55,
                                  } : {}}
                                >
                                  {result.miejsce}
                                </span>
                              )
                            ) : ""}
                          </td>
                          <td
                            className="place-points"
                            title={
                              result?.absent
                                ? "Nieobecność — 0 punktów"
                                : result?.excluded
                                  ? "Najgorszy wynik — nie jest liczony do wyniku ogólnego"
                                  : result?.reduced
                                    ? `Punkty przeliczone × ${result.multiplier}`
                                    : ""
                            }
                          >
                            {result ? (
                              <>
                                <span
                                  style={result.excluded ? {
                                    textDecoration: "line-through",
                                    opacity: 0.55,
                                  } : {}}
                                >
                                  {result.punkty}
                                </span>
                                {result.reduced && (
                                  <span
                                    className="halved-points"
                                    title={`Punkty przeliczone × ${result.multiplier}`}
                                  >
                                    *
                                  </span>
                                )}
                                {result.excluded && (
                                  <span
                                    className="excluded-result"
                                    style={{ marginLeft: "5px" }}
                                    title="Ten wynik nie jest liczony do klasyfikacji generalnej"
                                  >
                                    ✕
                                  </span>
                                )}
                              </>
                            ) : ""}
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={dates.length * 2 + 3} className="no-results">
                  Brak wyników
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="results-legend">
        <div>🔄 Zawodnik zmienił grupę</div>
        <div>* Podstawowa → Średniozaawansowana: wcześniejsze punkty × 70%</div>
        <div>* Średniozaawansowana → Zaawansowana: wcześniejsze punkty × 70%</div>
        <div>* Podstawowa → Zaawansowana: wcześniejsze punkty × 50%</div>
        <div>Zmiana do niższej grupy: wcześniejsze punkty pozostają bez zmian</div>
        <div>✕ Jeden najgorszy wynik nie jest liczony do wyniku ogólnego</div>
        <div>— Nieobecność = 0 punktów, najgorszy wynik</div>
      </div>
    </div>
  );
};

export default Results;
