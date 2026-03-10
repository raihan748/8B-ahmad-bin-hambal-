const express = require('express');
const router = express.Router();
const { getDb } = require('../db/setup');

// GET /api/leaderboard - top 5 students
router.get('/leaderboard', (req, res) => {
    const db = getDb();
    const top5 = db.prepare('SELECT id, name, nis, points, avatar_color FROM students ORDER BY points DESC LIMIT 5').all();
    db.close();
    res.json(top5);
});

// GET /api/students - for public grade lookup
router.get('/students', (req, res) => {
    const db = getDb();
    const q = req.query.q || '';
    const students = db.prepare(
        `SELECT id, name, nis, class, points, avatar_color FROM students WHERE name LIKE ? OR nis LIKE ? ORDER BY name`
    ).all(`%${q}%`, `%${q}%`);
    db.close();
    res.json(students);
});

// GET /api/assignments - public
router.get('/assignments', (req, res) => {
    const db = getDb();
    const assignments = db.prepare('SELECT * FROM assignments ORDER BY due_date ASC').all();
    db.close();
    res.json(assignments);
});

// GET /api/grades/:studentId
router.get('/grades/:studentId', (req, res) => {
    const db = getDb();
    const grades = db.prepare(`
    SELECT g.score, g.points_awarded, g.graded_at,
           a.title as assignment_title, a.subject, a.due_date
    FROM grades g
    JOIN assignments a ON a.id = g.assignment_id
    WHERE g.student_id = ?
    ORDER BY g.graded_at DESC
  `).all(req.params.studentId);
    db.close();
    res.json(grades);
});

// GET /api/chat - last 50 messages
router.get('/chat', (req, res) => {
    const db = getDb();
    const messages = db.prepare('SELECT * FROM chat_messages ORDER BY id DESC LIMIT 50').all().reverse();
    db.close();
    res.json(messages);
});

// GET /api/forum - all posts
router.get('/forum', (req, res) => {
    const db = getDb();
    const posts = db.prepare(`
    SELECT p.*, COUNT(r.id) as reply_count
    FROM forum_posts p
    LEFT JOIN forum_replies r ON r.post_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all();
    db.close();
    res.json(posts);
});

// GET /api/forum/:id
router.get('/forum/:id', (req, res) => {
    const db = getDb();
    const post = db.prepare('SELECT * FROM forum_posts WHERE id = ?').get(req.params.id);
    if (!post) { db.close(); return res.status(404).json({ error: 'Not found' }); }
    const replies = db.prepare('SELECT * FROM forum_replies WHERE post_id = ? ORDER BY created_at ASC').all(req.params.id);
    db.close();
    res.json({ post, replies });
});

// POST /api/forum — create post
router.post('/forum', (req, res) => {
    const { title, body, author, category } = req.body;
    if (!title || !body || !author) return res.json({ success: false, message: 'Missing fields.' });
    const db = getDb();
    const result = db.prepare('INSERT INTO forum_posts (title, body, author, category) VALUES (?, ?, ?, ?)')
        .run(title, body, author, category || 'Umum');
    db.close();
    res.json({ success: true, id: result.lastInsertRowid });
});

// POST /api/forum/:id/reply
router.post('/forum/:id/reply', (req, res) => {
    const { body, author } = req.body;
    if (!body || !author) return res.json({ success: false, message: 'Missing fields.' });
    const db = getDb();
    const result = db.prepare('INSERT INTO forum_replies (post_id, body, author) VALUES (?, ?, ?)')
        .run(req.params.id, body, author);
    db.close();
    res.json({ success: true, id: result.lastInsertRowid });
});

// GET /api/gallery - all photos
router.get('/gallery', (req, res) => {
    const db = getDb();
    const images = db.prepare('SELECT * FROM gallery ORDER BY uploaded_at DESC').all();
    db.close();
    res.json(images);
});

module.exports = router;
