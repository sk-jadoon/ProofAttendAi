import { useEffect, useRef, useState } from "react";
import {
  BrowserProvider,
  Contract,
} from "ethers";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
} from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import {
  ShieldCheck,
  LayoutDashboard,
  QrCode,
  LogOut,
  User,
  Plus,
  Lock,
  CheckCircle,
  Clock,
  BookOpen,
} from "lucide-react";

const API = "https://proof-attend-ai-sx1w.vercel.app/api";
const ATTENDANCE_NFT_CONTRACT_ADDRESS =
  "0xf8e81D47203A594245E36C48e151709F0C19fBe8";

const ATTENDANCE_NFT_ABI = [
  "function lockAttendanceSession(uint256 sessionId, bytes32 attendanceHash)",
];
const getToken = () => localStorage.getItem("token");

const getUser = () =>
  JSON.parse(localStorage.getItem("user") || "null");

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask is not installed.");
    return null;
  }

  try {
    const provider =
      new BrowserProvider(
        window.ethereum
      );

    await provider.send(
      "eth_requestAccounts",
      []
    );

    const signer =
      await provider.getSigner();

    const address =
      await signer.getAddress();

    /*
    |--------------------------------------------------------------------------
    | Save wallet in backend database
    |--------------------------------------------------------------------------
    */
    await api(
      "/attendance/wallet/connect",
      {
        method: "POST",
        body: JSON.stringify({
          wallet_address:
            address,
        }),
      }
    );

    localStorage.setItem(
      "walletAddress",
      address
    );

    return address;
  } catch (error) {
    console.error(
      "Wallet connection error:",
      error
    );

    alert(
      error.message ||
        "Could not connect wallet."
    );

    return null;
  }
}

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getToken()
        ? { Authorization: `Bearer ${getToken()}` }
        : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

/* =========================================================
   AUTH - LOGIN
========================================================= */

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
        body: JSON.stringify({
          email,
          password,
        }),
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

        <p className="muted">
          Blockchain Attendance Management
        </p>

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

          <button
            className="primary-btn"
            disabled={loading}
          >
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

/* =========================================================
   AUTH - REGISTER
========================================================= */

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

        <p className="muted">
          Join ProofAttend
        </p>

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

          <select
            name="role"
            value={form.role}
            onChange={change}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>

          {error && <div className="error">{error}</div>}

          <button
            className="primary-btn"
            disabled={loading}
          >
            {loading
              ? "Creating..."
              : "Create Account"}
          </button>
        </form>

        <p className="bottom-text">
          Already registered?{" "}
          <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   LAYOUT
========================================================= */

