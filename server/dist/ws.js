import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'node:crypto';
import { db } from './db.js';
import { verifyToken } from './auth.js';
export function setupWebSocketServer(httpServer) {
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    // Map of userId -> Set of active WebSocket connections
    const userSockets = new Map();
    function broadcastToUser(userId, data) {
        const sockets = userSockets.get(userId);
        if (sockets) {
            const payload = JSON.stringify(data);
            for (const socket of sockets) {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(payload);
                }
            }
        }
    }
    async function broadcastPresence(userId, isOnline, lastSeenAt) {
        try {
            const peers = await db.all(`SELECT DISTINCT cp2.user_id
         FROM chat_participants cp1
         JOIN chat_participants cp2 ON cp2.chat_id = cp1.chat_id
         WHERE cp1.user_id = ? AND cp2.user_id != ?`, [userId, userId]);
            const event = {
                type: 'presence:change',
                payload: { userId, isOnline, lastSeenAt },
            };
            for (const peer of peers) {
                broadcastToUser(peer.user_id, event);
            }
        }
        catch (err) {
            console.error('Error broadcasting presence:', err);
        }
    }
    // Periodic heartbeat cleanup
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            const extWs = ws;
            if (extWs.isAlive === false) {
                return extWs.terminate();
            }
            extWs.isAlive = false;
            extWs.ping();
        });
    }, 30000);
    wss.on('close', () => {
        clearInterval(interval);
    });
    wss.on('connection', (ws) => {
        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
        });
        ws.on('message', async (rawData) => {
            try {
                const text = rawData.toString();
                const { type, payload } = JSON.parse(text);
                switch (type) {
                    case 'auth:identify': {
                        const token = payload?.token;
                        if (!token)
                            return;
                        const decoded = verifyToken(token);
                        if (!decoded)
                            return;
                        const userId = decoded.userId;
                        ws.userId = userId;
                        if (!userSockets.has(userId)) {
                            userSockets.set(userId, new Set());
                        }
                        userSockets.get(userId).add(ws);
                        const now = Date.now();
                        await db.run('UPDATE users SET is_online = 1, last_seen_at = ? WHERE id = ?', [now, userId]);
                        const user = await db.get('SELECT id, email, display_name, avatar_url, bio, is_online, last_seen_at, created_at FROM users WHERE id = ?', [userId]);
                        if (user) {
                            ws.send(JSON.stringify({ type: 'auth:success', payload: { user } }));
                        }
                        await broadcastPresence(userId, true, now);
                        // Mark any pending undelivered messages to this user as DELIVERED
                        const pending = await db.all(`SELECT dr.id, dr.message_id, m.chat_id, m.sender_id
               FROM delivery_receipts dr
               JOIN messages m ON m.id = dr.message_id
               WHERE dr.recipient_id = ? AND dr.status = 'SENT'`, [userId]);
                        if (pending.length > 0) {
                            for (const p of pending) {
                                await db.run("UPDATE delivery_receipts SET status = 'DELIVERED', updated_at = ? WHERE id = ?", [now, p.id]);
                                broadcastToUser(p.sender_id, {
                                    type: 'message:receipt_update',
                                    payload: {
                                        messageId: p.message_id,
                                        chatId: p.chat_id,
                                        status: 'DELIVERED',
                                        recipientId: userId,
                                    },
                                });
                            }
                        }
                        break;
                    }
                    case 'presence:heartbeat': {
                        if (!ws.userId)
                            return;
                        const now = Date.now();
                        await db.run('UPDATE users SET last_seen_at = ? WHERE id = ?', [now, ws.userId]);
                        break;
                    }
                    case 'typing:update': {
                        if (!ws.userId)
                            return;
                        const { chatId, isTyping } = payload;
                        if (!chatId)
                            return;
                        const participants = await db.all('SELECT user_id FROM chat_participants WHERE chat_id = ? AND user_id != ?', [chatId, ws.userId]);
                        const typingEvent = {
                            type: 'typing:change',
                            payload: {
                                chatId,
                                userId: ws.userId,
                                isTyping: !!isTyping,
                            },
                        };
                        for (const p of participants) {
                            broadcastToUser(p.user_id, typingEvent);
                        }
                        break;
                    }
                    case 'message:send': {
                        if (!ws.userId)
                            return;
                        const { clientMessageId, chatId, content, type: msgType = 'TEXT', mediaUrl, mediaMimeType, mediaSize, mediaName, parentMessageId, } = payload;
                        if (!chatId)
                            return;
                        const memberCheck = await db.get('SELECT id FROM chat_participants WHERE chat_id = ? AND user_id = ?', [chatId, ws.userId]);
                        if (!memberCheck)
                            return;
                        const messageId = crypto.randomUUID();
                        const now = Date.now();
                        await db.run(`INSERT INTO messages (id, chat_id, sender_id, parent_message_id, type, content, media_url, media_mime_type, media_size, media_name, is_deleted, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`, [
                            messageId,
                            chatId,
                            ws.userId,
                            parentMessageId || null,
                            msgType,
                            content || '',
                            mediaUrl || null,
                            mediaMimeType || null,
                            mediaSize || null,
                            mediaName || null,
                            now,
                            now,
                        ]);
                        await db.run('UPDATE chats SET updated_at = ? WHERE id = ?', [now, chatId]);
                        await db.run('UPDATE chat_participants SET last_read_at = ? WHERE chat_id = ? AND user_id = ?', [now, chatId, ws.userId]);
                        const recipients = await db.all('SELECT user_id FROM chat_participants WHERE chat_id = ? AND user_id != ?', [chatId, ws.userId]);
                        let hasDelivered = false;
                        const sender = (await db.get('SELECT display_name, avatar_url FROM users WHERE id = ?', [ws.userId])) || { display_name: 'User', avatar_url: '' };
                        const messagePayload = {
                            id: messageId,
                            chat_id: chatId,
                            sender_id: ws.userId,
                            sender_name: sender.display_name,
                            sender_avatar: sender.avatar_url,
                            parent_message_id: parentMessageId || null,
                            type: msgType,
                            content: content || '',
                            media_url: mediaUrl || null,
                            media_mime_type: mediaMimeType || null,
                            media_size: mediaSize || null,
                            media_name: mediaName || null,
                            is_deleted: 0,
                            created_at: now,
                            updated_at: now,
                        };
                        for (const r of recipients) {
                            const isRecipientOnline = userSockets.has(r.user_id) && userSockets.get(r.user_id).size > 0;
                            const status = isRecipientOnline ? 'DELIVERED' : 'SENT';
                            if (isRecipientOnline)
                                hasDelivered = true;
                            await db.run(`INSERT INTO delivery_receipts (id, message_id, recipient_id, status, updated_at)
                 VALUES (?, ?, ?, ?, ?)`, [crypto.randomUUID(), messageId, r.user_id, status, now]);
                            broadcastToUser(r.user_id, {
                                type: 'message:new',
                                payload: { message: messagePayload },
                            });
                        }
                        const initialStatus = hasDelivered ? 'DELIVERED' : 'SENT';
                        ws.send(JSON.stringify({
                            type: 'message:ack',
                            payload: {
                                clientMessageId,
                                message: {
                                    ...messagePayload,
                                    delivery_status: initialStatus,
                                },
                            },
                        }));
                        break;
                    }
                    case 'message:receipt': {
                        if (!ws.userId)
                            return;
                        const { messageId, chatId, status } = payload;
                        if (!messageId || !chatId || !['DELIVERED', 'READ'].includes(status))
                            return;
                        const now = Date.now();
                        if (status === 'READ') {
                            await db.run('UPDATE chat_participants SET last_read_at = ? WHERE chat_id = ? AND user_id = ?', [now, chatId, ws.userId]);
                            await db.run(`UPDATE delivery_receipts
                 SET status = 'READ', updated_at = ?
                 WHERE recipient_id = ? AND message_id IN (
                   SELECT id FROM messages WHERE chat_id = ? AND sender_id != ?
                 ) AND status != 'READ'`, [now, ws.userId, chatId, ws.userId]);
                        }
                        else {
                            await db.run(`UPDATE delivery_receipts
                 SET status = 'DELIVERED', updated_at = ?
                 WHERE message_id = ? AND recipient_id = ? AND status = 'SENT'`, [now, messageId, ws.userId]);
                        }
                        const msg = await db.get('SELECT sender_id FROM messages WHERE id = ?', [messageId]);
                        if (msg && msg.sender_id !== ws.userId) {
                            broadcastToUser(msg.sender_id, {
                                type: 'message:receipt_update',
                                payload: {
                                    messageId,
                                    chatId,
                                    status,
                                    recipientId: ws.userId,
                                },
                            });
                        }
                        break;
                    }
                }
            }
            catch (err) {
                console.error('WebSocket message parsing error:', err);
            }
        });
        ws.on('close', async () => {
            if (ws.userId) {
                const sockets = userSockets.get(ws.userId);
                if (sockets) {
                    sockets.delete(ws);
                    if (sockets.size === 0) {
                        userSockets.delete(ws.userId);
                        const now = Date.now();
                        await db.run('UPDATE users SET is_online = 0, last_seen_at = ? WHERE id = ?', [now, ws.userId]);
                        await broadcastPresence(ws.userId, false, now);
                    }
                }
            }
        });
    });
    return wss;
}
