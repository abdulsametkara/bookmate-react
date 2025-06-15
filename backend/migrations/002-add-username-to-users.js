'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add username column
    await queryInterface.addColumn('users', 'username', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      defaultValue: '',
      validate: {
        len: [3, 20],
        is: /^[a-zA-Z0-9_]+$/
      }
    });

    // Add index for faster username searches
    await queryInterface.addIndex('users', ['username'], {
      unique: true,
      name: 'users_username_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index
    await queryInterface.removeIndex('users', 'users_username_unique');
    
    // Remove column
    await queryInterface.removeColumn('users', 'username');
  }
}; 