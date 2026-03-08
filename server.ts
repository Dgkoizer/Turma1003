import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import multer from "multer";
import nodemailer from "nodemailer";

const db = new Database("school.db");

// Ensure uploads directory exists
const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'student',
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS report_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    period TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    options TEXT NOT NULL, -- JSON array of strings
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    option_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(poll_id, user_id)
  );
`);

// Seed admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (email, role, name) VALUES (?, ?, ?)").run("admin@escola.com", "admin", "Administrador");
}

// Seed 19 random users if table is empty (except admin)
const userCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get() as { count: number };
if (userCount.count < 10) {
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

  const insertUser = db.prepare("INSERT INTO users (name, email, role) VALUES (?, ?, 'student')");
  randomUsers.forEach(([name, email]) => {
    try {
      insertUser.run(name, email);
    } catch (e) {
      // Ignore duplicates
    }
  });

  // Seed News
  const newsCount = db.prepare("SELECT COUNT(*) as count FROM news").get() as { count: number };
  if (newsCount.count === 0) {
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
    const insertNews = db.prepare("INSERT INTO news (title, content, image_url) VALUES (?, ?, ?)");
    newsData.forEach(([title, content, url]) => insertNews.run(title, content, url));
  }

  // Seed Poll
  const pollCount = db.prepare("SELECT COUNT(*) as count FROM polls").get() as { count: number };
  if (pollCount.count === 0) {
    db.prepare("INSERT INTO polls (question, options) VALUES (?, ?)").run(
      "Qual deve ser o tema da nossa próxima festa cultural?",
      JSON.stringify(["Festa das Nações", "Arraiá da Escola", "Noite de Talentos", "Feira Gastronômica"])
    );
  }

  // Seed Activities (Carousel)
  const actCount = db.prepare("SELECT COUNT(*) as count FROM activities").get() as { count: number };
  if (actCount.count === 0) {
    const activities = [
      ["Abertura dos Jogos: O desfile das turmas marcou o início da nossa jornada esportiva.", "https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&q=80&w=1000"],
      ["Competição de Vôlei: Trabalho em equipe e muita garra nas quadras.", "https://images.unsplash.com/photo-1592656670411-b1553043958f?auto=format&fit=crop&q=80&w=1000"],
      ["Premiação e Encerramento: Celebrando o esforço de todos os nossos atletas.", "https://images.unsplash.com/photo-1578267153662-c96559bb39ac?auto=format&fit=crop&q=80&w=1000"]
    ];
    const insertAct = db.prepare("INSERT INTO activities (title, image_url, active) VALUES (?, ?, 1)");
    activities.forEach(([title, url]) => insertAct.run(title, url));
  }
}

const app = express();
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// API Routes
app.post("/api/login", (req, res) => {
  const { email } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (user) {
    res.json(user);
  } else {
    res.status(401).json({ error: "Usuário não encontrado" });
  }
});

app.get("/api/users", (req, res) => {
  const users = db.prepare("SELECT * FROM users").all();
  res.json(users);
});

app.post("/api/users", (req, res) => {
  const { email, name, role } = req.body;
  try {
    const info = db.prepare("INSERT INTO users (email, name, role) VALUES (?, ?, ?)").run(email, name, role || 'student');
    res.json({ id: info.lastInsertRowid, email, name, role });
  } catch (e) {
    res.status(400).json({ error: "Email já cadastrado" });
  }
});

app.delete("/api/users/:id", (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/news", (req, res) => {
  const news = db.prepare("SELECT * FROM news ORDER BY created_at DESC").all();
  res.json(news);
});

app.post("/api/news", upload.single("file"), (req: any, res) => {
  const { title, content, image_url } = req.body;
  let finalImageUrl = image_url;
  
  if (req.file) {
    finalImageUrl = `/uploads/${req.file.filename}`;
  }

  const info = db.prepare("INSERT INTO news (title, content, image_url) VALUES (?, ?, ?)").run(title, content, finalImageUrl);
  res.json({ id: info.lastInsertRowid, title, content, image_url: finalImageUrl });
});

app.delete("/api/news/:id", (req, res) => {
  db.prepare("DELETE FROM news WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/activities", (req, res) => {
  const activities = db.prepare("SELECT * FROM activities WHERE active = 1").all();
  res.json(activities);
});

app.post("/api/activities", upload.array("files", 5), (req: any, res) => {
  const { title, image_url } = req.body;
  const results: any[] = [];

  if (req.files && req.files.length > 0) {
    const insert = db.prepare("INSERT INTO activities (title, image_url, active) VALUES (?, ?, 1)");
    req.files.forEach((file: any, index: number) => {
      const finalTitle = req.files.length > 1 ? `${title} (${index + 1})` : title;
      const finalUrl = `/uploads/${file.filename}`;
      const info = insert.run(finalTitle, finalUrl);
      results.push({ id: info.lastInsertRowid, title: finalTitle, image_url: finalUrl });
    });
  } else if (image_url) {
    const info = db.prepare("INSERT INTO activities (title, image_url, active) VALUES (?, ?, 1)").run(title, image_url);
    results.push({ id: info.lastInsertRowid, title, image_url });
  }

  res.json(results);
});

app.delete("/api/activities/:id", (req, res) => {
  db.prepare("DELETE FROM activities WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Report Card Routes
app.get("/api/report-cards", (req, res) => {
  const { userId } = req.query;
  if (userId) {
    const cards = db.prepare("SELECT * FROM report_cards WHERE user_id = ? ORDER BY period ASC").all(userId);
    res.json(cards);
  } else {
    const cards = db.prepare(`
      SELECT rc.*, u.name as student_name 
      FROM report_cards rc 
      JOIN users u ON rc.user_id = u.id 
      ORDER BY u.name ASC, rc.period ASC
    `).all();
    res.json(cards);
  }
});

app.post("/api/report-cards", upload.single("file"), (req: any, res) => {
  const { user_id, period } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "Arquivo é obrigatório" });
  }

  // In a real app, we'd move this to a public folder or cloud storage
  // For this demo, we'll just store the path
  const file_url = `/uploads/${file.filename}`;
  const file_name = file.originalname;

  const info = db.prepare("INSERT INTO report_cards (user_id, file_url, file_name, period) VALUES (?, ?, ?, ?)").run(user_id, file_url, file_name, period);
  res.json({ id: info.lastInsertRowid, user_id, file_url, file_name, period });
});

app.use("/uploads", express.static(path.resolve("uploads")));

app.delete("/api/report-cards/:id", (req, res) => {
  const { id } = req.params;
  console.log(`[DELETE] Request to delete report card with ID: ${id}`);
  
  if (!id || isNaN(Number(id))) {
    console.error(`[DELETE] Invalid ID provided: ${id}`);
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const result = db.prepare("DELETE FROM report_cards WHERE id = ?").run(Number(id));
    console.log(`[DELETE] DB result: changes=${result.changes}`);
    
    if (result.changes > 0) {
      console.log(`[DELETE] Successfully deleted report card ${id}`);
      res.json({ success: true });
    } else {
      console.warn(`[DELETE] No report card found with ID ${id}`);
      res.status(404).json({ error: "Boletim não encontrado" });
    }
  } catch (err) {
    console.error(`[DELETE] Error deleting report card ${id}:`, err);
    res.status(500).json({ error: "Erro interno ao excluir" });
  }
});

// Poll Routes
app.get("/api/polls", (req, res) => {
  const { userId } = req.query;
  const polls = db.prepare("SELECT * FROM polls WHERE active = 1 ORDER BY created_at DESC").all();
  
  const pollsWithVotes = polls.map((poll: any) => {
    const options = JSON.parse(poll.options);
    const votes = db.prepare("SELECT option_index, COUNT(*) as count FROM votes WHERE poll_id = ? GROUP BY option_index").all(poll.id);
    
    const results = options.map((opt: string, idx: number) => {
      const voteCount = votes.find((v: any) => v.option_index === idx);
      return { option: opt, count: voteCount ? voteCount.count : 0 };
    });

    let userVoted = null;
    if (userId) {
      userVoted = db.prepare("SELECT option_index FROM votes WHERE poll_id = ? AND user_id = ?").get(poll.id, userId);
    }

    return {
      ...poll,
      options,
      results,
      userVoted: userVoted ? userVoted.option_index : null
    };
  });

  res.json(pollsWithVotes);
});

app.post("/api/polls", (req, res) => {
  const { question, options } = req.body;
  const info = db.prepare("INSERT INTO polls (question, options) VALUES (?, ?)").run(question, JSON.stringify(options));
  res.json({ id: info.lastInsertRowid, question, options });
});

app.delete("/api/polls/:id", (req, res) => {
  db.prepare("DELETE FROM polls WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post("/api/polls/:id/vote", (req, res) => {
  const { userId, optionIndex } = req.body;
  const pollId = req.params.id;

  try {
    db.prepare("INSERT INTO votes (poll_id, user_id, option_index) VALUES (?, ?, ?)").run(pollId, userId, optionIndex);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Você já votou nesta enquete ou ocorreu um erro." });
  }
});

app.post("/api/send-email", upload.single("file"), async (req: any, res) => {
  const { to, subject, body } = req.body;
  const file = req.file;

  // In a real scenario, you'd use process.env for these
  // For this demo, we'll simulate the success if credentials aren't set
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("Simulating email send to:", to);
    console.log("Subject:", subject);
    console.log("Body:", body);
    if (file) console.log("Attachment:", file.originalname);
    
    // Clean up upload
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

startServer();
