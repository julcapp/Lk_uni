require('dotenv').config();
const db = require('./config/postgres');
const { createApp } = require('./src/app');

const app = createApp({ db });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Lk_uni Auth Core запущен на порту ${PORT}`);
});
