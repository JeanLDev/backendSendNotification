require('dotenv').config();

const webPush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

/* =========================
   VALIDAR VARIÁVEIS
========================= */

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  throw new Error('Chaves VAPID não configuradas');
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Supabase não configurado');
}

/* =========================
   CONFIGURAÇÕES
========================= */

webPush.setVapidDetails(
  'mailto:jeanldev@hotmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* =========================
   HANDLER SERVERLESS
========================= */

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Método não permitido');
  }

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
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from('clinica_subscriptions')
              .delete()
              .eq('subscription', sub.subscription);
          }
        }
      })
    );

    res.status(200).json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).send('Erro interno');
  }
};
