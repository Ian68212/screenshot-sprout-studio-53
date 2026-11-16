package br.com.rodrinoxpro.portal;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.annotation.NonNull;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class RodrinoxMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL_MESSAGES = "rodrinox_mensagens";
    private static final String CHANNEL_CALLS = "rodrinox_chamadas";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        getSharedPreferences("rodrinox_push", MODE_PRIVATE)
            .edit().putString("fcm_token", token).apply();
        // O vínculo autenticado ao usuário é feito pela MainActivity após abrir o portal.
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        Map<String, String> data = message.getData();
        boolean isCall = "call".equals(data.get("type"));
        String title = data.getOrDefault("title", isCall ? "Chamada Rodrinox Pro" : "Rodrinox Pro");
        String body = data.getOrDefault("body", isCall
            ? "Você está recebendo uma chamada."
            : "Você recebeu uma nova mensagem.");

        NotificationManager manager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        String channelId = isCall ? CHANNEL_CALLS : CHANNEL_MESSAGES;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                channelId,
                isCall ? "Chamadas" : "Mensagens",
                isCall ? NotificationManager.IMPORTANCE_HIGH : NotificationManager.IMPORTANCE_DEFAULT
            );
            manager.createNotificationChannel(channel);
        }

        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, isCall ? 7202 : 7203, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, channelId)
            : new Notification.Builder(this);
        builder.setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setCategory(isCall ? Notification.CATEGORY_CALL : Notification.CATEGORY_MESSAGE);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            builder.setPriority(isCall ? Notification.PRIORITY_HIGH : Notification.PRIORITY_DEFAULT);
            builder.setDefaults(Notification.DEFAULT_ALL);
        }
        manager.notify((int) (System.currentTimeMillis() & 0x7fffffff), builder.build());
    }
}