function Layout({ children }) {
  const navigate = useNavigate();

  const user = getUser();

  const [walletAddress, setWalletAddress] = useState(
    localStorage.getItem("walletAddress") || ""
  );

  const handleConnectWallet = async () => {
    const address = await connectWallet();

    if (address) {
      setWalletAddress(address);
    }
  };

  const disconnectWallet = () => {
    localStorage.removeItem("walletAddress");
    setWalletAddress("");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("walletAddress");

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

          {(user?.role === "teacher" ||
            user?.role === "admin") && (
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

        <div style={{ padding: "10px 12px" }}>
          {!walletAddress ? (
            <button
              className="secondary-btn"
              onClick={handleConnectWallet}
              style={{
                width: "100%",
                margin: "0",
                background: "#3159d9",
                color: "white",
              }}
            >
              Connect Wallet
            </button>
          ) : (
            <>
              <div
                style={{
                  color: "#9ca8bc",
                  fontSize: "12px",
                  marginBottom: "8px",
                  wordBreak: "break-all",
                }}
              >
                {walletAddress.slice(0, 6)}...
                {walletAddress.slice(-4)}
              </div>

              <button
                className="logout-btn"
                onClick={disconnectWallet}
              >
                Disconnect Wallet
              </button>
            </>
          )}
        </div>

        <button
          className="logout-btn"
          onClick={logout}
        >
          <LogOut size={21} />
          Logout
        </button>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard() {
  const user = getUser();

  return (
    <Layout>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>

          <p>
            Welcome back, {user?.name}
          </p>
        </div>

        <span className="role-badge">
          {user?.role?.toUpperCase()}
        </span>
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
              Scan your teacher's QR code and your
              attendance will be securely recorded.
            </p>

            <Link
              className="primary-link"
              to="/mark-attendance"
            >
              Mark Attendance
            </Link>
          </div>
        </div>
      )}

      {(user?.role === "teacher" ||
        user?.role === "admin") && (
        <div className="welcome-card">
          <BookOpen size={45} />

          <div>
            <h2>Manage Attendance</h2>

            <p>
              Create attendance sessions, generate QR
              codes and lock sessions to mint blockchain
              attendance NFTs.
            </p>

            <Link
              className="primary-link"
              to="/teacher"
            >
              Open Teacher Panel
            </Link>
          </div>
        </div>
      )}
    </Layout>
  );
}

/* =========================================================
   STUDENT ATTENDANCE
   CAMERA + QR IMAGE UPLOAD
========================================================= */

function MarkAttendance() {
  const [token, setToken] = useState("");

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  const [scannerOpen, setScannerOpen] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] =
    useState(false);

  const scannerRef = useRef(null);

  const fileInputRef = useRef(null);

  /* -------------------------------------------------------
     CLEANUP CAMERA WHEN COMPONENT CLOSES
  ------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              scannerRef.current.clear();
            } catch {}

            scannerRef.current = null;
          });
      }
    };
  }, []);

  /* -------------------------------------------------------
     START CAMERA
  ------------------------------------------------------- */

  const startCamera = async () => {
    setError("");
    setMessage("");

    setScannerOpen(true);

    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(
          "qr-reader"
        );

        scannerRef.current = scanner;

        await scanner.start(
          {
            facingMode: "environment",
          },
          {
            fps: 10,

            qrbox: {
              width: 250,
              height: 250,
            },

            aspectRatio: 1,
          },

          async (decodedText) => {
            setToken(decodedText);

            setMessage(
              "QR code detected successfully."
            );

            try {
              await scanner.stop();
            } catch {}

            try {
              scanner.clear();
            } catch {}

            scannerRef.current = null;

            setScannerOpen(false);
          },

          () => {}
        );
      } catch (err) {
        console.error(
          "Camera scanner error:",
          err
        );

        setScannerOpen(false);

        setError(
          "Camera could not be opened. Please allow camera permission or use Upload QR Picture."
        );
      }
    }, 150);
  };

  /* -------------------------------------------------------
     STOP CAMERA
  ------------------------------------------------------- */

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}

      try {
        scannerRef.current.clear();
      } catch {}

      scannerRef.current = null;
    }

    setScannerOpen(false);
  };

  /* -------------------------------------------------------
     UPLOAD QR IMAGE
  ------------------------------------------------------- */

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);

    setError("");
    setMessage("");

    try {
      const scanner = new Html5Qrcode(
        "qr-image-reader"
      );

      const decodedText =
        await scanner.scanFile(file, true);

      setToken(decodedText);

      setMessage(
        "QR code detected successfully from picture."
      );

      try {
        scanner.clear();
      } catch {}
    } catch (err) {
      console.error(
        "QR image scanning error:",
        err
      );

      setError(
        "QR code could not be detected from this picture. Please upload a clear QR code image."
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /* -------------------------------------------------------
     MARK ATTENDANCE
  ------------------------------------------------------- */

  const mark = async (e) => {
    e.preventDefault();

    if (!token.trim()) {
      setError(
        "Please scan a QR code or enter the QR token."
      );

      return;
    }

    setLoading(true);

    setMessage("");
    setError("");

    try {
      const data = await api(
        "/attendance/mark",
        {
          method: "POST",

          body: JSON.stringify({
            qr_token: token.trim(),
          }),
        }
      );

      setMessage(
        data.message ||
          "Attendance marked successfully."
      );

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

          <p>
            Scan the QR code provided by your teacher.
          </p>
        </div>

        <span className="role-badge">
          STUDENT
        </span>
      </header>

      <div className="attendance-card">
        <div className="big-icon">
          <QrCode size={60} />
        </div>

        <h2>Mark Attendance</h2>

        <p>
          Scan the session QR code using your camera
          or upload a QR code picture.
        </p>

        {/* =================================================
            CAMERA
        ================================================= */}

        {scannerOpen && (
          <div className="scanner-wrapper">
            <div
              id="qr-reader"
              className="qr-reader"
            ></div>

            <button
              type="button"
              className="secondary-btn"
              onClick={stopCamera}
            >
              Close Camera
            </button>
          </div>
        )}

        {/* =================================================
            CAMERA + IMAGE BUTTONS
        ================================================= */}

        {!scannerOpen && (
          <>
            <button
              type="button"
              className="secondary-btn"
              onClick={startCamera}
            >
              <QrCode size={20} />

              Scan with Camera
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={uploading}
            >
              <QrCode size={20} />

              {uploading
                ? "Detecting QR..."
                : "Upload QR Picture"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{
                display: "none",
              }}
            />

            {/* Hidden scanner container for image scanning */}

            <div
              id="qr-image-reader"
              style={{
                width: "1px",
                height: "1px",
                overflow: "hidden",
                position: "absolute",
                left: "-9999px",
                top: "-9999px",
              }}
            ></div>
          </>
        )}

        <div className="or">
          OR
        </div>

        {/* =================================================
            TOKEN INPUT
        ================================================= */}

        <form
          onSubmit={mark}
          className="attendance-form"
        >
          <input
            value={token}
            onChange={(e) =>
              setToken(e.target.value)
            }
            placeholder="QR token will appear here"
            required
          />

          <button
            className="primary-btn"
            disabled={loading}
          >
            {loading
              ? "Marking..."
              : "Mark Attendance"}
          </button>
        </form>

        {message && (
          <div className="success">
            <CheckCircle size={20} />

            {message}
          </div>
        )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}
      </div>
    </Layout>
  );
}

/* =========================================================
   TEACHER PANEL
========================================================= */

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

  const [blockchain, setBlockchain] =
    useState(null);

    const loadSession = async (sessionId) => {
  try {
    const data = await api(
      `/attendance/sessions/${sessionId}`
    );

    setSession(data.session);

    setBlockchain(
      data.records || []
    );

    return data;
  } catch (err) {
    console.error(
      "Load session error:",
      err
    );

    setError(err.message);

    return null;
  }
};

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
      const data = await api(
        "/attendance/sessions",
        {
          method: "POST",

          body: JSON.stringify(form),
        }
      );

      await loadSession(data.session.id);

    setMessage(
    "Attendance session created successfully."
    );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

 const lockSession = async () => {
  if (!session) {
    return;
  }

  if (!window.ethereum) {
    setError(
      "Please install MetaMask first."
    );
    return;
  }

  const confirmed =
    window.confirm(
      "Lock this attendance session and mint blockchain NFTs?"
    );

  if (!confirmed) {
    return;
  }

  setLocking(true);

  setError("");
  setMessage("");
  setBlockchain(null);

  try {
    /*
    |--------------------------------------------------------------------------
    | STEP 1 — Ask backend for exact attendance hash
    |--------------------------------------------------------------------------
    */
    const prepared =
      await api(
        `/attendance/sessions/${session.id}/lock`,
        {
          method: "POST",

          body: JSON.stringify({
            prepare_only: true,
          }),
        }
      );

    const attendanceHash =
      prepared.attendance_hash;

    /*
    |--------------------------------------------------------------------------
    | STEP 2 — Connect MetaMask
    |--------------------------------------------------------------------------
    */
    const provider =
      new BrowserProvider(
        window.ethereum
      );

    await provider.send(
      "eth_requestAccounts",
      []
    );

    const signer =
      await provider.getSigner();

    const teacherWallet =
      await signer.getAddress();

    /*
    |--------------------------------------------------------------------------
    | STEP 3 — Contract connected to TEACHER'S MetaMask
    |--------------------------------------------------------------------------
    */
    const contract =
      new Contract(
        ATTENDANCE_NFT_CONTRACT_ADDRESS,
        ATTENDANCE_NFT_ABI,
        signer
      );

    setMessage(
      "Please confirm the transaction in MetaMask..."
    );

    /*
    |--------------------------------------------------------------------------
    | STEP 4 — MetaMask POPUP
    |--------------------------------------------------------------------------
    */
    const tx =
      await contract.lockAttendanceSession(
        session.id,
        attendanceHash
      );

    setMessage(
      "Transaction submitted. Waiting for blockchain confirmation..."
    );

    /*
    |--------------------------------------------------------------------------
    | STEP 5 — Wait for blockchain confirmation
    |--------------------------------------------------------------------------
    */
    const receipt =
      await tx.wait();

    if (!receipt) {
      throw new Error(
        "Blockchain transaction was not confirmed."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | STEP 6 — Tell backend transaction is confirmed
    |--------------------------------------------------------------------------
    */
    const data =
      await api(
        `/attendance/sessions/${session.id}/lock`,
        {
          method: "POST",

          body: JSON.stringify({
            transaction_hash:
              tx.hash,

            teacher_wallet:
              teacherWallet,

            attendance_hash:
              attendanceHash,
          }),
        }
      );

    /*
    |--------------------------------------------------------------------------
    | STEP 7 — Session locked
    |--------------------------------------------------------------------------
    */
    setSession({
      ...session,
      status: "locked",
    });

    /*
    |--------------------------------------------------------------------------
    | STEP 8 — Show NFT records
    |--------------------------------------------------------------------------
    */
    setBlockchain(
      data.blockchain || []
    );

    setMessage(
      data.message ||
        "Attendance locked successfully."
    );
  } catch (err) {
    console.error(
      "Lock attendance error:",
      err
    );

    if (
      err.code === 4001 ||
      err.code ===
        "ACTION_REJECTED"
    ) {
      setError(
        "Transaction was rejected in MetaMask."
      );
    } else {
      setError(
        err.reason ||
          err.shortMessage ||
          err.message ||
          "Failed to lock attendance."
      );
    }
  } finally {
    setLocking(false);
  }
};

  return (
    <Layout>
      <header className="page-header">
        <div>
          <h1>Teacher Panel</h1>

          <p>
            Create and manage attendance sessions.
          </p>
        </div>

        <span className="role-badge">
          TEACHER
        </span>
      </header>

      <div className="teacher-grid">
        <div className="panel-card">
          <h2>
            <Plus size={23} />

            Create Attendance Session
          </h2>

          <form onSubmit={createSession}>
            <label>
              Course Name
            </label>

            <input
              name="course_name"
              placeholder="e.g. Artificial Intelligence"
              value={form.course_name}
              onChange={change}
              required
            />

            <label>
              Date
            </label>

            <input
              type="date"
              name="session_date"
              value={form.session_date}
              onChange={change}
              required
            />

            <label>
              Start Time
            </label>

            <input
              type="time"
              name="start_time"
              value={form.start_time}
              onChange={change}
              required
            />

            <button
              className="primary-btn"
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "Create Session"}
            </button>
          </form>
        </div>

        {session && (
          <div className="panel-card session-card">
            <div className="session-header">
              <div>
                <span className="small-label">
                  ACTIVE SESSION
                </span>

                <h2>
                  {session.course_name}
                </h2>
              </div>

              <span className="status-badge">
                {session.status}
              </span>
            </div>

            <div className="qr-box">
              <QRCodeCanvas
                value={session.qr_token}
                size={230}
                level="H"
              />
            </div>

            <p className="qr-help">
              Students scan this QR code to
              mark attendance.
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
                ? "Confirming Blockchain..."
                : "Lock Attendance"}
              </button>
            )}
          </div>
        )}
      </div>

      {message && (
        <div className="success page-message">
          {message}
        </div>
      )}

      {error && (
        <div className="error page-message">
          {error}
        </div>
      )}

      {blockchain &&
        blockchain.length > 0 && (
          <div className="panel-card blockchain-card">
            <h2>
              <ShieldCheck size={23} />

              Blockchain Records
            </h2>

            {blockchain.map((item) => (
              <div
                className="blockchain-row"
                key={item.attendance_id}
              >
                <div>
                  <strong>
                    Student #{item.student_id}
                  </strong>

                  <span>
                    Token ID: {item.token_id}
                  </span>
                </div>

                <div>
                  <span>
                    Transaction
                  </span>

                  <code>
                    {item.transaction_hash}
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
    </Layout>
  );
}

/* =========================================================
   ROUTE PROTECTION
========================================================= */

function ProtectedRoute({ children }) {
  if (!getToken()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}

function PublicRoute({ children }) {
  if (getToken()) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
}

/* =========================================================
   APP
========================================================= */

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
          justify-content: center;
          margin: 20px auto;
          min-width: 230px;
        }

        .secondary-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
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
          font-weight: 700;
        }

        .scanner-wrapper {
          max-width: 420px;
          margin: 25px auto;
        }

        #qr-reader {
          width: 100%;
          border: 0 !important;
          overflow: hidden;
          border-radius: 15px;
        }

        #qr-reader video {
          width: 100% !important;
          border-radius: 15px;
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

          .secondary-btn {
            width: 100%;
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
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;