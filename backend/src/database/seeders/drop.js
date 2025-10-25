require('dotenv').config();
const { connectDB, disconnectDB, mongoose } = require('../../config/mongodb');
const logger = require('../../utils/logger');
const readline = require('readline');

async function dropDatabase() {
  try {
    // Create readline interface for confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Ask for confirmation
    rl.question('Are you sure you want to drop the entire database? This action cannot be undone. (yes/no): ', async (answer) => {
      if (answer.toLowerCase() !== 'yes') {
        logger.info('Database drop cancelled.');
        rl.close();
        process.exit(0);
      }

      try {
        // Connect to database
        await connectDB();
        logger.info('Connected to MongoDB');

        // Get database name
        const dbName = mongoose.connection.db.databaseName;
        logger.warn(`Dropping database: ${dbName}`);

        // Drop the database
        await mongoose.connection.dropDatabase();

        logger.info('Database dropped successfully!');
        logger.warn('All data has been permanently deleted.');

        await disconnectDB();
        rl.close();
        process.exit(0);
      } catch (error) {
        logger.error('Failed to drop database:', error);
        await disconnectDB();
        rl.close();
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

// Run drop
dropDatabase();
