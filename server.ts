import express from "express";
import { createServer as createViteServer } from "vite";
import { Pool } from "pg";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import multer from "multer";
import nodemailer from "nodemailer";

// Configuration from environment variables
const UPLOADS_DIR = process.env.UPLOADS_PATH || path.resolve("uploads");
const DATABASE_URL = process.env.DATABASE_URL;

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Database Connection Setup
let pool: Pool | null = null;
let sqliteDb: any = null;
const isPostgres = !!DATABASE_URL;

if (isPostgres) {
  const isPublic = DATABASE_URL!.includes("proxy.rlwy.net") || DATABASE_URL!.includes("public");
  const maskedUrl = DATABASE_URL!.replace(/:[^:@]+@/, ":****@");
  
  if (isPublic) {
    console.warn("⚠️ WARNING: You are using a PUBLIC database URL. This will incur egress fees on Railway.");
    console.info("💡 Tip: Switch to the private DATABASE_URL in your Railway variables to avoid costs and improve speed.");
  }
  
  console.log(`📡 Production Mode: Attempting to connect to PostgreSQL (${isPublic ? 'PUBLIC' : 'PRIVATE'}): ${maskedUrl}`);
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
} else {
  console.log("🏠 Development Mode: Using local SQLite database.");
  const DB_PATH = process.env.DATABASE_PATH || "school.db";
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  sqliteDb = new Database(DB_PATH);
}

// Helper to execute queries regardless of DB type
async function query(text: string, params: any[] = []) {
  if (isPostgres && pool) {
    const res = await pool.query(text, params);
    return res;
  } else {
    // Convert Postgres $1, $2 syntax to SQLite ? syntax
    const sqliteSql = text.replace(/\$(\d+)/g, "?");
    const stmt = sqliteDb.prepare(sqliteSql);
    if (text.trim().toUpperCase().startsWith("SELECT")) {
      const rows = stmt.all(...params);
      return { rows, rowCount: rows.length };
    } else {
      const info = stmt.run(...params);
      return { rows: [], rowCount: info.changes, lastInsertId: info.lastInsertRowid };
    }
  }
}

