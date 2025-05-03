export const checkNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const scheduleNotification = (title: string, dateTime: Date) => {
  const now = new Date().getTime();
  const scheduledTime = dateTime.getTime();
  const timeoutId = setTimeout(() => {
    new Notification(title, {
      body: 'Reminder for your memory item',
      icon: '/favicon.ico', // Add your app icon path
    });
  }, scheduledTime - now);

  return timeoutId;
};