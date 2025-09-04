const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Initialize Firebase Admin SDK
let initialized = false;

const initializeFirebase = () => {
  if (initialized) return;
  
  try {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        })
      });
      initialized = true;
      logger.info('Firebase Admin SDK initialized successfully');
    } else {
      logger.warn('Firebase configuration not found. Push notifications will be disabled.');
    }
  } catch (error) {
    logger.error('Error initializing Firebase:', error);
  }
};

class FirebaseService {
  constructor() {
    initializeFirebase();
  }

  // Send push notification to single device
  async sendPushNotification(deviceToken, payload) {
    if (!initialized) {
      logger.warn('Firebase not initialized. Skipping push notification.');
      return null;
    }

    try {
      const message = {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      logger.info(`Push notification sent successfully: ${response}`);
      return response;
    } catch (error) {
      logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Send push notification to multiple devices
  async sendMulticastNotification(deviceTokens, payload) {
    if (!initialized) {
      logger.warn('Firebase not initialized. Skipping multicast notification.');
      return null;
    }

    try {
      const message = {
        tokens: deviceTokens,
        notification: {
          title: payload.title,
          body: payload.body
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().sendMulticast(message);
      
      logger.info(`Multicast notification sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(deviceTokens[idx]);
            logger.error(`Failed to send to token ${deviceTokens[idx]}: ${resp.error}`);
          }
        });
        return { success: response.successCount, failed: failedTokens };
      }

      return { success: response.successCount, failed: [] };
    } catch (error) {
      logger.error('Error sending multicast notification:', error);
      throw error;
    }
  }

  // Send topic notification
  async sendTopicNotification(topic, payload) {
    if (!initialized) {
      logger.warn('Firebase not initialized. Skipping topic notification.');
      return null;
    }

    try {
      const message = {
        topic: topic,
        notification: {
          title: payload.title,
          body: payload.body
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default'
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      logger.info(`Topic notification sent successfully to ${topic}: ${response}`);
      return response;
    } catch (error) {
      logger.error('Error sending topic notification:', error);
      throw error;
    }
  }

  // Subscribe device to topic
  async subscribeToTopic(deviceToken, topic) {
    if (!initialized) {
      logger.warn('Firebase not initialized. Skipping topic subscription.');
      return null;
    }

    try {
      const response = await admin.messaging().subscribeToTopic(deviceToken, topic);
      logger.info(`Device subscribed to topic ${topic}: ${response.successCount} successful`);
      return response;
    } catch (error) {
      logger.error('Error subscribing to topic:', error);
      throw error;
    }
  }

  // Unsubscribe device from topic
  async unsubscribeFromTopic(deviceToken, topic) {
    if (!initialized) {
      logger.warn('Firebase not initialized. Skipping topic unsubscription.');
      return null;
    }

    try {
      const response = await admin.messaging().unsubscribeFromTopic(deviceToken, topic);
      logger.info(`Device unsubscribed from topic ${topic}: ${response.successCount} successful`);
      return response;
    } catch (error) {
      logger.error('Error unsubscribing from topic:', error);
      throw error;
    }
  }

  // Send data-only message (silent notification)
  async sendDataMessage(deviceToken, data) {
    if (!initialized) {
      logger.warn('Firebase not initialized. Skipping data message.');
      return null;
    }

    try {
      const message = {
        token: deviceToken,
        data: data,
        android: {
          priority: 'high'
        }
      };

      const response = await admin.messaging().send(message);
      logger.info(`Data message sent successfully: ${response}`);
      return response;
    } catch (error) {
      logger.error('Error sending data message:', error);
      throw error;
    }
  }

  // Validate device token
  async validateDeviceToken(deviceToken) {
    if (!initialized) {
      logger.warn('Firebase not initialized. Cannot validate token.');
      return false;
    }

    try {
      // Send a dry run message to validate the token
      const message = {
        token: deviceToken,
        notification: {
          title: 'Test',
          body: 'Test'
        }
      };

      await admin.messaging().send(message, true); // dry run
      return true;
    } catch (error) {
      logger.error(`Invalid device token: ${deviceToken}`);
      return false;
    }
  }
}

module.exports = new FirebaseService();