// Initialize Database
async function initDb() {
  console.log("🚀 Initializing database schema...");
  
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id ${isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'student',
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS news (
      id ${isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id ${isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      title TEXT NOT NULL,
      image_url TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS report_cards (
      id ${isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      period TEXT NOT NULL,
      created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS polls (
      id ${isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS votes (
      id ${isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      poll_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      option_index INTEGER NOT NULL,
      created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(poll_id, user_id)
    );
  `;

  if (isPostgres) {
    const client = await pool!.connect();
    try {
      await client.query(schema);
    } finally {
      client.release();
    }
  } else {
    sqliteDb.exec(schema);
  }

  // Seed admin if not exists
  const adminCheck = await query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
  if (adminCheck.rows.length === 0) {
    await query("INSERT INTO users (email, role, name) VALUES ($1, $2, $3)", ["admin@escola.com", "admin", "Administrador"]);
  }

  // Seed random users if empty
  const userCount = await query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
  if (parseInt(userCount.rows[0].count) < 10) {
    console.log("Seeding random users...");
    const randomUsers = [
      ["Ana Silva", "ana.silva@escola.com"],
      ["Bruno Oliveira", "bruno.oliveira@escola.com"],
      ["Carla Santos", "carla.santos@escola.com"],
      ["Diego Ferreira", "diego.ferreira@escola.com"],
      ["Elena Costa", "elena.costa@escola.com"],
      ["Fabio Rodrigues", "fabio.rodrigues@escola.com"],
      ["Gisele Almeida", "gisele.almeida@escola.com"],
      ["Hugo Pereira", "hugo.pereira@escola.com"],
      ["Isabela Carvalho", "isabela.carvalho@escola.com"],
      ["João Gomes", "joao.gomes@escola.com"],
      ["Kelly Martins", "kelly.martins@escola.com"],
      ["Lucas Lima", "lucas.lima@escola.com"],
      ["Mariana Rocha", "mariana.rocha@escola.com"],
      ["Nicolas Souza", "nicolas.souza@escola.com"],
      ["Olivia Barbosa", "olivia.barbosa@escola.com"],
      ["Paulo Ribeiro", "paulo.ribeiro@escola.com"],
      ["Quelita Mendes", "quelita.mendes@escola.com"],
      ["Ricardo Castro", "ricardo.castro@escola.com"],
      ["Sabrina Nunes", "sabrina.nunes@escola.com"]
    ];

    for (const [name, email] of randomUsers) {
      try {
        await query("INSERT INTO users (name, email, role) VALUES ($1, $2, 'student')", [name, email]);
      } catch (e) { /* ignore duplicates */ }
    }
  }
}

const app = express();
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// API Routes
app.post("/api/login", async (req, res) => {
  const { email } = req.body;
  try {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(401).json({ error: "Usuário não encontrado" });
    }
  } catch (err) {
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const result = await query("SELECT * FROM users ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.post("/api/users", async (req, res) => {
  const { email, name, role } = req.body;
  try {
    const result = await query(
      "INSERT INTO users (email, name, role) VALUES ($1, $2, $3)",
      [email, name, role || 'student']
    );
    res.json({ email, name, role });
  } catch (e) {
    res.status(400).json({ error: "Email já cadastrado" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    await query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir" });
  }
});

app.get("/api/news", async (req, res) => {
  try {
    const result = await query("SELECT * FROM news ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.post("/api/news", upload.single("file"), async (req: any, res) => {
  const { title, content, image_url } = req.body;
  let finalImageUrl = image_url;
  
  if (req.file) {
    finalImageUrl = `/uploads/${req.file.filename}`;
  }

  try {
    await query(
      "INSERT INTO news (title, content, image_url) VALUES ($1, $2, $3)",
      [title, content, finalImageUrl]
    );
    res.json({ title, content, image_url: finalImageUrl });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar notícia" });
  }
});

app.delete("/api/news/:id", async (req, res) => {
  try {
    await query("DELETE FROM news WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir" });
  }
});

app.get("/api/activities", async (req, res) => {
  try {
    const result = await query("SELECT * FROM activities WHERE active = 1");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.post("/api/activities", upload.array("files", 5), async (req: any, res) => {
  const { title, image_url } = req.body;
  const results: any[] = [];

  try {
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const finalTitle = req.files.length > 1 ? `${title} (${i + 1})` : title;
        const finalUrl = `/uploads/${file.filename}`;
        await query(
          "INSERT INTO activities (title, image_url, active) VALUES ($1, $2, 1)",
          [finalTitle, finalUrl]
        );
        results.push({ title: finalTitle, image_url: finalUrl });
      }
    } else if (image_url) {
      await query(
        "INSERT INTO activities (title, image_url, active) VALUES ($1, $2, 1)",
        [title, image_url]
      );
      results.push({ title, image_url });
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar atividades" });
  }
});

app.delete("/api/activities/:id", async (req, res) => {
  try {
    await query("DELETE FROM activities WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir" });
  }
});

// Report Card Routes
app.get("/api/report-cards", async (req, res) => {
  const { userId } = req.query;
  try {
    if (userId) {
      const result = await query("SELECT * FROM report_cards WHERE user_id = $1 ORDER BY period ASC", [userId]);
      res.json(result.rows);
    } else {
      const result = await query(`
        SELECT rc.*, u.name as student_name 
        FROM report_cards rc 
        JOIN users u ON rc.user_id = u.id 
        ORDER BY u.name ASC, rc.period ASC
      `);
      res.json(result.rows);
    }
  } catch (err) {
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.post("/api/report-cards", upload.single("file"), async (req: any, res) => {
  const { user_id, period } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "Arquivo é obrigatório" });
  }

  const file_url = `/uploads/${file.filename}`;
  const file_name = file.originalname;

  try {
    await query(
      "INSERT INTO report_cards (user_id, file_url, file_name, period) VALUES ($1, $2, $3, $4)",
      [user_id, file_url, file_name, period]
    );
    res.json({ user_id, file_url, file_name, period });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar boletim" });
  }
});

app.delete("/api/report-cards/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query("DELETE FROM report_cards WHERE id = $1", [id]);
    if (result.rowCount && result.rowCount > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Boletim não encontrado" });
    }
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir" });
  }
});

// Poll Routes
app.get("/api/polls", async (req, res) => {
  const { userId } = req.query;
  try {
    const pollsResult = await query("SELECT * FROM polls WHERE active = 1 ORDER BY created_at DESC");
    const polls = pollsResult.rows;
    
    const pollsWithVotes = [];
    for (const poll of polls) {
      const options = JSON.parse(poll.options);
      const votesResult = await query(
        "SELECT option_index, COUNT(*) as count FROM votes WHERE poll_id = $1 GROUP BY option_index",
        [poll.id]
      );
      const votes = votesResult.rows;
      
      const results = options.map((opt: string, idx: number) => {
        const voteCount = votes.find((v: any) => v.option_index === idx);
        return { option: opt, count: voteCount ? parseInt(voteCount.count) : 0 };
      });

      let userVoted = null;
      if (userId) {
        const userVoteResult = await query(
          "SELECT option_index FROM votes WHERE poll_id = $1 AND user_id = $2",
          [poll.id, userId]
        );
        if (userVoteResult.rows.length > 0) {
          userVoted = userVoteResult.rows[0].option_index;
        }
      }

      pollsWithVotes.push({
        ...poll,
        options,
        results,
        userVoted
      });
    }

    res.json(pollsWithVotes);
  } catch (err) {
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.post("/api/polls", async (req, res) => {
  const { question, options } = req.body;
  try {
    await query(
      "INSERT INTO polls (question, options) VALUES ($1, $2)",
      [question, JSON.stringify(options)]
    );
    res.json({ question, options });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar enquete" });
  }
});

app.delete("/api/polls/:id", async (req, res) => {
  try {
    await query("DELETE FROM polls WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir" });
  }
});

app.post("/api/polls/:id/vote", async (req, res) => {
  const { userId, optionIndex } = req.body;
  const pollId = req.params.id;

  try {
    await query(
      "INSERT INTO votes (poll_id, user_id, option_index) VALUES ($1, $2, $3)",
      [pollId, userId, optionIndex]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Você já votou nesta enquete ou ocorreu um erro." });
  }
});

app.post("/api/send-email", upload.single("file"), async (req: any, res) => {
  const { to, subject, body } = req.body;
  const file = req.file;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("Simulating email send to:", to);
    if (file) fs.unlinkSync(file.path);
    return res.json({ success: true, message: "E-mail enviado com sucesso (Simulado)" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text: body,
      attachments: file ? [{ filename: file.originalname, path: file.path }] : [],
    });

    if (file) fs.unlinkSync(file.path);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Falha ao enviar e-mail" });
  }
});

async function startServer() {
  await initDb();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
