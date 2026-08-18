const express = require('express');
const router = express.Router();
const webpush = require('web-push');

webpush.setVapidDetails(
  process.env.CONTACT_EMAIL || 'mailto:test@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

router.post('/schedule', async (req, res) => {
  const { subscription, delaySeconds } = req.body;

  if (!subscription || !delaySeconds) {
    return res.status(400).json({ error: 'Missing subscription or delaySeconds' });
  }

  res.status(200).json({ message: 'Push scheduled' });

  const payload = JSON.stringify({
    title: 'Rest Time Over!',
    body: "Time for your next set! Let's get it.",
    icon: '/workout-tracker/pwa-192x192.png'
  });

  setTimeout(async () => {
    try {
      await webpush.sendNotification(subscription, payload);
      console.log('Push notification sent successfully');
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }, delaySeconds * 1000);
});

module.exports = router;
