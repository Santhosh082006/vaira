require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ 
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
client.connect().then(() => {
  return client.query('SELECT * FROM "Category"');
}).then(res => {
  console.log('Tables exist! Category count:', res.rows.length);
}).catch(err => {
  console.error('Database Error:', err.message);
}).finally(() => {
  client.end();
});
