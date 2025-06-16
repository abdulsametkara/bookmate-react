const express = require('express');
const router = express.Router();
const migrateDatabase = require('../migrate-database');

// 🔧 Database Migration Endpoint (Admin only)
router.post('/migrate-database', async (req, res) => {
  try {
    console.log('🚀 Starting database migration via HTTP endpoint...');
    
    // Run the migration
    await migrateDatabase();
    
    console.log('✅ Database migration completed successfully via HTTP');
    
    res.json({
      success: true,
      message: 'Database migration completed successfully!',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database migration failed via HTTP:', error);
    
    res.status(500).json({
      success: false,
      message: 'Database migration failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🏥 Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Admin routes are working'
  });
});

module.exports = router; 