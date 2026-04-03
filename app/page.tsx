export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#0B0B0C",
      color: "#F5F5F4",
      padding: "24px",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <h1 style={{ color: "#E85D04", fontSize: "32px", fontWeight: "bold" }}>
          DIVINA LIGA
        </h1>

        <p style={{ marginTop: "16px", fontSize: "18px" }}>
          A football league for players who want to register, vote, and book game day.
        </p>

        <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
          <button style={{
            background: "#E85D04",
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "12px 18px",
            fontWeight: "bold"
          }}>
            Register
          </button>

          <button style={{
            background: "#15171A",
            color: "white",
            border: "1px solid #2A2D31",
            borderRadius: "12px",
            padding: "12px 18px",
            fontWeight: "bold"
          }}>
            Log in
          </button>
        </div>
      </div>
    </main>
  );
}