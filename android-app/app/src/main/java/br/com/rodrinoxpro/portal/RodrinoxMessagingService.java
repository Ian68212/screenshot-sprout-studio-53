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
        // O token será associado ao usuário autenticado quando o app abrir ou voltar ao primeiro plano.
        // Não enviar tokens sem a sessão autenticada do Portal.
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        Map<String, String> data = message.getData();
        boolean call = "call".equals(data.get("type"));
        String title = data.get("title");
        String body = data.get("body");
        if (title == null || title.isEmpty()) title = call ? "Chamada Rodrinox Pro" : "Nova mensagem Rodrinox Pro";
        if (body == null || body.isEmpty()) body = call ? "Abra o aplicativo para atender." : "Você recebeu uma nova mensagem.";

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        String channelId = call ? CHANNEL_CALLS : CHANNEL_MESSAGES;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                channelId,
                call ? "Chamadas" : "Mensagens",
                call ? NotificationManager.IMPORTANCE_HIGH : NotificationManager.IMPORTANCE_DEFAULT
            );
            manager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, channelId)
            : new Notification.Builder(this);
        builder.setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setAutoCancel(true)
            .setContentIntent(pending);
        if (Build.VERSION.SDK_INT < 26) builder.setDefaults(Notification.DEFAULT_ALL);
        manager.notify((int) (System.currentTimeMillis() % Integer.MAX_VALUE), builder.build());
    }
}
