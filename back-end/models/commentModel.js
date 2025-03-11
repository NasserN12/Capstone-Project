const db = require("../db");

const CommentModel = {
  create: async (commentData) => {
    const sql = `
      INSERT INTO comments (user_id, song_id, text, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW())
    `;
    const params = [commentData.user_id, commentData.song_id, commentData.text];
    return await db.query(sql, params);
  },

  getBySongId: async (songId) => {
    const sql = `
      SELECT c.id, c.text, c.created_at, u.username 
      FROM comments c 
      JOIN users u ON c.user_id = u.id
      WHERE c.song_id = ?
      ORDER BY c.created_at DESC
    `;
    return await db.query(sql, [songId]);
  },

  delete: async (commentId) => {
    const sql = `DELETE FROM comments WHERE id = ?`;
    return await db.query(sql, [commentId]);
  },
};

module.exports = CommentModel;