const { User } = require('../src/models');
const logger = require('../src/utils/logger');

async function makeUserAdmin() {
  try {
    // Find user by email
    const user = await User.findOne({
      where: { email: 'admin@hosteleats.com' }
    });

    if (!user) {
      console.log('User not found with email: admin@hosteleats.com');
      return;
    }

    // Update user role to admin
    await user.update({ role: 'admin' });
    
    console.log(`User ${user.full_name} (${user.email}) has been updated to admin role`);
    console.log('User details:', {
      id: user.user_id,
      name: user.full_name,
      email: user.email,
      role: user.role
    });

    process.exit(0);
  } catch (error) {
    console.error('Error updating user role:', error);
    process.exit(1);
  }
}

makeUserAdmin();