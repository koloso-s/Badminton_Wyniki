import { useState, useEffect, Fragment } from "react";
import "../styles/Results.css";

const Results = () => {
    const [group, setGroup] = useState("podstawowa");

    const [resultsPodstawowa, setResultsPodstawowa] = useState({});
    const [resultsZaawansowana, setResultsZaawansowana] = useState({});

    const [playersPodstawowa, setPlayersPodstawowa] = useState([]);
    const [playersZaawansowana, setPlayersZaawansowana] = useState([]);

const punkty = {
    1: 100,
    2: 94,
    3: 89,
    4: 84,
    5: 80,
    6: 76,
    7: 72,
    8: 68,
    9: 64,
    10: 60,
    11: 56,
    12: 52,
    13: 48,
    14: 44,
    15: 40,
    16: 36,
    17: 33,
    18: 30,
    19: 27,
    20: 24,
    21: 22,
    22: 20,
    23: 18,
    24: 16,
    25: 14,
    26: 12,
    27: 10,
    28: 8,
    29: 6,
    30: 5,
    31: 4,
    32: 4,
    33: 3,
    34: 3,
    35: 3,
    36: 2,
    37: 2,
    38: 2,
    39: 2,
    40: 2,
    41: 1,
    42: 1,
    43: 1,
    44: 1,
    45: 1,
    46: 1,
    47: 1,
    48: 1,
  };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [
                    podstawowaResultsResponse,
                    zaawansowanaResultsResponse,
                    podstawowaPlayersResponse,
                    zaawansowanaPlayersResponse,
                ] = await Promise.all([
                    fetch("/results-podstawowa.json"),
                    fetch("/results-zaawansowana.json"),
                    fetch("/players-podstawowa.json"),
                    fetch("/players-zaawansowana.json"),
                ]);

                if (
                    !podstawowaResultsResponse.ok ||
                    !zaawansowanaResultsResponse.ok ||
                    !podstawowaPlayersResponse.ok ||
                    !zaawansowanaPlayersResponse.ok
                ) {
                    throw new Error(
                        "Nie udało się pobrać jednego z plików JSON"
                    );
                }

                const [
                    podstawowaResults,
                    zaawansowanaResults,
                    podstawowaPlayers,
                    zaawansowanaPlayers,
                ] = await Promise.all([
                    podstawowaResultsResponse.json(),
                    zaawansowanaResultsResponse.json(),
                    podstawowaPlayersResponse.json(),
                    zaawansowanaPlayersResponse.json(),
                ]);

                setResultsPodstawowa(podstawowaResults || {});
                setResultsZaawansowana(zaawansowanaResults || {});

                setPlayersPodstawowa(podstawowaPlayers || []);
                setPlayersZaawansowana(zaawansowanaPlayers || []);
            } catch (error) {
                console.error(
                    "Błąd podczas pobierania danych z JSON:",
                    error
                );
            }
        };

        fetchData();
    }, []);

    const normalizeGroup = (value) => {
        const normalized = String(value || "")
            .trim()
            .toLowerCase();

        if (
            normalized === "podstawowa" ||
            normalized === "zaawansowana"
        ) {
            return normalized;
        }

        return null;
    };

    const getDateOnly = (date) => {
        if (!date) {
            return null;
        }

        return String(date).substring(0, 10);
    };

    const allPlayersMap = new Map();

    const addPlayersToMap = (
        list,
        sourceGroup
    ) => {
        list.forEach((player) => {
            const playerId = Number(player.id);

            if (!Number.isFinite(playerId)) {
                return;
            }

            const normalizedPlayer = {
                ...player,

                grupa:
                    normalizeGroup(player.grupa) ||
                    sourceGroup,
            };

            const existing =
                allPlayersMap.get(playerId);

            if (!existing) {
                allPlayersMap.set(
                    playerId,
                    normalizedPlayer
                );

                return;
            }

            const existingChangeDate =
                getDateOnly(
                    existing.group_change_date
                );

            const newChangeDate =
                getDateOnly(
                    normalizedPlayer.group_change_date
                );

            if (
                newChangeDate &&
                !existingChangeDate
            ) {
                allPlayersMap.set(
                    playerId,
                    normalizedPlayer
                );

                return;
            }

            if (
                newChangeDate &&
                existingChangeDate &&
                newChangeDate > existingChangeDate
            ) {
                allPlayersMap.set(
                    playerId,
                    normalizedPlayer
                );
            }
        });
    };

    addPlayersToMap(
        playersPodstawowa,
        "podstawowa"
    );

    addPlayersToMap(
        playersZaawansowana,
        "zaawansowana"
    );

    const playersData = Array.from(
        allPlayersMap.values()
    ).filter(
        (player) =>
            normalizeGroup(player.grupa) === group
    );

    const dates = Array.from(
        new Set([
            ...Object.keys(resultsPodstawowa),
            ...Object.keys(resultsZaawansowana),
        ])
    )
        .map(getDateOnly)
        .filter(Boolean)
        .sort();

    const hasChangedGroup = (player) => {
        return Boolean(
            player.group_change_date
        );
    };

    const getPreviousGroup = (
        currentGroup
    ) => {
        if (currentGroup === "podstawowa") {
            return "zaawansowana";
        }

        if (currentGroup === "zaawansowana") {
            return "podstawowa";
        }

        return null;
    };

    const getPlayerGroupForDate = (
        player,
        date
    ) => {
        const currentGroup =
            normalizeGroup(player.grupa);

        if (!currentGroup) {
            return null;
        }

        if (!hasChangedGroup(player)) {
            return currentGroup;
        }

        const tournamentDate =
            getDateOnly(date);

        const changeDate =
            getDateOnly(
                player.group_change_date
            );

        if (
            !tournamentDate ||
            !changeDate
        ) {
            return currentGroup;
        }

        if (tournamentDate < changeDate) {
            return getPreviousGroup(
                currentGroup
            );
        }

        return currentGroup;
    };

    const movedFromBasicToAdvanced = (
        player
    ) => {
        const currentGroup =
            normalizeGroup(player.grupa);

        return (
            hasChangedGroup(player) &&
            currentGroup === "zaawansowana"
        );
    };

    const shouldHalvePoints = (
        player,
        date
    ) => {
        if (
            !movedFromBasicToAdvanced(
                player
            )
        ) {
            return false;
        }

        const tournamentDate =
            getDateOnly(date);

        const changeDate =
            getDateOnly(
                player.group_change_date
            );

        if (
            !tournamentDate ||
            !changeDate
        ) {
            return false;
        }

        return tournamentDate < changeDate;
    };

    const getResultsForDate = (
        playerGroup,
        date
    ) => {
        if (!playerGroup) {
            return [];
        }

        const dateKey =
            getDateOnly(date);

        if (!dateKey) {
            return [];
        }

        const results =
            playerGroup === "podstawowa"
                ? resultsPodstawowa
                : resultsZaawansowana;

        if (
            Array.isArray(
                results[dateKey]
            )
        ) {
            return results[dateKey];
        }

        const matchingKey =
            Object.keys(results).find(
                (key) =>
                    getDateOnly(key) ===
                    dateKey
            );

        if (
            matchingKey &&
            Array.isArray(
                results[matchingKey]
            )
        ) {
            return results[
                matchingKey
            ];
        }

        return [];
    };

    const hasTournamentForGroup = (
        playerGroup,
        date
    ) => {
        if (!playerGroup) {
            return false;
        }

        const dateKey =
            getDateOnly(date);

        if (!dateKey) {
            return false;
        }

        const results =
            playerGroup === "podstawowa"
                ? resultsPodstawowa
                : resultsZaawansowana;

        return Object.keys(results).some(
            (key) =>
                getDateOnly(key) ===
                dateKey
        );
    };

    const getResultFromGroup = (
        playerId,
        date,
        playerGroup
    ) => {
        const resultList =
            getResultsForDate(
                playerGroup,
                date
            );

        const numericPlayerId =
            Number(playerId);

        if (
            !Number.isFinite(
                numericPlayerId
            )
        ) {
            return null;
        }

        return (
            resultList.find((item) => {
                const resultPlayerId =
                    item.zawodnik_id ??
                    item.player_id ??
                    item.id;

                if (
                    resultPlayerId === null ||
                    resultPlayerId === undefined ||
                    resultPlayerId === ""
                ) {
                    return false;
                }

                return (
                    Number(resultPlayerId) ===
                    numericPlayerId
                );
            }) || null
        );
    };

    const getPoints = (
        player,
        miejsce,
        date
    ) => {
        const place =
            Number(miejsce);

        if (!Number.isFinite(place)) {
            return 0;
        }

        const normalPoints =
            punkty[place] || 0;

        if (
            shouldHalvePoints(
                player,
                date
            )
        ) {

            return Math.ceil(
                normalPoints / 2
            );
        }

        return normalPoints;
    };

    const players = playersData
        .map((player) => {
            const playerResults = {};

            const tournamentResults = [];

            dates.forEach((date) => {
                const playerGroup =
                    getPlayerGroupForDate(
                        player,
                        date
                    );

                if (!playerGroup) {
                    return;
                }

                const tournamentExists =
                    hasTournamentForGroup(
                        playerGroup,
                        date
                    );

                if (!tournamentExists) {
                    return;
                }

                const result =
                    getResultFromGroup(
                        player.id,
                        date,
                        playerGroup
                    );

                if (!result) {
                    tournamentResults.push({
                        date,
                        miejsce: null,
                        punkty: 0,
                        grupa: playerGroup,
                        halved: false,
                        absent: true,
                    });

                    return;
                }

                const halved =
                    shouldHalvePoints(
                        player,
                        date
                    );

                const points =
                    getPoints(
                        player,
                        result.miejsce,
                        date
                    );

                tournamentResults.push({
                    date,

                    miejsce:
                        Number(
                            result.miejsce
                        ),

                    punkty:
                        points,

                    grupa:
                        playerGroup,

                    halved,

                    absent: false,
                });
            });

            let worstTournamentIndex = -1;

            if (
                tournamentResults.length >= 2
            ) {
                let lowestPoints = Infinity;

                tournamentResults.forEach(
                    (tournament, index) => {
                        if (
                            tournament.punkty <
                            lowestPoints
                        ) {
                            lowestPoints =
                                tournament.punkty;

                            worstTournamentIndex =
                                index;
                        }
                    }
                );
            }

            let totalPoints = 0;

            tournamentResults.forEach(
                (tournament, index) => {
                    const excluded =
                        index ===
                        worstTournamentIndex;

                    playerResults[
                        tournament.date
                    ] = {
                        miejsce:
                            tournament.miejsce,

                        punkty:
                            tournament.punkty,

                        grupa:
                            tournament.grupa,

                        halved:
                            tournament.halved,

                        absent:
                            tournament.absent,

                        excluded,
                    };

                    if (!excluded) {
                        totalPoints +=
                            tournament.punkty;
                    }
                }
            );

            return {
                ...player,

                results:
                    playerResults,

                totalPoints,
            };
        })

        .sort((a, b) => {
            if (
                b.totalPoints !==
                a.totalPoints
            ) {
                return (
                    b.totalPoints -
                    a.totalPoints
                );
            }

            return (
                Number(a.id) -
                Number(b.id)
            );
        });

    return (
        <div className="results">

            <div className="tournament-header">

                <h1>
                    Grupa{" "}
                    {group === "podstawowa"
                        ? "Podstawowa"
                        : "Zaawansowana"}
                </h1>

                <div className="tournament-buttons">

                    <button
                        className={
                            group === "podstawowa"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setGroup("podstawowa")
                        }
                    >
                        Grupa Podstawowa
                    </button>

                    <button
                        className={
                            group === "zaawansowana"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setGroup("zaawansowana")
                        }
                    >
                        Grupa Zaawansowana
                    </button>

                </div>



            </div>

            <div className="results-table-wrapper">

                <table className="results-table">

                    <thead>

                        <tr>

                            <th
                                className="place-column"
                                rowSpan="2"
                            >
                                #
                            </th>

                            <th
                                className="player-column"
                                rowSpan="2"
                            >
                                Zawodnik
                            </th>

                            <th
                                className="points-column"
                                rowSpan="2"
                            >
                                Punkty
                            </th>

                            {dates.map((date) => (
                                <th
                                    key={date}
                                    className="date-header"
                                    colSpan="2"
                                >
                                    {date}
                                </th>
                            ))}

                        </tr>

                        <tr>

                            {dates.map((date) => (
                                <Fragment key={date}>

                                    <th className="place-column">
                                        Miejsce
                                    </th>

                                    <th className="points-column">
                                        Pkt.
                                    </th>

                                </Fragment>
                            ))}

                        </tr>

                    </thead>

                    <tbody>

                        {players.length > 0 ? (

                            players.map(
                                (player, index) => {
                                    const changed =
                                        hasChangedGroup(
                                            player
                                        );

                                    const currentGroup =
                                        normalizeGroup(
                                            player.grupa
                                        );

                                    return (
                                        <tr
                                            key={player.id}
                                            className={
                                                changed
                                                    ? "player-changed-group"
                                                    : ""
                                            }
                                        >

                                            <td className="position">
                                                {index + 1}
                                            </td>

                                            <td className="player-name">

                                                {player.fname}{" "}
                                                {player.lname}

                                                {changed && (
                                                    <span
                                                        className="group-change"
                                                        title={
                                                            currentGroup ===
                                                                "zaawansowana"
                                                                ? `Zmiana: Podstawowa → Zaawansowana od ${getDateOnly(
                                                                    player.group_change_date
                                                                )}`
                                                                : `Zmiana: Zaawansowana → Podstawowa od ${getDateOnly(
                                                                    player.group_change_date
                                                                )}`
                                                        }
                                                    >
                                                        {" "}
                                                        🔄
                                                    </span>
                                                )}

                                            </td>

                                            <td className="total-points">
                                                {player.totalPoints}
                                            </td>

                                            {dates.map((date) => {
                                                const result =
                                                    player.results[
                                                    date
                                                    ];

                                                return (
                                                    <Fragment
                                                        key={date}
                                                    >

                                                        <td className="place">

                                                            {result ? (
                                                                result.absent ? (
                                                                    <span
                                                                        style={{
                                                                            opacity: 0.5,
                                                                        }}
                                                                        title="Nieobecność"
                                                                    >
                                                                        —
                                                                    </span>
                                                                ) : (
                                                                    <span
                                                                        style={
                                                                            result.excluded
                                                                                ? {
                                                                                    textDecoration:
                                                                                        "line-through",
                                                                                    opacity:
                                                                                        0.55,
                                                                                }
                                                                                : {}
                                                                        }
                                                                    >
                                                                        {
                                                                            result.miejsce
                                                                        }
                                                                    </span>
                                                                )
                                                            ) : (
                                                                ""
                                                            )}

                                                        </td>

                                                        <td
                                                            className="place-points"
                                                            title={
                                                                result?.absent
                                                                    ? "Nieobecność — 0 punktów"
                                                                    : result?.excluded
                                                                        ? "Najgorszy wynik — nie jest liczony do wyniku ogólnego"
                                                                        : result?.halved
                                                                            ? "50% punktów zdobytych wcześniej w grupie podstawowej"
                                                                            : ""
                                                            }
                                                        >

                                                            {result ? (
                                                                <>

                                                                    <span
                                                                        style={
                                                                            result.excluded
                                                                                ? {
                                                                                    textDecoration:
                                                                                        "line-through",
                                                                                    opacity:
                                                                                        0.55,
                                                                                }
                                                                                : {}
                                                                        }
                                                                    >
                                                                        {
                                                                            result.punkty
                                                                        }
                                                                    </span>

                                                                    {result.halved && (
                                                                        <span
                                                                            className="halved-points"
                                                                            title="Punkty podzielone przez 2 i zaokrąglone w górę"
                                                                        >
                                                                            *
                                                                        </span>
                                                                    )}

                                                                    {result.excluded && (
                                                                        <span
                                                                            className="excluded-result"
                                                                            style={{
                                                                                marginLeft:
                                                                                    "5px",
                                                                            }}
                                                                            title="Ten wynik nie jest liczony do klasyfikacji generalnej"
                                                                        >
                                                                            ✕
                                                                        </span>
                                                                    )}

                                                                </>
                                                            ) : (
                                                                ""
                                                            )}

                                                        </td>

                                                    </Fragment>
                                                );
                                            })}

                                        </tr>
                                    );
                                }
                            )

                        ) : (

                            <tr>

                                <td
                                    colSpan={
                                        dates.length * 2 +
                                        3
                                    }
                                    className="no-results"
                                >
                                    Brak wyników
                                </td>

                            </tr>

                        )}

                    </tbody>

                </table>

            </div>

            <div className="results-legend">

                <div>
                    🔄 Zawodnik zmienił grupę
                </div>

                <div>
                    * Podstawowa → Zaawansowana: wcześniejsze punkty z podstawowej są dzielone przez 2 i zaokrąglane w górę
                </div>

                <div>
                    Zaawansowana → Podstawowa: wszystkie punkty pozostają bez zmian
                </div>

                <div>
                    ✕ Jeden najgorszy wynik nie jest liczony do wyniku ogólnego
                </div>

                <div>
                    — Nieobecność = 0 punktów, najgorszy wynik
                </div>

            </div>

        </div>
    );
};

export default Results;