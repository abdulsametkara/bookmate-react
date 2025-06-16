#!/bin/bash
echo "🚀 Running database migration on production..."

# Set environment to use production DATABASE_URL
export NODE_ENV=production

# Run the migration script
npm run migrate-db

echo "✅ Migration completed!" 