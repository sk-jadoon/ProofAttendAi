import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  ShieldCheck,
  LayoutDashboard,
  QrCode,
  LogOut,
  User,
  Plus,
  Lock,
  CheckCircle,
  Wallet,
  Clock,
  BookOpen,
} from "lucide-react";

const API = "http://localhost:5000/api";

const getToken = () => localStorage.getItem("token");
const getUser = () => JSON.parse(localStorage.getItem("user") || "null");

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

/* =========================
   AUTH
========================= */

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo-center">
          <ShieldCheck size={42} />
        </div>

        <h1>ProofAttend</h1>
        <p className="muted">Blockchain Attendance Management</p>

        <form onSubmit={submit}>
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="error">{error}</div>}

          <button className="primary-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="bottom-text">
          Don't have an account?{" "}
          <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });

      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo-center">
          <ShieldCheck size={42} />
        </div>

        <h1>Create Account</h1>
        <p className="muted">Join ProofAttend</p>

        <form onSubmit={submit}>
          <label>Name</label>
          <input
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={change}
            required
          />

          <label>Email</label>
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={change}
            required
          />

          <label>Password</label>
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={change}
            required
          />

          <label>Role</label>
          <select name="role" value={form.role} onChange={change}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>

          {error && <div className="error">{error}</div>}

          <button className="primary-btn" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="bottom-text">
          Already registered? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

/* =========================
   LAYOUT
========================= */

