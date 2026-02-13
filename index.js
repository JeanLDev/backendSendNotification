const express = require('express');
const webPush = require('web-push');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(bodyParser.json());

/* =========================
   CONFIGURAÇÕES
========================= */

// 🔐 SUAS CHAVES VAPID
const publicVapidKey = 'BPdCV380_JJmNoUz06DTVU-Z9FRwbTzJj-ihwjssonLsH_n19RN7OTszAeJ1T9HC1x8EzM07-wLNZ0L-e2AbNLw';
const privateVapidKey = 'kguaxcvAx29Q7uH1MNtxYkYVX8wZHfAm1QWu-Dw_NVA';

webPush.setVapidDetails(
  'mailto:jeanldev@hotmail.com',
  publicVapidKey,
  privateVapidKey
);

// 🗄️ SUPABASE
const supabase = createClient(
  'https://ctqvqftwplpgviavcevn.supabase.co',
  'sb_secret_uM_e67iGVaL9Iv_zgNiIbA_G-_6cmCB'
);

/* =========================
   ENVIAR NOTIFICAÇÃO
========================= */

app.post('/send-to-user', async (req, res) => {
  const { user_id, title, body } = req.body;

  try {
    const { data, error } = await supabase
      .from('clinica_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)
      .single();

    if (error || !data) {
      return res.status(404).send('Subscription não encontrada');
    }

    const payload = JSON.stringify({
      title,
      body
    });

    await webPush.sendNotification(data.subscription, payload);

    res.send({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

/* =========================
   START SERVIDOR
========================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor rodando na porta', PORT);
});
