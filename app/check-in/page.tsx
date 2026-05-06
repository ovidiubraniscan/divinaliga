"use client";

import { useEffect, useRef, useState } from "react";
import NavBar from "@/components/NavBar";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/lib/supabase";

type Arrival = {
  name: string;
  ticket: string;
  positions: string[];
  captain: boolean;
  rating: number;
  arrivalTime: string;
};

type Team = {
  name: string;
  players: Arrival[];
  totalRating: number;
};

const validTickets = [
  "TCK-839201",
  "TCK-472915",
  "TCK-193847",
  "TCK-650284",
  "TCK-908173",
  "TCK-274659",
  "TCK-561902",
  "TCK-784320",
  "TCK-129875",
  "TCK-346781",
  "TCK-902134",
  "TCK-675489",
  "TCK-218903",
  "TCK-543210",
  "TCK-889761",
  "TCK-332198",
  "TCK-771245",
  "TCK-459872",
  "TCK-610394",
  "TCK-285617",
  "TCK-947302",
  "TCK-136580",
  "TCK-864209",
  "TCK-703418",
  "TCK-592731",
  "TCK-418659",
  "TCK-256904",
  "TCK-980143",
  "TCK-374628",
  "TCK-621759",
];

const positions = ["Goalkeeper", "Defender", "Midfield", "Attacker"];