function Layout({ children }) {
  const navigate = useNavigate();
  const user = getUser();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <ShieldCheck size={28} />
          <span>ProofAttend</span>
        </div>

        <nav>
          <Link to="/dashboard">
            <LayoutDashboard size={22} />
            Dashboard
          </Link>

          {user?.role === "student" && (
            <Link to="/mark-attendance">
              <QrCode size={22} />
              Mark Attendance
            </Link>
          )}

          {(user?.role === "teacher" || user?.role === "admin") && (
            <Link to="/teacher">
              <BookOpen size={22} />
              Teacher Panel
            </Link>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="user-icon">
            <User size={22} />
          </div>

          <div>
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
        </div>

        <button className="logout-btn" onClick={logout}>
          <LogOut size={21} />
          Logout
        </button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}

/* =========================
   DASHBOARD
========================= */

function Dashboard() {
  const user = getUser();

  return (
    <Layout>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.name}</p>
        </div>

        <span className="role-badge">{user?.role?.toUpperCase()}</span>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircle />
          </div>
          <div>
            <span>Attendance</span>
            <strong>Active</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ShieldCheck />
          </div>
          <div>
            <span>Blockchain</span>
            <strong>Connected</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Clock />
          </div>
          <div>
            <span>System</span>
            <strong>Online</strong>
          </div>
        </div>
      </div>

      {user?.role === "student" && (
        <div className="welcome-card">
          <QrCode size={45} />
          <div>
            <h2>Mark your attendance</h2>
            <p>
              Scan your teacher's QR code and your attendance will be securely
              recorded.
            </p>
            <Link className="primary-link" to="/mark-attendance">
              Mark Attendance
            </Link>
          </div>
        </div>
      )}

      {(user?.role === "teacher" || user?.role === "admin") && (
        <div className="welcome-card">
          <BookOpen size={45} />
          <div>
            <h2>Manage Attendance</h2>
            <p>Create attendance sessions, generate QR codes and lock sessions
              to mint blockchain attendance NFTs.</p>
            <Link className="primary-link" to="/teacher">
              Open Teacher Panel
            </Link>
          </div>
        </div>
      )}
    </Layout>
  );
}

/* =========================
   STUDENT ATTENDANCE
========================= */

function MarkAttendance() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scannerOpen) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setToken(decodedText);
        setScannerOpen(false);
        scanner.clear().catch(() => {});
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scannerOpen]);

  const mark = async (e) => {
    e.preventDefault();

    if (!token.trim()) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const data = await api("/attendance/mark", {
        method: "POST",
        body: JSON.stringify({
          qr_token: token.trim(),
        }),
      });

      setMessage(data.message || "Attendance marked successfully.");
      setToken("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <header className="page-header">
        <div>
          <h1>Mark Attendance</h1>
          <p>Scan the QR code provided by your teacher.</p>
        </div>
        <span className="role-badge">STUDENT</span>
      </header>

      <div className="attendance-card">
        <div className="big-icon">
          <QrCode size={60} />
        </div>

        <h2>Mark Attendance</h2>
        <p>Scan the session QR code or enter its token.</p>

        {scannerOpen && (
          <div className="scanner-wrapper">
            <div id="qr-reader"></div>
          </div>
        )}

        {!scannerOpen && (
          <button
            className="secondary-btn"
            onClick={() => {
              setError("");
              setMessage("");
              setScannerOpen(true);
            }}
          >
            <QrCode size={20} />
            Scan QR Code
          </button>
        )}

        <div className="or">OR</div>

        <form onSubmit={mark} className="attendance-form">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste QR token here"
            required
          />

          <button className="primary-btn" disabled={loading}>
            {loading ? "Marking..." : "Mark Attendance"}
          </button>
        </form>

        {message && (
          <div className="success">
            <CheckCircle size={20} />
            {message}
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </div>
    </Layout>
  );
}

/* =========================
   TEACHER PANEL
========================= */

function TeacherPanel() {
  const [form, setForm] = useState({
    course_name: "",
    session_date: "",
    start_time: "",
  });

  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(false);
  const [blockchain, setBlockchain] = useState(null);

  const change = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const createSession = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");
    setBlockchain(null);

    try {
      const data = await api("/attendance/sessions", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setSession(data.session);
      setMessage("Attendance session created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const lockSession = async () => {
    if (!session) return;

    const confirmed = window.confirm(
      "Lock this attendance session and mint blockchain NFTs?"
    );

    if (!confirmed) return;

    setLocking(true);
    setError("");
    setMessage("");

    try {
      const data = await api(`/attendance/sessions/${session.id}/lock`, {
        method: "POST",
      });

      setSession({
        ...session,
        status: "locked",
      });

      setBlockchain(data.blockchain || []);
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLocking(false);
    }
  };

  return (
    <Layout>
      <header className="page-header">
        <div>
          <h1>Teacher Panel</h1>
          <p>Create and manage attendance sessions.</p>
        </div>

        <span className="role-badge">TEACHER</span>
      </header>

      <div className="teacher-grid">
        <div className="panel-card">
          <h2>
            <Plus size={23} />
            Create Attendance Session
          </h2>

          <form onSubmit={createSession}>
            <label>Course Name</label>
            <input
              name="course_name"
              placeholder="e.g. Artificial Intelligence"
              value={form.course_name}
              onChange={change}
              required
            />

            <label>Date</label>
            <input
              type="date"
              name="session_date"
              value={form.session_date}
              onChange={change}
              required
            />

            <label>Start Time</label>
            <input
              type="time"
              name="start_time"
              value={form.start_time}
              onChange={change}
              required
            />

            <button className="primary-btn" disabled={loading}>
              {loading ? "Creating..." : "Create Session"}
            </button>
          </form>
        </div>

        {session && (
          <div className="panel-card session-card">
            <div className="session-header">
              <div>
                <span className="small-label">ACTIVE SESSION</span>
                <h2>{session.course_name}</h2>
              </div>

              <span className="status-badge">{session.status}</span>
            </div>

            <div className="qr-box">
              <QRCodeCanvas
                value={session.qr_token}
                size={230}
                level="H"
              />
            </div>

            <p className="qr-help">
              Students scan this QR code to mark attendance.
            </p>

            <div className="session-info">
              <div>
                <Clock size={18} />
                {session.start_time}
              </div>

              <div>
                <BookOpen size={18} />
                Session #{session.id}
              </div>
            </div>

            {session.status !== "locked" && (
              <button
                className="lock-btn"
                onClick={lockSession}
                disabled={locking}
              >
                <Lock size={20} />
                {locking
                  ? "Minting NFTs..."
                  : "Lock Attendance & Mint NFTs"}
              </button>
            )}
          </div>
        )}
      </div>

      {message && <div className="success page-message">{message}</div>}
      {error && <div className="error page-message">{error}</div>}

      {blockchain && blockchain.length > 0 && (
        <div className="panel-card blockchain-card">
          <h2>
            <ShieldCheck size={23} />
            Blockchain Records
          </h2>

          {blockchain.map((item) => (
            <div className="blockchain-row" key={item.attendance_id}>
              <div>
                <strong>Student #{item.student_id}</strong>
                <span>Token ID: {item.token_id}</span>
              </div>

              <div>
                <span>Transaction</span>
                <code>{item.transaction_hash}</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

/* =========================
   ROUTE PROTECTION
========================= */

function ProtectedRoute({ children }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  if (getToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/* =========================
   APP
========================= */

function App() {
  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #f4f6fb;
          color: #14213d;
        }

        a {
          text-decoration: none;
          color: inherit;
        }

        button,
        input,
        select {
          font: inherit;
        }

        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f4f6fb;
          padding: 25px;
        }

        .auth-card {
          width: 100%;
          max-width: 450px;
          background: white;
          padding: 40px;
          border-radius: 24px;
          box-shadow: 0 15px 50px rgba(0,0,0,.08);
        }

        .logo-center {
          width: 70px;
          height: 70px;
          border-radius: 20px;
          background: #eaf0ff;
          color: #3159d9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: auto;
        }

        .auth-card h1 {
          text-align: center;
          margin: 18px 0 5px;
          font-size: 32px;
        }

        .muted {
          text-align: center;
          color: #71809c;
          margin-bottom: 30px;
        }

        label {
          display: block;
          margin: 16px 0 8px;
          font-weight: 600;
        }

        input,
        select {
          width: 100%;
          padding: 15px 16px;
          border: 1px solid #d9dfed;
          border-radius: 12px;
          outline: none;
          background: white;
        }

        input:focus,
        select:focus {
          border-color: #3159d9;
        }

        .primary-btn {
          width: 100%;
          margin-top: 20px;
          border: 0;
          border-radius: 12px;
          padding: 15px;
          background: #3159d9;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        .primary-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .secondary-btn {
          border: 1px solid #3159d9;
          background: white;
          color: #3159d9;
          border-radius: 12px;
          padding: 13px 20px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          gap: 9px;
          align-items: center;
          margin: 20px auto;
        }

        .bottom-text {
          text-align: center;
          margin-top: 25px;
          color: #71809c;
        }

        .bottom-text a {
          color: #3159d9;
          font-weight: 700;
        }

        .error {
          background: #fff0f0;
          color: #c62828;
          padding: 12px;
          border-radius: 10px;
          margin-top: 15px;
        }

        .success {
          background: #ecfaf2;
          color: #18794e;
          padding: 13px;
          border-radius: 10px;
          margin-top: 15px;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .app-layout {
          min-height: 100vh;
          display: flex;
        }

        .sidebar {
          width: 280px;
          background: #101827;
          color: white;
          padding: 28px 20px;
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 26px;
          font-weight: 800;
          padding: 10px;
          margin-bottom: 40px;
        }

        .brand svg {
          color: #6e8df8;
        }

        nav {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        nav a {
          padding: 16px;
          border-radius: 13px;
          display: flex;
          gap: 15px;
          align-items: center;
          color: #c8d0df;
        }

        nav a:hover {
          background: #263550;
          color: white;
        }

        .sidebar-user {
          margin-top: auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
        }

        .user-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #3159d9;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-user strong,
        .sidebar-user span {
          display: block;
        }

        .sidebar-user span {
          color: #9ca8bc;
          margin-top: 4px;
          text-transform: capitalize;
        }

        .logout-btn {
          border: 0;
          background: transparent;
          color: #c8d0df;
          padding: 15px 12px;
          display: flex;
          gap: 14px;
          align-items: center;
          cursor: pointer;
          font-size: 16px;
        }

        .main-content {
          margin-left: 280px;
          width: calc(100% - 280px);
          padding: 42px 50px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 35px;
        }

        .page-header h1 {
          margin: 0;
          font-size: 38px;
        }

        .page-header p {
          color: #71809c;
          font-size: 18px;
          margin-top: 8px;
        }

        .role-badge,
        .status-badge {
          background: #eaf0ff;
          color: #3159d9;
          padding: 12px 22px;
          border-radius: 25px;
          font-weight: 800;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .stat-card {
          background: white;
          border-radius: 18px;
          padding: 24px;
          display: flex;
          gap: 18px;
          align-items: center;
          box-shadow: 0 8px 25px rgba(0,0,0,.04);
        }

        .stat-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: #eaf0ff;
          color: #3159d9;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-card span,
        .stat-card strong {
          display: block;
        }

        .stat-card span {
          color: #71809c;
        }

        .stat-card strong {
          margin-top: 6px;
          font-size: 20px;
        }

        .welcome-card {
          background: white;
          border-radius: 22px;
          margin-top: 25px;
          padding: 35px;
          display: flex;
          gap: 25px;
          align-items: center;
          box-shadow: 0 8px 25px rgba(0,0,0,.04);
        }

        .welcome-card > svg {
          color: #3159d9;
          flex-shrink: 0;
        }

        .welcome-card h2 {
          margin: 0 0 8px;
        }

        .welcome-card p {
          color: #71809c;
          margin-bottom: 20px;
        }

        .primary-link {
          display: inline-block;
          background: #3159d9;
          color: white;
          padding: 12px 18px;
          border-radius: 10px;
          font-weight: 700;
        }

        .attendance-card {
          background: white;
          border-radius: 24px;
          max-width: 780px;
          margin: auto;
          padding: 55px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,.05);
        }

        .big-icon {
          width: 120px;
          height: 120px;
          margin: auto;
          border-radius: 28px;
          background: #eaf0ff;
          color: #3159d9;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .attendance-card h2 {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .attendance-card > p {
          color: #71809c;
          font-size: 18px;
        }

        .or {
          color: #9aa5b8;
          margin: 15px;
        }

        .scanner-wrapper {
          max-width: 400px;
          margin: 25px auto;
        }

        #qr-reader {
          border: 0 !important;
        }

        .teacher-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
        }

        .panel-card {
          background: white;
          border-radius: 22px;
          padding: 30px;
          box-shadow: 0 8px 25px rgba(0,0,0,.04);
        }

        .panel-card h2 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 0;
        }

        .session-card {
          text-align: center;
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          text-align: left;
        }

        .small-label {
          color: #71809c;
          font-size: 12px;
          font-weight: 800;
        }

        .session-header h2 {
          margin-top: 8px;
        }

        .qr-box {
          padding: 25px;
          display: flex;
          justify-content: center;
        }

        .qr-help {
          color: #71809c;
        }

        .session-info {
          display: flex;
          justify-content: center;
          gap: 25px;
          color: #71809c;
          margin: 20px 0;
        }

        .session-info div {
          display: flex;
          gap: 7px;
          align-items: center;
        }

        .lock-btn {
          width: 100%;
          border: 0;
          background: #101827;
          color: white;
          border-radius: 12px;
          padding: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .lock-btn:disabled {
          opacity: .6;
        }

        .page-message {
          margin-top: 25px;
        }

        .blockchain-card {
          margin-top: 25px;
        }

        .blockchain-row {
          border: 1px solid #e1e6f0;
          padding: 18px;
          border-radius: 12px;
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }

        .blockchain-row strong,
        .blockchain-row span {
          display: block;
        }

        .blockchain-row span {
          color: #71809c;
          margin-top: 5px;
          font-size: 13px;
        }

        code {
          font-size: 11px;
          word-break: break-all;
        }

        @media (max-width: 900px) {
          .sidebar {
            width: 220px;
          }

          .main-content {
            margin-left: 220px;
            width: calc(100% - 220px);
            padding: 25px;
          }

          .teacher-grid,
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .sidebar {
            display: none;
          }

          .main-content {
            margin-left: 0;
            width: 100%;
            padding: 20px;
          }

          .page-header {
            align-items: flex-start;
            gap: 15px;
          }

          .page-header h1 {
            font-size: 30px;
          }

          .attendance-card {
            padding: 30px 20px;
          }
        }
      `}</style>

      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mark-attendance"
            element={
              <ProtectedRoute>
                <MarkAttendance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher"
            element={
              <ProtectedRoute>
                <TeacherPanel />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;