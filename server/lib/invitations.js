import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

import { query, queryOne } from './pg.js';

const LIMIT = parseInt(process.env.INVITATIONS_LIMIT) || 300;

const { GMAIL_CREDENTIALS, TRUSTPILOT_AFS_EMAIL } = process.env;
let transporter;
if (GMAIL_CREDENTIALS && TRUSTPILOT_AFS_EMAIL) {
  const key = JSON.parse(GMAIL_CREDENTIALS);
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: 'mailer@astian.org',
      serviceClient: key.client_id,
      privateKey: key.private_key,
      scope: 'https://mail.google.com/',
    },
  });
}

async function status() {
  return {
    enabled: await isEnabled(),
  };
}

async function send(email) {
  const enabled = await isEnabled();
  if (!enabled) return;

  const emailSha = crypto.createHash('sha1')
    .update(email + process.env.TRUSTPILOT_AFS_EMAIL)
    .digest('hex');
  const now = new Date();

  try {
    await query(
      'INSERT INTO invitations (_id, timestamp) VALUES ($1, $2) ON CONFLICT (_id) DO NOTHING',
      [emailSha, now]
    );
    if (transporter) {
      await transporter.sendMail({
        from: 'mailer@coin.space',
        to: TRUSTPILOT_AFS_EMAIL,
        subject: 'invitation',
        text: `
          <!-- <script type="application/json+trustpilot">
            {
              "recipientName": "User",
              "recipientEmail": "${email}",
              "referenceId": "cs${now.getTime()}"
            }
          </script> -->`,
      });
    }
  } catch (err) {
    if (err.code === '23505') return; // unique_violation
    await query('DELETE FROM invitations WHERE _id = $1', [emailSha]);
    console.log(err);
    throw err;
  }
}

async function isEnabled() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const row = await queryOne(
    'SELECT COUNT(*)::int AS count FROM invitations WHERE timestamp >= $1 AND timestamp < $2',
    [start, end]
  );
  return (row?.count || 0) < LIMIT;
}

export default {
  status,
  send,
};