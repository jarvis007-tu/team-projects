require('dotenv').config();

module.exports = {
  development: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/hostel_mess_db',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true, // build indexes automatically
      maxPoolSize: parseInt(process.env.DB_POOL_MAX) || 10,
      minPoolSize: parseInt(process.env.DB_POOL_MIN) || 2,
      serverSelectionTimeoutMS: 5000, // keep trying to send operations for 5s
      socketTimeoutMS: 45000, // close sockets after 45s of inactivity
    }
  },
  test: {
    uri: process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/hostel_mess_test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: false,
      maxPoolSize: 5
    }
  },
  production: {
    uri: process.env.MONGO_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: false, // better performance
      maxPoolSize: parseInt(process.env.DB_POOL_MAX) || 20,
      minPoolSize: parseInt(process.env.DB_POOL_MIN) || 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 60000,
    }
  }
};




// require('dotenv').config();

// module.exports = {
//   development: {
//     username: process.env.DB_USER || 'root',
//     password: process.env.DB_PASSWORD || '',
//     database: process.env.DB_NAME || 'hostel_mess_db',
//     host: process.env.DB_HOST || 'localhost',
//     port: process.env.DB_PORT || 3306,
//     dialect: 'mysql',
//     timezone: '+05:30',
//     define: {
//       timestamps: true,
//       underscored: false,
//       freezeTableName: true,
//       paranoid: true
//     }
//   },
//   test: {
//     username: process.env.DB_USER || 'root',
//     password: process.env.DB_PASSWORD || '',
//     database: process.env.DB_NAME || 'hostel_mess_test',
//     host: process.env.DB_HOST || 'localhost',
//     port: process.env.DB_PORT || 3306,
//     dialect: 'mysql',
//     timezone: '+05:30'
//   },
//   production: {
//     username: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     dialect: 'mysql',
//     timezone: '+05:30',
//     logging: false,
//     pool: {
//       max: 10,
//       min: 2,
//       acquire: 30000,
//       idle: 10000
//     }
//   }
// };

