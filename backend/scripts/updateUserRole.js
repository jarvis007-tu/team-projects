require('dotenv').config();
const { sequelize } = require('../src/config/database');

async function updateUserRole() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected');

    const [results] = await sequelize.query(
      "UPDATE users SET role = 'admin' WHERE email = 'admin@hosteleats.com'"
    );
    
    console.log('User role updated successfully');

    // Verify the update
    const [users] = await sequelize.query(
      "SELECT user_id, full_name, email, role FROM users WHERE email = 'admin@hosteleats.com'"
    );
    
    console.log('Updated user:', users[0]);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateUserRole();