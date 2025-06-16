const express = require('express');
const router = express.Router();
const migrateDatabase = require('../migrate-database');
const resetDatabase = require('../reset-database');

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

// 🗑️ Database Reset Endpoint (CAREFUL! This deletes all data)
router.post('/reset-database', async (req, res) => {
  try {
    console.log('🗑️ Starting database reset via HTTP endpoint...');
    
    // Run the reset
    await resetDatabase();
    
    console.log('✅ Database reset completed successfully via HTTP');
    
    res.json({
      success: true,
      message: 'Database reset completed successfully! All data cleared.',
      warning: 'All user data, books, and sessions have been permanently deleted.',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database reset failed via HTTP:', error);
    
    res.status(500).json({
      success: false,
      message: 'Database reset failed',
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