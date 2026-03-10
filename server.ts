import express from "express";
import { createServer as createViteServer } from "vite";
import { Pool } from "pg";
import path from "path";
import fs from "fs";
import multer from "multer";
import nodemailer from "nodemailer";

// Configuration from environment variables
const UPLOADS_DIR = process.env.UPLOADS_PATH || path.resolve("uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// PostgreSQL Connection
if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is not defined. The app will likely fail to connect to the database.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false }
});

// Initialize Database
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        role TEXT DEFAULT 'student',
        name TEXT
      );

      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        image_url TEXT NOT NULL,
        active INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS report_cards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        file_url TEXT NOT NULL,
        file_name TEXT NOT NULL,
        period TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS polls (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        options TEXT NOT NULL, -- JSON array of strings
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        poll_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        option_index INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_poll FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE,
        CONSTRAINT fk_vote_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(poll_id, user_id)
      );
    `);

    // Seed admin if not exists
    const adminCheck = await client.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
    if (adminCheck.rows.length === 0) {
      await client.query("INSERT INTO users (email, role, name) VALUES ($1, $2, $3)", ["admin@escola.com", "admin", "Administrador"]);
    }

    // Seed random users if empty
    const userCount = await client.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
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
          await client.query("INSERT INTO users (name, email, role) VALUES ($1, $2, 'student')", [name, email]);
        } catch (e) { /* ignore duplicates */ }
      }
    }

    // Seed News
    const newsCount = await client.query("SELECT COUNT(*) as count FROM news");
    if (parseInt(newsCount.rows[0].count) === 0) {
      const newsData = [
        [
          "Grande Final do Torneio Interclasses!",
          "A emoção tomou conta da nossa escola! Amanhã teremos a grande decisão do campeonato de futsal. Preparem suas torcidas, tragam seus cartazes e venham apoiar seus colegas. O esporte une nossa comunidade e fortalece nossos laços!",
          "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=1000"
        ],
        [
          "Feira de Ciências 2026",
          "Nossos alunos estão preparando projetos incríveis para a feira deste ano. Venha prestigiar as inovações e descobertas científicas que serão apresentadas no auditório principal.",
          "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=1000"
        ],
        [
          "Workshop de Robótica",
          "Inscrições abertas para o workshop de robótica básica. Uma oportunidade única para aprender programação e montagem de circuitos de forma prática e divertida.",
          "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1000"
        ],
        [
          "Novo Cardápio da Cantina",
          "A partir de segunda-feira, teremos novas opções saudáveis e deliciosas em nosso cardápio. Confira as novidades e aproveite uma alimentação equilibrada.",
          "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=1000"
        ]
      ];
      for (const [title, content, url] of newsData) {
        await client.query("INSERT INTO news (title, content, image_url) VALUES ($1, $2, $3)", [title, content, url]);
      }
    }

    // Seed Poll
    const pollCount = await client.query("SELECT COUNT(*) as count FROM polls");
    if (parseInt(pollCount.rows[0].count) === 0) {
      await client.query("INSERT INTO polls (question, options) VALUES ($1, $2)", [
        "Qual deve ser o tema da nossa próxima festa cultural?",
        JSON.stringify(["Festa das Nações", "Arraiá da Escola", "Noite de Talentos", "Feira Gastronômica"])
      ]);
    }

    // Seed Activities
    const actCount = await client.query("SELECT COUNT(*) as count FROM activities");
    if (parseInt(actCount.rows[0].count) === 0) {
      const activities = [
        ["Abertura dos Jogos: O desfile das turmas marcou o início da nossa jornada esportiva.", "https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&q=80&w=1000"],
        ["Competição de Vôlei: Trabalho em equipe e muita garra nas quadras.", "https://images.unsplash.com/photo-1592656670411-b1553043958f?auto=format&fit=crop&q=80&w=1000"],
        ["Premiação e Encerramento: Celebrando o esforço de todos os nossos atletas.", "https://images.unsplash.com/photo-1578267153662-c96559bb39ac?auto=format&fit=crop&q=80&w=1000"]
      ];
      for (const [title, url] of activities) {
        await client.query("INSERT INTO activities (title, image_url, active) VALUES ($1, $2, 1)", [title, url]);
      }
    }

  } finally {
    client.release();
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
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
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
    const result = await pool.query("SELECT * FROM users ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.post("/api/users", async (req, res) => {
  const { email, name, role } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING *",
      [email, name, role || 'student']
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(400).json({ error: "Email já cadastrado" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir" });
  }
});

app.get("/api/news", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM news ORDER BY created_at DESC");
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
    const result = await pool.query(
      "INSERT INTO news (title, content, image_url) VALUES ($1, $2, $3) RETURNING *",
      [title, content, finalImageUrl]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar notícia" });
  }
});

app.delete("/api/news/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM news WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir" });
  }
});

app.get("/api/activities", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM activities WHERE active = 1");
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
        const result = await pool.query(
          "INSERT INTO activities (title, image_url, active) VALUES ($1, $2, 1) RETURNING *",
          [finalTitle, finalUrl]
        );
        results.push(result.rows[0]);
      }
    } else if (image_url) {
      const result = await pool.query(
        "INSERT INTO activities (title, image_url, active) VALUES ($1, $2, 1) RETURNING *",
        [title, image_url]
      );
      results.push(result.rows[0]);
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar atividades" });
  }
});

app.delete("/api/activities/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM activities WHERE id = $1", [req.params.id]);
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
      const result = await pool.query("SELECT * FROM report_cards WHERE user_id = $1 ORDER BY period ASC", [userId]);
      res.json(result.rows);
    } else {
      const result = await pool.query(`
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
    const result = await pool.query(
      "INSERT INTO report_cards (user_id, file_url, file_name, period) VALUES ($1, $2, $3, $4) RETURNING *",
      [user_id, file_url, file_name, period]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar boletim" });
  }
});

app.delete("/api/report-cards/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM report_cards WHERE id = $1", [id]);
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
    const pollsResult = await pool.query("SELECT * FROM polls WHERE active = 1 ORDER BY created_at DESC");
    const polls = pollsResult.rows;
    
    const pollsWithVotes = [];
    for (const poll of polls) {
      const options = JSON.parse(poll.options);
      const votesResult = await pool.query(
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
        const userVoteResult = await pool.query(
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
    const result = await pool.query(
      "INSERT INTO polls (question, options) VALUES ($1, $2) RETURNING *",
      [question, JSON.stringify(options)]
    );
    res.json({ ...result.rows[0], options });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar enquete" });
  }
});

app.delete("/api/polls/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM polls WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir" });
  }
});

app.post("/api/polls/:id/vote", async (req, res) => {
  const { userId, optionIndex } = req.body;
  const pollId = req.params.id;

  try {
    await pool.query(
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
