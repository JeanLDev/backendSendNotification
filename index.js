require('dotenv').config();

const express = require('express');
const webPush = require('web-push');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(bodyParser.json());

/* =========================
   VALIDAR VARIÁVEIS DE AMBIENTE
========================= */

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  throw new Error('Chaves VAPID não configuradas no .env');
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Supabase não configurado no .env');
}

/* =========================
   CONFIGURAÇÕES
========================= */

// 🔐 VAPID
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

webPush.setVapidDetails(
  'mailto:jeanldev@hotmail.com',
  publicVapidKey,
  privateVapidKey
);

// 🗄️ SUPABASE
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* =========================
   ENVIAR NOTIFICAÇÃO
========================= */

app.post('/send-to-user', async (req, res) => {
  const { user_id, title, body } = req.body;

  if (!user_id || !title || !body) {
    return res.status(400).send('Dados incompletos');
  }

  try {
    const { data, error } = await supabase
      .from('clinica_subscriptions')
      .select('subscription')
      .eq('user_id', user_id);

    if (error || !data || data.length === 0) {
      return res.status(404).send('Subscription não encontrada');
    }

    const payload = JSON.stringify({ title, body });

    await Promise.all(
      data.map(async (sub) => {
        try {
          await webPush.sendNotification(sub.subscription, payload);
        } catch (err) {
          // remove subscription inválida automaticamente
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from('clinica_subscriptions')
              .delete()
              .eq('subscription', sub.subscription);
          } else {
            console.error('Erro ao enviar push:', err.message);
          }
        }
      })
    );

    res.send({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).send('Erro interno do servidor');
  }
});

/* =========================
   START SERVIDOR
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
