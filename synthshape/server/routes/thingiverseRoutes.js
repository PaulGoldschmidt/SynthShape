const express = require('express');
const axios = require('axios');
const router = express.Router();
const dotenv = require('dotenv');

dotenv.config();

const THINGIVERSE_API_KEY = process.env.THINGIVERSE_API_KEY || '';
const THINGIVERSE_BASE_URL = 'https://api.thingiverse.com';

/**
 * Search Thingiverse for 3D models
 */
router.get('/search', async (req, res) => {
  try {
    const { query, page = 1, perPage = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const response = await axios.get(`${THINGIVERSE_BASE_URL}/search/${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${THINGIVERSE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        page,
        per_page: perPage
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error searching Thingiverse:', error);
    res.status(500).json({ error: 'Failed to search Thingiverse' });
  }
});

/**
 * Get a thing by ID
 */
router.get('/things/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await axios.get(`${THINGIVERSE_BASE_URL}/things/${id}`, {
      headers: {
        'Authorization': `Bearer ${THINGIVERSE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching thing ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch thing from Thingiverse' });
  }
});

/**
 * Get files for a thing
 */
router.get('/things/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await axios.get(`${THINGIVERSE_BASE_URL}/things/${id}/files`, {
      headers: {
        'Authorization': `Bearer ${THINGIVERSE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching files for thing ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch files from Thingiverse' });
  }
});

/**
 * Download an STL file
 */
router.get('/files/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await axios.get(`${THINGIVERSE_BASE_URL}/files/${id}/download`, {
      headers: {
        'Authorization': `Bearer ${THINGIVERSE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });
    
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename=thingiverse_${id}.stl`);
    res.send(response.data);
  } catch (error) {
    console.error(`Error downloading file ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to download file from Thingiverse' });
  }
});

module.exports = router;