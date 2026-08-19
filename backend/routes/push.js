const express = require('express');
const router = express.Router();
const webpush = require('web-push');

webpush.setVapidDetails(
  process.env.CONTACT_EMAIL || 'mailto:test@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const pushTimers = new Map();

router.post('/schedule', async (req, res) => {
  const { subscription, delaySeconds } = req.body;

  if (!subscription || !delaySeconds) {
    return res.status(400).json({ error: 'Missing subscription or delaySeconds' });
  }

  const taskId = `push_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  res.status(200).json({ message: 'Push scheduled', taskId });

  const payload = JSON.stringify({
    title: 'Rest Time Over!',
    body: "Time for your next set! Let's get it.",
    icon: '/workout-tracker/pwa-192x192.png'
  });

  const timerId = setTimeout(async () => {
    try {
      pushTimers.delete(taskId);
      await webpush.sendNotification(subscription, payload);
      console.log('Push notification sent successfully');
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }, delaySeconds * 1000);

  pushTimers.set(taskId, timerId);
});

router.post('/cancel', (req, res) => {
  const { taskId } = req.body;
  if (taskId && pushTimers.has(taskId)) {
    clearTimeout(pushTimers.get(taskId));
    pushTimers.delete(taskId);
    return res.status(200).json({ message: 'Push cancelled' });
  }
  res.status(404).json({ message: 'Task not found or already executed' });
});

module.exports = router;
