const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs-extra");

const DB_PATH = path.join(__dirname, "../../data/bot.db");
fs.ensureDirSync(path.dirname(DB_PATH));

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

function initDB() {
  const d = getDB();

  d.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      userID TEXT PRIMARY KEY,
      name TEXT DEFAULT 'Unknown',
      exp INTEGER DEFAULT 0,
      money INTEGER DEFAULT 0,
      banned INTEGER DEFAULT 0,
      joinedAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Threads (
      threadID TEXT PRIMARY KEY,
      name TEXT DEFAULT 'Unknown Thread',
      prefix TEXT DEFAULT '/',
      banned INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS CommandLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userID TEXT,
      threadID TEXT,
      command TEXT,
      args TEXT,
      success INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log("✅ Database initialized");
  return Promise.resolve();
}

// ─── User Model ───────────────────────────────────────────────────────────────
const User = {
  findOrCreate({ where, defaults }) {
    const d = getDB();
    const existing = d.prepare("SELECT * FROM Users WHERE userID = ?").get(where.userID);
    if (existing) {
      existing.banned = !!existing.banned;
      return Promise.resolve([existing, false]);
    }
    const now = new Date().toISOString();
    const row = { userID: where.userID, name: "Unknown", exp: 0, money: 0, banned: 0, joinedAt: now, updatedAt: now, ...defaults };
    d.prepare("INSERT OR IGNORE INTO Users (userID, name, exp, money, banned, joinedAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      row.userID, row.name || "Unknown", row.exp || 0, row.money || 0, row.banned ? 1 : 0, now, now
    );
    const created = d.prepare("SELECT * FROM Users WHERE userID = ?").get(row.userID);
    created.banned = !!created.banned;
    return Promise.resolve([created, true]);
  },

  findAll({ where, order, limit, offset } = {}) {
    const d = getDB();
    let sql = "SELECT * FROM Users";
    const params = [];
    if (where) {
      const clauses = Object.entries(where).map(([k, v]) => { params.push(v); return `${k} = ?`; });
      if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
    }
    if (order) {
      const [col, dir] = order[0];
      sql += ` ORDER BY ${col} ${dir || "ASC"}`;
    }
    if (limit) sql += ` LIMIT ${limit}`;
    if (offset) sql += ` OFFSET ${offset}`;
    const rows = d.prepare(sql).all(...params);
    rows.forEach(r => { r.banned = !!r.banned; r.save = () => User._save(r); r.update = (vals) => User._update(r.userID, vals); });
    return Promise.resolve(rows);
  },

  findOne({ where } = {}) {
    const d = getDB();
    let sql = "SELECT * FROM Users WHERE ";
    const params = [];
    const clauses = Object.entries(where).map(([k, v]) => { params.push(v); return `${k} = ?`; });
    sql += clauses.join(" AND ");
    const row = d.prepare(sql).get(...params);
    if (row) {
      row.banned = !!row.banned;
      row.save = () => User._save(row);
      row.update = (vals) => User._update(row.userID, vals);
    }
    return Promise.resolve(row || null);
  },

  count({ where } = {}) {
    const d = getDB();
    let sql = "SELECT COUNT(*) as c FROM Users";
    const params = [];
    if (where) {
      const clauses = Object.entries(where).map(([k, v]) => { params.push(v); return `${k} = ?`; });
      if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
    }
    return Promise.resolve(d.prepare(sql).get(...params).c);
  },

  _save(row) {
    const d = getDB();
    d.prepare("UPDATE Users SET name=?, exp=?, money=?, banned=?, updatedAt=? WHERE userID=?").run(
      row.name, row.exp, row.money, row.banned ? 1 : 0, new Date().toISOString(), row.userID
    );
    return Promise.resolve(row);
  },

  _update(userID, vals) {
    const d = getDB();
    const sets = [];
    const params = [];
    for (const [k, v] of Object.entries(vals)) {
      sets.push(`${k} = ?`);
      params.push(k === "banned" ? (v ? 1 : 0) : v);
    }
    sets.push("updatedAt = ?");
    params.push(new Date().toISOString());
    params.push(userID);
    d.prepare(`UPDATE Users SET ${sets.join(", ")} WHERE userID = ?`).run(...params);
    return Promise.resolve();
  },
};

// ─── Thread Model ─────────────────────────────────────────────────────────────
const Thread = {
  findOrCreate({ where, defaults }) {
    const d = getDB();
    const existing = d.prepare("SELECT * FROM Threads WHERE threadID = ?").get(where.threadID);
    if (existing) {
      existing.banned = !!existing.banned;
      return Promise.resolve([existing, false]);
    }
    const now = new Date().toISOString();
    const row = { threadID: where.threadID, name: "Unknown Thread", prefix: "/", banned: 0, ...defaults };
    d.prepare("INSERT OR IGNORE INTO Threads (threadID, name, prefix, banned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)").run(
      row.threadID, row.name, row.prefix || "/", row.banned ? 1 : 0, now, now
    );
    const created = d.prepare("SELECT * FROM Threads WHERE threadID = ?").get(row.threadID);
    created.banned = !!created.banned;
    created.save = () => Thread._save(created);
    created.update = (vals) => Thread._update(created.threadID, vals);
    return Promise.resolve([created, true]);
  },

  findAll({ where, limit, offset } = {}) {
    const d = getDB();
    let sql = "SELECT * FROM Threads";
    const params = [];
    if (where) {
      const clauses = Object.entries(where).map(([k, v]) => { params.push(v); return `${k} = ?`; });
      if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
    }
    if (limit) sql += ` LIMIT ${limit}`;
    if (offset) sql += ` OFFSET ${offset}`;
    const rows = d.prepare(sql).all(...params);
    rows.forEach(r => {
      r.banned = !!r.banned;
      r.save = () => Thread._save(r);
      r.update = (vals) => Thread._update(r.threadID, vals);
    });
    return Promise.resolve(rows);
  },

  findOne({ where } = {}) {
    const d = getDB();
    let sql = "SELECT * FROM Threads WHERE ";
    const params = [];
    const clauses = Object.entries(where).map(([k, v]) => { params.push(v); return `${k} = ?`; });
    sql += clauses.join(" AND ");
    const row = d.prepare(sql).get(...params);
    if (row) {
      row.banned = !!row.banned;
      row.save = () => Thread._save(row);
      row.update = (vals) => Thread._update(row.threadID, vals);
    }
    return Promise.resolve(row || null);
  },

  count({ where } = {}) {
    const d = getDB();
    let sql = "SELECT COUNT(*) as c FROM Threads";
    const params = [];
    if (where) {
      const clauses = Object.entries(where).map(([k, v]) => { params.push(v); return `${v === false ? 0 : v === true ? 1 : v}`; });
      if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
    }
    return Promise.resolve(d.prepare(sql).get(...params).c);
  },

  _save(row) {
    const d = getDB();
    d.prepare("UPDATE Threads SET name=?, prefix=?, banned=?, updatedAt=? WHERE threadID=?").run(
      row.name, row.prefix, row.banned ? 1 : 0, new Date().toISOString(), row.threadID
    );
    return Promise.resolve(row);
  },

  _update(threadID, vals) {
    const d = getDB();
    const sets = [];
    const params = [];
    for (const [k, v] of Object.entries(vals)) {
      sets.push(`${k} = ?`);
      params.push(k === "banned" ? (v ? 1 : 0) : v);
    }
    sets.push("updatedAt = ?");
    params.push(new Date().toISOString());
    params.push(threadID);
    d.prepare(`UPDATE Threads SET ${sets.join(", ")} WHERE threadID = ?`).run(...params);
    return Promise.resolve();
  },
};

// ─── CommandLog Model ─────────────────────────────────────────────────────────
const CommandLog = {
  create({ userID, threadID, command, args, success }) {
    const d = getDB();
    const now = new Date().toISOString();
    d.prepare("INSERT INTO CommandLogs (userID, threadID, command, args, success, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      userID, threadID, command, args || "", success !== false ? 1 : 0, now, now
    );
    return Promise.resolve();
  },

  findAll({ order, limit, offset } = {}) {
    const d = getDB();
    let sql = "SELECT * FROM CommandLogs";
    if (order) {
      const [col, dir] = order[0];
      sql += ` ORDER BY ${col} ${dir || "ASC"}`;
    }
    if (limit) sql += ` LIMIT ${limit}`;
    if (offset) sql += ` OFFSET ${offset}`;
    return Promise.resolve(d.prepare(sql).all());
  },

  count() {
    const d = getDB();
    return Promise.resolve(d.prepare("SELECT COUNT(*) as c FROM CommandLogs").get().c);
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getOrCreateUser(userID, name) {
  const [user] = await User.findOrCreate({ where: { userID }, defaults: { name: name || "Unknown" } });
  return user;
}

async function getOrCreateThread(threadID, name) {
  const [thread] = await Thread.findOrCreate({ where: { threadID }, defaults: { name: name || "Unknown Thread" } });
  return thread;
}

async function logCommand(userID, threadID, command, args, success = true) {
  const argsStr = Array.isArray(args) ? args.join(" ") : (args || "");
  await CommandLog.create({ userID, threadID, command, args: argsStr, success });
}

async function getStats() {
  const totalUsers = await User.count();
  const totalThreads = await Thread.count();
  const totalCommands = await CommandLog.count();
  const recentLogs = await CommandLog.findAll({ order: [["createdAt", "DESC"]], limit: 20 });
  return { totalUsers, totalThreads, totalCommands, recentLogs };
}

module.exports = {
  sequelize: null,
  User,
  Thread,
  CommandLog,
  initDB,
  getOrCreateUser,
  getOrCreateThread,
  logCommand,
  getStats,
};
