package br.com.rodrinoxpro.portal;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class RodrinoxMessagingService extends FirebaseMessagingService {
    @Override public void onNewToken(String token) {
        super.onNewToken(token);
        android.util.Log.i("RodrinoxFCM", "Token FCM atualizado");
    }
    @Override public void onMessageReceived(RemoteMessage message) {
        super.onMessageReceived(message);
        String title = message.getNotification() == null ? message.getData().getOrDefault("titulo", "Rodrinox Pro") : message.getNotification().getTitle();
        String body = message.getNotification() == null ? message.getData().getOrDefault("mensagem", "Nova mensagem") : message.getNotification().getBody();
        if (title == null) title = "Rodrinox Pro";
        if (body == null) body = "Nova mensagem";
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(new NotificationChannel("rodrinox_mensagens", "Mensagens Rodrinox Pro", NotificationManager.IMPORTANCE_HIGH));
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder notification = new NotificationCompat.Builder(this, "rodrinox_mensagens")
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle(title).setContentText(body).setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_HIGH).setContentIntent(pending);
        manager.notify((int)(System.currentTimeMillis() % Integer.MAX_VALUE), notification.build());
    }
}
