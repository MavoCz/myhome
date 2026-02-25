package net.voldrich.myhome.backend.notification.internal.repository;

import net.voldrich.myhome.backend.jooq.tables.Notifications;
import net.voldrich.myhome.backend.jooq.tables.records.NotificationsRecord;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class NotificationRepository {

    private static final Notifications N = Notifications.NOTIFICATIONS;
    private final DSLContext dsl;

    public NotificationRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public NotificationsRecord create(Long userId, Long familyId, String type, String title, String message, String data) {
        return dsl.insertInto(N)
                .set(N.USER_ID, userId)
                .set(N.FAMILY_ID, familyId)
                .set(N.TYPE, type)
                .set(N.TITLE, title)
                .set(N.MESSAGE, message)
                .set(N.DATA, data != null ? JSONB.jsonb(data) : null)
                .returning()
                .fetchOne();
    }

    public List<NotificationsRecord> findByUserId(Long userId) {
        return dsl.selectFrom(N)
                .where(N.USER_ID.eq(userId))
                .orderBy(N.CREATED_AT.desc())
                .limit(50)
                .fetchInto(NotificationsRecord.class);
    }

    public int markAsRead(Long id, Long userId) {
        return dsl.update(N)
                .set(N.READ, true)
                .where(N.ID.eq(id).and(N.USER_ID.eq(userId)))
                .execute();
    }

    public int markAllAsRead(Long userId) {
        return dsl.update(N)
                .set(N.READ, true)
                .where(N.USER_ID.eq(userId).and(N.READ.eq(false)))
                .execute();
    }

    public long countUnread(Long userId) {
        return dsl.selectCount()
                .from(N)
                .where(N.USER_ID.eq(userId).and(N.READ.eq(false)))
                .fetchOne(0, Long.class);
    }
}