export default function CheckInPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<string | null>(null);
  const [invalidMessage, setInvalidMessage] = useState("");
  const [manualTicketNumber, setManualTicketNumber] = useState("");

  const [playerName, setPlayerName] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [isCaptain, setIsCaptain] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);

  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const [playerToRemove, setPlayerToRemove] = useState<Arrival | null>(null);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);
  const [isRemovingPlayer, setIsRemovingPlayer] = useState(false);
  const [isClearingPlayers, setIsClearingPlayers] = useState(false);

  const [editingPlayer, setEditingPlayer] = useState<Arrival | null>(null);
  const [editName, setEditName] = useState("");
  const [editPositions, setEditPositions] = useState<string[]>([]);
  const [editCaptain, setEditCaptain] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const checkAdminStatus = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsAdmin(false);
      return;
    }

    const { data, error } = await supabase.rpc("is_admin");

    if (error) {
      setIsAdmin(false);
      setAdminMessage(error.message);
      return;
    }

    setIsAdmin(Boolean(data));
  };

  const adminLogin = async () => {
    setAdminMessage("");
    setAdminLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail.trim(),
      password: adminPassword,
    });

    if (error) {
      setAdminLoading(false);
      setAdminMessage(error.message);
      return;
    }

    await checkAdminStatus();
    setAdminPassword("");
    setAdminPanelOpen(false);
    setAdminLoading(false);
  };

  const adminLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setAdminEmail("");
    setAdminPassword("");
    setAdminPanelOpen(false);
    setAdminMessage("Admin logged out.");
  };

  const loadArrivals = async () => {
    const { data, error } = await supabase
      .from("check_ins")
      .select(
        "ticket_code, player_name, positions, captain, rating, arrival_time",
      )
      .order("arrival_time", { ascending: true });

    if (error) {
      setInvalidMessage(error.message);
      return;
    }

    const formatted: Arrival[] = (data || []).map((row) => ({
      name: row.player_name,
      ticket: row.ticket_code,
      positions: row.positions || [],
      captain: row.captain,
      rating: row.rating,
      arrivalTime: new Date(row.arrival_time).toLocaleString(),
    }));

    setArrivals(formatted);
  };

  useEffect(() => {
    loadArrivals();
    checkAdminStatus();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    return () => {
      stopScanner();
      authListener.subscription.unsubscribe();
    };
  }, []);

  const saveArrivals = (updated: Arrival[]) => {
    setArrivals(updated);
  };

  const resetForm = () => {
    setCurrentTicket(null);
    setPlayerName("");
    setSelectedPositions([]);
    setIsCaptain(false);
    setSelectedRating(0);
  };

  const validateTicket = async (ticket: string) => {
    setInvalidMessage("");

    const { data: ticketData, error: ticketError } = await supabase
      .from("tickets")
      .select("code, status")
      .eq("code", ticket)
      .maybeSingle();

    if (ticketError) {
      setInvalidMessage(ticketError.message);
      return;
    }

    if (!ticketData || ticketData.status !== "valid") {
      setInvalidMessage(`Invalid ticket: ${ticket}`);
      return;
    }

    const { data: existingCheckIn, error: checkInError } = await supabase
      .from("check_ins")
      .select("ticket_code")
      .eq("ticket_code", ticket)
      .maybeSingle();

    if (checkInError) {
      setInvalidMessage(checkInError.message);
      return;
    }

    if (existingCheckIn) {
      setInvalidMessage(`This ticket has already checked in: ${ticket}`);
      return;
    }

    await stopScanner();

    resetForm();
    setCurrentTicket(ticket);
  };

  const startScanner = async () => {
    setInvalidMessage("");
    setCurrentTicket(null);
    setScannerOpen(true);

    setTimeout(async () => {
      try {
        if (scannerRef.current) {
          try {
            await scannerRef.current.clear();
          } catch {}
        }

        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            await handleScanSuccess(decodedText);
          },
          () => {},
        );
      } catch {
        setInvalidMessage(
          "Camera could not start. Check browser camera permission and use HTTPS or localhost.",
        );
        setScannerOpen(false);
      }
    }, 150);
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;

    if (!scanner) {
      setScannerOpen(false);
      return;
    }

    try {
      const isScanning = scanner.getState && scanner.getState() === 2;

      if (isScanning) {
        await scanner.stop();
      }

      await scanner.clear();
    } catch {
      // ignore scanner cleanup errors
    }

    scannerRef.current = null;
    setScannerOpen(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    const ticket = decodedText.trim();
    await validateTicket(ticket);
  };

  const handleManualTicketSubmit = async () => {
    const cleanedNumber = manualTicketNumber.replace(/\D/g, "");

    if (!cleanedNumber) {
      setInvalidMessage("Please enter the ticket numbers.");
      return;
    }

    const ticket = `TCK-${cleanedNumber}`;

    await validateTicket(ticket);
    setManualTicketNumber("");
  };

  const togglePosition = (position: string) => {
    if (selectedPositions.includes(position)) {
      setSelectedPositions(
        selectedPositions.filter((item) => item !== position),
      );
    } else {
      setSelectedPositions([...selectedPositions, position]);
    }
  };

  const handleArrived = async () => {
    const name = playerName.trim();

    if (!currentTicket) {
      alert("Please scan or enter a valid ticket first.");
      return;
    }

    if (!name) {
      alert("Please insert the player's name.");
      return;
    }

    if (!selectedPositions.length) {
      alert("Please select at least one football position.");
      return;
    }

    if (!selectedRating) {
      alert("Please select a rating from 1 to 10.");
      return;
    }

    const { error } = await supabase.from("check_ins").insert({
      ticket_code: currentTicket,
      player_name: name,
      positions: selectedPositions,
      captain: isCaptain,
      rating: selectedRating,
    });

    if (error) {
      setInvalidMessage(error.message);
      return;
    }

    await loadArrivals();
    resetForm();
  };

  const openClearAllConfirm = () => {
    if (!isAdmin) {
      setInvalidMessage("Admin login required to clear players.");
      return;
    }

    setClearAllConfirmOpen(true);
  };

  const clearArrivals = async () => {
    if (!isAdmin) {
      setInvalidMessage("Admin login required to clear players.");
      return;
    }

    setIsClearingPlayers(true);

    const { error } = await supabase
      .from("check_ins")
      .delete()
      .neq("ticket_code", "");

    setIsClearingPlayers(false);

    if (error) {
      setInvalidMessage(error.message);
      return;
    }

    setClearAllConfirmOpen(false);
    setArrivals([]);
    setTeams([]);
  };

  const openEditPlayerModal = (player: Arrival) => {
    if (!isAdmin) {
      setInvalidMessage("Admin login required to edit players.");
      return;
    }

    setEditingPlayer(player);
    setEditName(player.name);
    setEditPositions(player.positions);
    setEditCaptain(player.captain);
    setEditRating(player.rating);
  };

  const closeEditPlayerModal = () => {
    setEditingPlayer(null);
    setEditName("");
    setEditPositions([]);
    setEditCaptain(false);
    setEditRating(0);
  };

  const toggleEditPosition = (position: string) => {
    if (editPositions.includes(position)) {
      setEditPositions(editPositions.filter((item) => item !== position));
    } else {
      setEditPositions([...editPositions, position]);
    }
  };

  const submitEditPlayer = async () => {
    if (!editingPlayer || !isAdmin) return;

    const cleanedName = editName.trim();

    if (!cleanedName) {
      setInvalidMessage("Player name cannot be empty.");
      return;
    }

    if (!editPositions.length) {
      setInvalidMessage("Please select at least one position.");
      return;
    }

    if (!editRating || editRating < 1 || editRating > 10) {
      setInvalidMessage("Rating must be from 1 to 10.");
      return;
    }

    setIsSavingEdit(true);

    const { error } = await supabase
      .from("check_ins")
      .update({
        player_name: cleanedName,
        positions: editPositions,
        captain: editCaptain,
        rating: editRating,
      })
      .eq("ticket_code", editingPlayer.ticket);

    setIsSavingEdit(false);

    if (error) {
      setInvalidMessage(error.message);
      return;
    }

    await loadArrivals();
    setTeams([]);
    closeEditPlayerModal();
  };

  const openRemovePlayerConfirm = (player: Arrival) => {
    if (!isAdmin) {
      setInvalidMessage("Admin login required to remove players.");
      return;
    }

    setPlayerToRemove(player);
  };

  const clearSinglePlayer = async () => {
    if (!playerToRemove || !isAdmin) return;

    setIsRemovingPlayer(true);

    const { error } = await supabase
      .from("check_ins")
      .delete()
      .eq("ticket_code", playerToRemove.ticket);

    setIsRemovingPlayer(false);

    if (error) {
      setInvalidMessage(error.message);
      return;
    }

    const updatedArrivals = arrivals.filter(
      (player) => player.ticket !== playerToRemove.ticket,
    );

    setPlayerToRemove(null);
    setArrivals(updatedArrivals);
    setTeams([]);
  };

  const ratingColour = (value: number) => {
    const hue = Math.round(((value - 1) * 120) / 9);
    return `hsl(${hue}, 90%, 52%)`;
  };

  const randomizeTeams = (teamCount: number) => {
    if (!isAdmin) {
      setInvalidMessage("Admin login required to create teams.");
      return;
    }

    if (arrivals.length < teamCount) {
      alert(`You need at least ${teamCount} checked-in players.`);
      return;
    }

    const shuffled = [...arrivals].sort(() => Math.random() - 0.5);
    const players = shuffled.sort((a, b) => b.rating - a.rating);

    const newTeams: Team[] = Array.from({ length: teamCount }, (_, index) => ({
      name: `Team ${index + 1}`,
      players: [],
      totalRating: 0,
    }));

    const captains = players.filter((player) => player.captain);
    const nonCaptains = players.filter((player) => !player.captain);
    const orderedPlayers = [...captains, ...nonCaptains];

    orderedPlayers.forEach((player) => {
      const bestTeam = newTeams
        .map((team) => ({
          team,
          score: teamBalanceScore(team, player),
        }))
        .sort((a, b) => a.score - b.score)[0].team;

      bestTeam.players.push(player);
      bestTeam.totalRating += Number(player.rating);
    });

    setTeams(newTeams);
  };

  const teamBalanceScore = (team: Team, player: Arrival) => {
    const sizePenalty = team.players.length * 12;
    const ratingPenalty = team.totalRating * 2;

    const positionPenalty = player.positions.some(
      (pos) => !team.players.some((p) => p.positions.includes(pos)),
    )
      ? -8
      : 4;

    const goalkeeperPenalty =
      player.positions.includes("Goalkeeper") &&
      !team.players.some((p) => p.positions.includes("Goalkeeper"))
        ? -15
        : 0;

    return sizePenalty + ratingPenalty + positionPenalty + goalkeeperPenalty;
  };
  const getTeamStyle = (index: number) => {
    if (index === 0) {
      return {
        name: "Red Team",
        card: redTeamCard,
        header: redTeamHeader,
        badge: redTeamBadge,
      };
    }

    if (index === 1) {
      return {
        name: "Blue Team",
        card: blueTeamCard,
        header: blueTeamHeader,
        badge: blueTeamBadge,
      };
    }

    return {
      name: "Lime Team",
      card: limeTeamCard,
      header: limeTeamHeader,
      badge: limeTeamBadge,
    };
  };

  const hasGoalkeeper = (player: Arrival) => {
    return player.positions.includes("Goalkeeper");
  };

  return (
    <>
      <NavBar />

      <main style={pageStyle}>
        <div style={{ maxWidth: "430px", margin: "0 auto" }}>
          <header style={{ textAlign: "center", marginBottom: "18px" }}>
            <p style={eyebrowStyle}>Divina Liga</p>
            <h1 style={titleStyle}>Match Check-In</h1>
            <p style={subtitleStyle}>
              Scan a ticket or enter the ticket code manually, confirm the
              player, then create balanced teams.
            </p>
          </header>

          <div style={adminFloatingWrap}>
            <button
              onClick={() => setAdminPanelOpen(!adminPanelOpen)}
              style={{
                ...adminFloatingButton,
                ...(isAdmin ? adminFloatingButtonActive : {}),
              }}
              title="Admin access"
            >
              {isAdmin ? "🔓" : "🔐"}
            </button>
          </div>

          {adminPanelOpen && (
            <section style={glassCard}>
              <div style={sectionHeader}>
                <div>
                  <h2 style={sectionTitle}>Admin Access</h2>
                  <p style={adminStatusText}>
                    {isAdmin
                      ? "Logged in as admin. Edit, remove, and clear controls are active."
                      : "Log in to unlock edit, remove, and clear controls."}
                  </p>
                </div>

                <button
                  onClick={() => setAdminPanelOpen(false)}
                  style={modalCloseButton}
                >
                  ×
                </button>
              </div>

              {isAdmin ? (
                <button onClick={adminLogout} style={adminLogoutButton}>
                  Logout Admin
                </button>
              ) : (
                <div style={adminLoginBox}>
                  <input
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="Admin email"
                    type="email"
                    style={inputStyle}
                  />

                  <input
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") adminLogin();
                    }}
                    placeholder="Admin password"
                    type="password"
                    style={inputStyle}
                  />

                  <button
                    onClick={adminLogin}
                    disabled={adminLoading}
                    style={adminLoginButton}
                  >
                    {adminLoading ? "Checking..." : "Admin Login"}
                  </button>
                </div>
              )}

              {adminMessage && <p style={adminMessageText}>{adminMessage}</p>}
            </section>
          )}

          <section style={glassCard}>
            <button onClick={startScanner} style={startButton}>
              START CHECK-IN
            </button>

            <div style={manualTicketBox}>
              <p style={labelText}>Enter ticket manually</p>

              <div style={manualTicketRow}>
                <div style={ticketPrefix}>TCK-</div>

                <input
                  value={manualTicketNumber}
                  onChange={(e) => {
                    const onlyNumbers = e.target.value.replace(/\D/g, "");
                    setManualTicketNumber(onlyNumbers);
                  }}
                  placeholder="839201"
                  inputMode="numeric"
                  style={manualTicketInput}
                />
              </div>

              <button
                onClick={handleManualTicketSubmit}
                style={manualTicketButton}
              >
                Check Ticket Code
              </button>
            </div>

            {scannerOpen && (
              <div style={{ marginTop: "14px" }}>
                <div id="reader" style={readerStyle}></div>

                <button onClick={stopScanner} style={secondaryButton}>
                  Stop Camera
                </button>
              </div>
            )}

            {currentTicket && (
              <div style={validTicketBox}>
                <div>
                  <p style={smallGreenText}>Valid Ticket</p>
                  <p style={{ fontSize: "22px", fontWeight: 900, margin: 0 }}>
                    {currentTicket}
                  </p>
                </div>

                <label style={labelStyle}>
                  <span style={labelText}>Insert name</span>
                  <input
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Player name"
                    style={inputStyle}
                  />
                </label>

                <div>
                  <p style={labelText}>Football position</p>

                  <div style={positionGrid}>
                    {positions.map((position) => {
                      const active = selectedPositions.includes(position);

                      return (
                        <button
                          key={position}
                          onClick={() => togglePosition(position)}
                          style={{
                            ...positionButton,
                            ...(active ? activePositionButton : {}),
                          }}
                        >
                          {position.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setIsCaptain(!isCaptain)}
                  style={{
                    ...captainButton,
                    ...(isCaptain ? activeCaptainButton : {}),
                  }}
                >
                  CAPTAIN
                </button>

                <div>
                  <div style={ratingHeader}>
                    <p style={labelText}>Rating</p>
                    <p style={{ margin: 0, fontWeight: 900 }}>
                      {selectedRating}/10
                    </p>
                  </div>

                  <div style={starsWrap}>
                    {Array.from({ length: 10 }, (_, index) => {
                      const value = index + 1;

                      return (
                        <button
                          key={value}
                          onClick={() => setSelectedRating(value)}
                          style={{
                            ...starButton,
                            color: ratingColour(value),
                            opacity: value <= selectedRating ? 1 : 0.25,
                          }}
                        >
                          ★
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button onClick={handleArrived} style={arrivedButton}>
                  I HAVE ARRIVED
                </button>
              </div>
            )}

            {invalidMessage && <div style={invalidBox}>{invalidMessage}</div>}
          </section>

          <section style={glassCard}>
            <div style={sectionHeader}>
              <h2 style={sectionTitle}>Arrived Players</h2>
              {isAdmin && (
                <button onClick={openClearAllConfirm} style={clearButton}>
                  Clear
                </button>
              )}
            </div>

            {arrivals.length === 0 ? (
              <p style={{ color: "#94A3B8" }}>No players checked in yet.</p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {arrivals.map((player) => (
                  <div key={player.ticket} style={arrivalCard}>
                    <div style={arrivalTop}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 900 }}>
                          {player.name}{" "}
                          {player.captain && (
                            <span style={{ color: "#FACC15" }}>(Captain)</span>
                          )}
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0",
                            color: "#94A3B8",
                            fontSize: "12px",
                          }}
                        >
                          {player.ticket}
                        </p>
                      </div>

                      <p style={ratingPill}>{player.rating}/10</p>
                    </div>

                    <p
                      style={{
                        margin: "10px 0 0",
                        color: "#CBD5E1",
                        fontSize: "13px",
                      }}
                    >
                      {player.positions.join(", ") || "No position selected"}
                    </p>

                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "#64748B",
                        fontSize: "12px",
                      }}
                    >
                      Arrived: {player.arrivalTime}
                    </p>
                    {isAdmin && (
                      <div style={adminPlayerActions}>
                        <button
                          onClick={() => openEditPlayerModal(player)}
                          style={editPlayerButton}
                        >
                          Edit Player
                        </button>

                        <button
                          onClick={() => openRemovePlayerConfirm(player)}
                          style={removePlayerButton}
                        >
                          Remove Player
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={glassCard}>
            <h2 style={sectionTitle}>Create Teams</h2>

            {isAdmin && (
              <div style={teamButtonsGrid}>
                <button onClick={() => randomizeTeams(2)} style={random2Button}>
                  CREATE 2 TEAMS (RED & BLUE)
                </button>

                <button onClick={() => randomizeTeams(3)} style={random3Button}>
                  CREATE 3 TEAMS
                </button>
              </div>
            )}

            {!isAdmin && teams.length === 0 && (
              <p style={{ margin: "10px 0 0", color: "#94A3B8", fontSize: "13px" }}>
                Teams will appear here after an admin creates them.
              </p>
            )}

            {teams.length > 0 && (
              <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
                {teams.map((team, index) => {
                  const average = team.players.length
                    ? (team.totalRating / team.players.length).toFixed(1)
                    : "0.0";

                  const teamStyle = getTeamStyle(index);

                  return (
                    <div key={team.name} style={teamStyle.card}>
                      <div style={teamStyle.header}>
                        <div>
                          <p style={teamLabel}>TEAM {index + 1}</p>
                          <h3 style={teamName}>{teamStyle.name}</h3>
                        </div>

                        <p style={teamStyle.badge}>Avg {average}/10</p>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gap: "8px",
                          marginTop: "14px",
                        }}
                      >
                        {team.players.map((player) => (
                          <div key={player.ticket} style={teamPlayerCard}>
                            <div style={arrivalTop}>
                              <div>
                                <p style={teamPlayerName}>
                                  {player.captain && (
                                    <span title="Captain">👑 </span>
                                  )}
                                  {hasGoalkeeper(player) && (
                                    <span title="Goalkeeper">🧤 </span>
                                  )}
                                  {player.name}
                                </p>

                                <p style={teamPlayerPositions}>
                                  {player.positions.join(", ")}
                                </p>
                              </div>

                              <p style={teamRatingPill}>{player.rating}/10</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {editingPlayer && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={sectionHeader}>
              <div>
                <p style={smallGreenText}>Admin Edit</p>
                <h2 style={sectionTitle}>{editingPlayer.ticket}</h2>
              </div>

              <button onClick={closeEditPlayerModal} style={modalCloseButton}>
                ×
              </button>
            </div>

            <div style={editModalBody}>
              <label style={labelStyle}>
                <span style={labelText}>Player name</span>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={inputStyle}
                />
              </label>

              <div>
                <p style={labelText}>Positions</p>
                <div style={positionGrid}>
                  {positions.map((position) => {
                    const active = editPositions.includes(position);

                    return (
                      <button
                        key={position}
                        onClick={() => toggleEditPosition(position)}
                        style={{
                          ...positionButton,
                          ...(active ? activePositionButton : {}),
                        }}
                      >
                        {position.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setEditCaptain(!editCaptain)}
                style={{
                  ...captainButton,
                  ...(editCaptain ? activeCaptainButton : {}),
                }}
              >
                CAPTAIN
              </button>

              <div>
                <div style={ratingHeader}>
                  <p style={labelText}>Rating</p>
                  <p style={{ margin: 0, fontWeight: 900 }}>{editRating}/10</p>
                </div>

                <div style={starsWrap}>
                  {Array.from({ length: 10 }, (_, index) => {
                    const value = index + 1;

                    return (
                      <button
                        key={value}
                        onClick={() => setEditRating(value)}
                        style={{
                          ...starButton,
                          color: ratingColour(value),
                          opacity: value <= editRating ? 1 : 0.25,
                        }}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={submitEditPlayer}
                disabled={isSavingEdit}
                style={arrivedButton}
              >
                {isSavingEdit ? "SAVING..." : "SUBMIT CHANGES"}
              </button>
            </div>
          </div>
        </div>
      )}

      {playerToRemove && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <p style={smallGreenText}>Confirm Remove</p>
            <h2 style={sectionTitle}>Remove {playerToRemove.name}?</h2>
            <p style={confirmText}>
              This will delete the player from the check-in list. The ticket can
              then be checked in again if needed.
            </p>

            <div style={confirmActions}>
              <button
                onClick={() => setPlayerToRemove(null)}
                disabled={isRemovingPlayer}
                style={confirmNoButton}
              >
                No
              </button>

              <button
                onClick={clearSinglePlayer}
                disabled={isRemovingPlayer}
                style={confirmYesButton}
              >
                {isRemovingPlayer ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {clearAllConfirmOpen && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <p style={smallGreenText}>Confirm Clear</p>
            <h2 style={sectionTitle}>Clear all players?</h2>
            <p style={confirmText}>
              This will remove every checked-in player and reset created teams.
            </p>

            <div style={confirmActions}>
              <button
                onClick={() => setClearAllConfirmOpen(false)}
                disabled={isClearingPlayers}
                style={confirmNoButton}
              >
                No
              </button>

              <button
                onClick={clearArrivals}
                disabled={isClearingPlayers}
                style={confirmYesButton}
              >
                {isClearingPlayers ? "Clearing..." : "Yes, Clear All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const adminFloatingWrap = {
  display: "flex",
  justifyContent: "flex-end",
  margin: "-2px 0 10px",
};

const adminFloatingButton = {
  width: "44px",
  height: "44px",
  borderRadius: "999px",
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(15, 23, 42, 0.82)",
  color: "#E2E8F0",
  fontSize: "20px",
  cursor: "pointer",
  boxShadow: "0 12px 35px rgba(0,0,0,0.3)",
};

const adminFloatingButtonActive = {
  border: "1px solid rgba(250, 204, 21, 0.6)",
  background: "rgba(250, 204, 21, 0.16)",
};

const adminStatusText = {
  margin: "6px 0 0",
  color: "#CBD5E1",
  fontSize: "13px",
  lineHeight: 1.45,
};

const adminLoginBox = {
  marginTop: "14px",
  display: "grid",
  gap: "10px",
};

const adminLoginButton = {
  width: "100%",
  border: "none",
  borderRadius: "14px",
  background: "#FACC15",
  color: "#422006",
  padding: "13px",
  fontWeight: 900,
  cursor: "pointer",
};

const adminLogoutButton = {
  borderRadius: "12px",
  border: "1px solid rgba(250, 204, 21, 0.45)",
  background: "rgba(250, 204, 21, 0.1)",
  color: "#FDE047",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const adminMessageText = {
  margin: "12px 0 0",
  color: "#FDE68A",
  fontSize: "13px",
  fontWeight: 800,
};

const adminPlayerActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
  marginTop: "10px",
};

const editPlayerButton = {
  width: "100%",
  borderRadius: "10px",
  border: "1px solid rgba(56, 189, 248, 0.45)",
  background: "rgba(56, 189, 248, 0.1)",
  color: "#7DD3FC",
  padding: "9px 10px",
  fontSize: "12px",
  fontWeight: 800,
  cursor: "pointer",
};

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 50,
  background: "rgba(0, 0, 0, 0.74)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
};

const modalCard = {
  width: "100%",
  maxWidth: "430px",
  maxHeight: "92vh",
  overflowY: "auto" as const,
  borderRadius: "24px",
  background: "#0F172A",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
  padding: "16px",
};

const modalCloseButton = {
  width: "38px",
  height: "38px",
  borderRadius: "999px",
  border: "1px solid #475569",
  background: "#020617",
  color: "#FFFFFF",
  fontSize: "24px",
  lineHeight: 1,
  cursor: "pointer",
};

const editModalBody = {
  marginTop: "16px",
  display: "grid",
  gap: "14px",
};

const confirmText = {
  margin: "12px 0 0",
  color: "#CBD5E1",
  fontSize: "14px",
  lineHeight: 1.5,
};

const confirmActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "18px",
};

const confirmNoButton = {
  borderRadius: "14px",
  border: "1px solid #475569",
  background: "transparent",
  color: "#E2E8F0",
  padding: "13px",
  fontWeight: 900,
  cursor: "pointer",
};

const confirmYesButton = {
  borderRadius: "14px",
  border: "1px solid rgba(239, 68, 68, 0.5)",
  background: "rgba(239, 68, 68, 0.16)",
  color: "#FCA5A5",
  padding: "13px",
  fontWeight: 900,
  cursor: "pointer",
};

const pageStyle = {
  minHeight: "100vh",
  color: "white",
  padding: "20px 16px",
  background: "radial-gradient(circle at top, #111827, #030712 55%)",
};

const eyebrowStyle = {
  margin: 0,
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.35em",
  color: "#6EE7B7",
};

const titleStyle = {
  margin: "8px 0 0",
  fontSize: "32px",
  fontWeight: 900,
  letterSpacing: "-0.03em",
};

const subtitleStyle = {
  margin: "8px 0 0",
  color: "#CBD5E1",
  fontSize: "14px",
  lineHeight: 1.5,
};

const glassCard = {
  marginTop: "16px",
  padding: "16px",
  borderRadius: "24px",
  background: "rgba(17, 24, 39, 0.82)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 22px 50px rgba(0,0,0,0.35)",
};

const startButton = {
  width: "100%",
  border: "none",
  borderRadius: "16px",
  background: "#22C55E",
  color: "#052E16",
  padding: "16px 20px",
  fontSize: "18px",
  fontWeight: 900,
  cursor: "pointer",
};

const manualTicketBox = {
  marginTop: "14px",
  display: "grid",
  gap: "10px",
};

const manualTicketRow = {
  display: "flex",
  alignItems: "center",
  borderRadius: "14px",
  border: "1px solid #475569",
  background: "#020617",
  overflow: "hidden",
};

const ticketPrefix = {
  padding: "13px 12px",
  background: "#111827",
  color: "#6EE7B7",
  fontWeight: 900,
  borderRight: "1px solid #334155",
};

const manualTicketInput = {
  flex: 1,
  border: "none",
  background: "transparent",
  color: "white",
  padding: "13px 12px",
  outline: "none",
  fontSize: "16px",
};

const manualTicketButton = {
  width: "100%",
  border: "1px solid rgba(110, 231, 183, 0.35)",
  borderRadius: "14px",
  background: "rgba(34, 197, 94, 0.12)",
  color: "#6EE7B7",
  padding: "13px",
  fontWeight: 900,
  cursor: "pointer",
};

const readerStyle = {
  overflow: "hidden",
  borderRadius: "24px",
  background: "black",
  padding: "8px",
};

const secondaryButton = {
  width: "100%",
  marginTop: "12px",
  borderRadius: "12px",
  border: "1px solid #475569",
  background: "transparent",
  color: "#E2E8F0",
  padding: "12px",
  fontWeight: 800,
  cursor: "pointer",
};

const validTicketBox = {
  marginTop: "14px",
  borderRadius: "16px",
  border: "1px solid rgba(110, 231, 183, 0.3)",
  background: "rgba(34, 197, 94, 0.1)",
  padding: "16px",
  display: "grid",
  gap: "14px",
};

const smallGreenText = {
  margin: 0,
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.12em",
  color: "#6EE7B7",
};

const labelStyle = {
  display: "grid",
  gap: "8px",
};

const labelText = {
  margin: 0,
  color: "#E2E8F0",
  fontSize: "14px",
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  borderRadius: "12px",
  border: "1px solid #475569",
  background: "#020617",
  color: "white",
  padding: "12px 14px",
  outline: "none",
};

const positionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "8px",
};

const positionButton = {
  borderRadius: "12px",
  border: "1px solid #475569",
  background: "transparent",
  color: "white",
  padding: "12px 8px",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
};

const activePositionButton = {
  background: "#22C55E",
  color: "#052E16",
  borderColor: "#86EFAC",
  boxShadow: "0 0 0 2px rgba(34, 197, 94, 0.25)",
};

const captainButton = {
  width: "100%",
  borderRadius: "12px",
  border: "1px solid rgba(234, 179, 8, 0.6)",
  background: "transparent",
  color: "#FDE047",
  padding: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const activeCaptainButton = {
  background: "#22C55E",
  color: "#052E16",
  borderColor: "#86EFAC",
};

const ratingHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const starsWrap = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "4px",
};

const starButton = {
  border: "none",
  background: "transparent",
  fontSize: "28px",
  cursor: "pointer",
  padding: "0 1px",
  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
};

const arrivedButton = {
  width: "100%",
  border: "none",
  borderRadius: "16px",
  background: "#0EA5E9",
  color: "#082F49",
  padding: "16px 20px",
  fontSize: "18px",
  fontWeight: 900,
  cursor: "pointer",
};

const invalidBox = {
  marginTop: "14px",
  borderRadius: "16px",
  border: "1px solid rgba(239, 68, 68, 0.4)",
  background: "rgba(239, 68, 68, 0.1)",
  padding: "16px",
  color: "#FECACA",
  fontSize: "14px",
  fontWeight: 800,
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const sectionTitle = {
  margin: 0,
  fontSize: "20px",
  fontWeight: 900,
};

const clearButton = {
  borderRadius: "12px",
  border: "1px solid rgba(239, 68, 68, 0.4)",
  background: "transparent",
  color: "#FCA5A5",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: 800,
  cursor: "pointer",
};

const arrivalCard = {
  borderRadius: "16px",
  border: "1px solid #334155",
  background: "rgba(2, 6, 23, 0.6)",
  padding: "12px",
};

const arrivalTop = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const ratingPill = {
  margin: 0,
  borderRadius: "999px",
  background: "rgba(34, 197, 94, 0.15)",
  color: "#6EE7B7",
  padding: "4px 8px",
  fontSize: "12px",
  fontWeight: 900,
};
const removePlayerButton = {
  width: "100%",
  marginTop: "10px",
  borderRadius: "10px",
  border: "1px solid rgba(239, 68, 68, 0.45)",
  background: "rgba(239, 68, 68, 0.08)",
  color: "#FCA5A5",
  padding: "9px 10px",
  fontSize: "12px",
  fontWeight: 800,
  cursor: "pointer",
};

const teamButtonsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "8px",
  marginTop: "12px",
};

const random2Button = {
  border: "none",
  borderRadius: "16px",
  background: "#A855F7",
  color: "#3B0764",
  padding: "16px 12px",
  fontWeight: 900,
  cursor: "pointer",
};

const random3Button = {
  border: "none",
  borderRadius: "16px",
  background: "#FB923C",
  color: "#431407",
  padding: "16px 12px",
  fontWeight: 900,
  cursor: "pointer",
};
const teamLabel = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.72)",
  textTransform: "uppercase" as const,
};

const teamName = {
  margin: "3px 0 0",
  fontSize: "24px",
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const redTeamCard = {
  borderRadius: "26px",
  border: "1px solid rgba(248, 113, 113, 0.45)",
  background:
    "linear-gradient(160deg, rgba(127, 29, 29, 0.95), rgba(2, 6, 23, 0.92) 62%)",
  padding: "16px",
  boxShadow: "0 18px 45px rgba(239, 68, 68, 0.18)",
};

const blueTeamCard = {
  borderRadius: "26px",
  border: "1px solid rgba(96, 165, 250, 0.45)",
  background:
    "linear-gradient(160deg, rgba(30, 64, 175, 0.95), rgba(2, 6, 23, 0.92) 62%)",
  padding: "16px",
  boxShadow: "0 18px 45px rgba(59, 130, 246, 0.18)",
};

const limeTeamCard = {
  borderRadius: "26px",
  border: "1px solid rgba(190, 242, 100, 0.45)",
  background:
    "linear-gradient(160deg, rgba(77, 124, 15, 0.95), rgba(2, 6, 23, 0.92) 62%)",
  padding: "16px",
  boxShadow: "0 18px 45px rgba(132, 204, 22, 0.18)",
};

const redTeamHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  color: "#FEE2E2",
};

const blueTeamHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  color: "#DBEAFE",
};

const limeTeamHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  color: "#ECFCCB",
};

const redTeamBadge = {
  margin: 0,
  borderRadius: "999px",
  background: "rgba(254, 202, 202, 0.16)",
  color: "#FECACA",
  border: "1px solid rgba(254, 202, 202, 0.28)",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 900,
  whiteSpace: "nowrap" as const,
};

const blueTeamBadge = {
  margin: 0,
  borderRadius: "999px",
  background: "rgba(191, 219, 254, 0.16)",
  color: "#BFDBFE",
  border: "1px solid rgba(191, 219, 254, 0.28)",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 900,
  whiteSpace: "nowrap" as const,
};

const limeTeamBadge = {
  margin: 0,
  borderRadius: "999px",
  background: "rgba(217, 249, 157, 0.16)",
  color: "#D9F99D",
  border: "1px solid rgba(217, 249, 157, 0.28)",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 900,
  whiteSpace: "nowrap" as const,
};

const teamPlayerName = {
  margin: 0,
  fontSize: "15px",
  fontWeight: 900,
  color: "#F8FAFC",
};

const teamPlayerPositions = {
  margin: "5px 0 0",
  color: "#CBD5E1",
  fontSize: "12px",
};

const teamRatingPill = {
  margin: 0,
  borderRadius: "999px",
  background: "rgba(255,255,255,0.13)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "#FFFFFF",
  padding: "5px 9px",
  fontSize: "12px",
  fontWeight: 950,
  whiteSpace: "nowrap" as const,
};
const teamCard = {
  borderRadius: "24px",
  border: "1px solid #334155",
  background: "rgba(2, 6, 23, 0.7)",
  padding: "16px",
};

const avgPill = {
  margin: 0,
  borderRadius: "999px",
  background: "rgba(14, 165, 233, 0.15)",
  color: "#7DD3FC",
  padding: "4px 10px",
  fontSize: "12px",
  fontWeight: 900,
};

const teamPlayerCard = {
  borderRadius: "14px",
  background: "#0F172A",
  padding: "12px",
};
