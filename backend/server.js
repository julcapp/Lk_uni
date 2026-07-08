require('dotenv').config();
const express = require('express');
const authRoutes = require('./routes/auth.routes');

const app = express();
app.set('trust proxy', 1); // корректный req.ip за реверс-прокси (nginx и т.п.)

app.use(express.json());
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Auth server запущен на порту ${PORT}`);
});
