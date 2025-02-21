const SongModel = require('../models/songModel');
const { uploadToS3 } = require('../middleware/upload');

const songController = {
  upload: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const songUrl = await uploadToS3(req.files.song[0], 'songs');

      let coverUrl = null;
      if (req.files?.cover) {
        coverUrl = await uploadToS3(req.files.cover[0], 'covers');
      }
      
      const songData = {
        title: req.body.title || req.file.originalname.split('.')[0],
        artistName: req.body.artistName || 'Unknown Artist',
        genre: req.body.genre || 'Unknown Genre', 
        duration: req.body.duration || 0,
        fileUrl: songUrl,
        song_photo_url: coverUrl
      };

      const result = await SongModel.create(songData);
      
      res.status(201).json({
        message: 'Song uploaded successfully',
        song: { songId: result.insertId, ...songData }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload song' });
    }
  },

  getAllSongs: async (req, res) => {
    try {
      const songs = await SongModel.getAll();
      res.json(songs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch songs' });
    }
  }
};

module.exports = songController;