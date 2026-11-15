import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { broadcastToUser } from '../ws.js';
import type { Chat, Message, User } from '../types.js';

export const chatRouter = Router();

// Search users to start new chat - NEVER exposes all users unless searched!
// NEVER returns email or phone to keep privacy complete!
chatRouter.get('/users/search', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUserId = req.user!.id;
  const q = String(req.query.q || '').trim();

  // If search query is empty or less than 2 characters, return empty list!
  if (!q || q.length < 2) {
    res.json({ users: [] });
    return;
  }

  const cleanQuery = q.replace(/^@/, '');
  const pattern = `%${cleanQuery}%`;

  // Search by username, anon_tag, or display_name ONLY - NO email, NO phone!
  const foundUsers = await db.all<{
    id: string;
    display_name: string;
    username: string | null;
    anon_tag: string | null;
    avatar_url: string;
    bio: string;
    is_online: number;
    last_seen_at: number;
    created_at: number;
  }>(
    `SELECT id, display_name, username, anon_tag, avatar_url, bio, is_online, last_seen_at, created_at
     FROM users
     WHERE id != ? AND (username LIKE ? OR anon_tag LIKE ? OR display_name LIKE ?)
     LIMIT 20`,
    [currentUserId, pattern, pattern, pattern]
  );

  // Check relationship for each user
  const usersWithRelation = await Promise.all(
    foundUsers.map(async (u) => {
      // 1. Is there an existing direct chat?
      const directChat = await db.get<{ id: string }>(
        `SELECT c.id FROM chats c
         JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = ?
         JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = ?
         WHERE c.type = 'DIRECT' LIMIT 1`,
        [currentUserId, u.id]
      );

      if (directChat) {
        return {
          ...u,
          relationship: 'CONNECTED',
          chatId: directChat.id,
        };
      }

      // 2. Is there a contact request between them?
      const reqRow = await db.get<{ id: string; sender_id: string; receiver_id: string; status: string }>(
        `SELECT id, sender_id, receiver_id, status FROM contact_requests
         WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
         ORDER BY updated_at DESC LIMIT 1`,
        [currentUserId, u.id, u.id, currentUserId]
      );

      if (reqRow) {
        if (reqRow.status === 'ACCEPTED') {
          return { ...u, relationship: 'CONNECTED' };
        }
        if (reqRow.status === 'PENDING') {
          if (reqRow.sender_id === currentUserId) {
            return { ...u, relationship: 'REQUEST_SENT', requestId: reqRow.id };
          } else {
            return { ...u, relationship: 'REQUEST_RECEIVED', requestId: reqRow.id };
          }
        }
      }

      return { ...u, relationship: 'NONE' };
    })
  );

  res.json({ users: usersWithRelation });
});

// List all chats for current user
chatRouter.get('/chats', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUserId = req.user!.id;

  const chatRows = await db.all<Chat & { last_read_at: number }>(
    `SELECT c.*, cp.last_read_at
     FROM chats c
     JOIN chat_participants cp ON cp.chat_id = c.id
     WHERE cp.user_id = ?
     ORDER BY c.updated_at DESC`,
    [currentUserId]
  );

  const detailedChats = await Promise.all(
    chatRows.map(async (chat) => {
      const participants = await db.all<User>(
        `SELECT u.id, u.display_name, u.username, u.avatar_url, u.bio, u.is_online, u.last_seen_at, u.created_at, u.anon_tag
         FROM users u
         JOIN chat_participants cp ON cp.user_id = u.id
         WHERE cp.chat_id = ?`,
        [chat.id]
      );

      const lastMessage = (await db.get<Message>(
        `SELECT m.*, u.display_name as sender_name, u.avatar_url as sender_avatar
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.chat_id = ?
         ORDER BY m.created_at DESC
         LIMIT 1`,
        [chat.id]
      )) || null;

      if (lastMessage && lastMessage.sender_id === currentUserId) {
        const receipts = await db.all<{ status: string }>(
          'SELECT status FROM delivery_receipts WHERE message_id = ?',
          [lastMessage.id]
        );
        if (receipts.length > 0) {
          if (receipts.every((r) => r.status === 'READ')) {
            lastMessage.delivery_status = 'READ';
          } else if (receipts.some((r) => r.status === 'DELIVERED' || r.status === 'READ')) {
            lastMessage.delivery_status = 'DELIVERED';
          } else {
            lastMessage.delivery_status = 'SENT';
          }
        } else {
          lastMessage.delivery_status = 'SENT';
        }
      }

      const unreadResult = (await db.get<{ unread: number }>(
        `SELECT COUNT(*) as unread
         FROM messages
         WHERE chat_id = ? AND sender_id != ? AND created_at > ?`,
        [chat.id, currentUserId, chat.last_read_at]
      )) || { unread: 0 };

      return {
        id: chat.id,
        type: chat.type,
        name: chat.name,
        avatar_url: chat.avatar_url,
        description: chat.description,
        created_by: chat.created_by,
        created_at: Number(chat.created_at),
        updated_at: Number(chat.updated_at),
        participants,
        last_message: lastMessage,
        unread_count: Number(unreadResult.unread),
      };
    })
  );

  res.json({ chats: detailedChats });
});

// Start or retrieve a 1:1 direct chat
chatRouter.post('/chats/direct', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUserId = req.user!.id;
  const { recipientId } = req.body;

  if (!recipientId || recipientId === currentUserId) {
    res.status(400).json({ error: 'Valid recipient ID is required' });
    return;
  }

  const userCheck = await db.get('SELECT id FROM users WHERE id = ?', [recipientId]);
  if (!userCheck) {
    res.status(404).json({ error: 'Recipient user not found' });
    return;
  }

  const existing = await db.get<{ id: string }>(
    `SELECT c.id
     FROM chats c
     JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = ?
     JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = ?
     WHERE c.type = 'DIRECT'
     LIMIT 1`,
    [currentUserId, recipientId]
  );

  if (existing) {
    res.json({ chatId: existing.id });
    return;
  }

  const chatId = crypto.randomUUID();
  const now = Date.now();

  await db.run(
    `INSERT INTO chats (id, type, name, avatar_url, description, created_by, created_at, updated_at)
     VALUES (?, 'DIRECT', NULL, '', '', ?, ?, ?)`,
    [chatId, currentUserId, now, now]
  );

  await db.run(
    `INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at, last_read_at)
     VALUES (?, ?, ?, 'MEMBER', ?, ?)`,
    [crypto.randomUUID(), chatId, currentUserId, now, now]
  );

  await db.run(
    `INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at, last_read_at)
     VALUES (?, ?, ?, 'MEMBER', ?, ?)`,
    [crypto.randomUUID(), chatId, recipientId, now, 0]
  );

  res.status(201).json({ chatId });
});

// Create a new group chat
chatRouter.post('/chats/group', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUserId = req.user!.id;
  const { name, participantIds, description, avatarUrl } = req.body;

  if (!name || !String(name).trim()) {
    res.status(400).json({ error: 'Group name is required' });
    return;
  }

  const cleanName = String(name).trim();
  const rawIds = Array.isArray(participantIds) ? participantIds : [];
  const uniqueMemberIds = Array.from(new Set([currentUserId, ...rawIds]));

  if (uniqueMemberIds.length < 2) {
    res.status(400).json({ error: 'A group requires at least one other participant' });
    return;
  }

  const chatId = crypto.randomUUID();
  const now = Date.now();
  const defaultGroupAvatar =
    avatarUrl ||
    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=1e38b6,4376fb`;

  await db.run(
    `INSERT INTO chats (id, type, name, avatar_url, description, created_by, created_at, updated_at)
     VALUES (?, 'GROUP', ?, ?, ?, ?, ?, ?)`,
    [chatId, cleanName, defaultGroupAvatar, description || '', currentUserId, now, now]
  );

  for (const uid of uniqueMemberIds) {
    const role = uid === currentUserId ? 'ADMIN' : 'MEMBER';
    await db.run(
      `INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at, last_read_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), chatId, uid, role, now, uid === currentUserId ? now : 0]
    );
  }

  res.status(201).json({ chatId });
});

// Get message history for a chat
chatRouter.get('/chats/:chatId/messages', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUserId = req.user!.id;
  const chatId = String(req.params.chatId);

  const partCheck = await db.get(
    'SELECT id FROM chat_participants WHERE chat_id = ? AND user_id = ?',
    [chatId, currentUserId]
  );

  if (!partCheck) {
    res.status(403).json({ error: 'You are not a member of this chat' });
    return;
  }

  const messages = await db.all<Message>(
    `SELECT m.*, u.display_name as sender_name, u.avatar_url as sender_avatar
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.chat_id = ?
     ORDER BY m.created_at ASC
     LIMIT 200`,
    [chatId]
  );

  for (const msg of messages) {
    msg.created_at = Number(msg.created_at);
    msg.updated_at = Number(msg.updated_at);

    if (msg.sender_id === currentUserId) {
      const receipts = await db.all<{ status: string }>(
        'SELECT status FROM delivery_receipts WHERE message_id = ?',
        [msg.id]
      );
      if (receipts.length > 0) {
        if (receipts.every((r) => r.status === 'READ')) {
          msg.delivery_status = 'READ';
        } else if (receipts.some((r) => r.status === 'DELIVERED' || r.status === 'READ')) {
          msg.delivery_status = 'DELIVERED';
        } else {
          msg.delivery_status = 'SENT';
        }
      } else {
        msg.delivery_status = 'SENT';
      }
    }
  }

  res.json({ messages });
});

// Mark messages in a chat as READ for the current user
chatRouter.post('/chats/:chatId/read', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUserId = req.user!.id;
  const chatId = String(req.params.chatId);
  const now = Date.now();

  await db.run(
    'UPDATE chat_participants SET last_read_at = ? WHERE chat_id = ? AND user_id = ?',
    [now, chatId, currentUserId]
  );

  await db.run(
    `UPDATE delivery_receipts
     SET status = 'READ', updated_at = ?
     WHERE recipient_id = ? AND message_id IN (
       SELECT id FROM messages WHERE chat_id = ? AND sender_id != ?
     ) AND status != 'READ'`,
    [now, currentUserId, chatId, currentUserId]
  );

  res.json({ success: true, timestamp: now });
});

// STATUS UPDATES (Stories)
chatRouter.get('/status', requireAuth, async (_req: AuthenticatedRequest, res): Promise<void> => {
  const since = Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours
  const rows = await db.all<{
    id: string;
    user_id: string;
    text: string;
    media_url: string | null;
    bg_color: string;
    created_at: number;
    display_name: string;
    avatar_url: string;
    username: string | null;
  }>(
    `SELECT s.*, u.display_name, u.avatar_url, u.username
     FROM status_updates s
     JOIN users u ON u.id = s.user_id
     WHERE s.created_at >= ?
     ORDER BY s.created_at DESC`,
    [since]
  );

  res.json({ statuses: rows });
});

chatRouter.post('/status', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUserId = req.user!.id;
  const { text, mediaUrl, bgColor } = req.body;

  if (!text && !mediaUrl) {
    res.status(400).json({ error: 'Status must include text or an image' });
    return;
  }

  const statusId = crypto.randomUUID();
  const now = Date.now();

  await db.run(
    `INSERT INTO status_updates (id, user_id, text, media_url, bg_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [statusId, currentUserId, text ? String(text).trim() : '', mediaUrl || null, bgColor || '#10b981', now]
  );

  res.status(201).json({
    status: {
      id: statusId,
      user_id: currentUserId,
      text: text ? String(text).trim() : '',
      media_url: mediaUrl || null,
      bg_color: bgColor || '#10b981',
      created_at: now,
      display_name: req.user!.display_name,
      avatar_url: req.user!.avatar_url,
      username: req.user!.username || null,
    },
  });
});

// CALL LOGS
chatRouter.get('/calls', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUserId = req.user!.id;

  const logs = await db.all(
    `SELECT cl.*,
            caller.display_name as caller_name, caller.avatar_url as caller_avatar,
            receiver.display_name as receiver_name, receiver.avatar_url as receiver_avatar
     FROM call_logs cl
     JOIN users caller ON caller.id = cl.caller_id
     JOIN users receiver ON receiver.id = cl.receiver_id
     WHERE cl.caller_id = ? OR cl.receiver_id = ?
     ORDER BY cl.created_at DESC
     LIMIT 50`,
    [currentUserId, currentUserId]
  );

  res.json({ calls: logs });
});

chatRouter.post('/calls', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const callerId = req.user!.id;
  const { receiverId, chatId, type, status, duration } = req.body;

  if (!receiverId || !type || !status) {
    res.status(400).json({ error: 'Missing call logging parameters' });
    return;
  }

  const callId = crypto.randomUUID();
  const now = Date.now();

  await db.run(
    `INSERT INTO call_logs (id, caller_id, receiver_id, chat_id, type, status, duration, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [callId, callerId, receiverId, chatId || null, type, status, duration || 0, now]
  );

  res.status(201).json({ success: true, callId });
});

// ==========================================
// CONTACT REQUESTS (INSTAGRAM-STYLE MUTUAL CONNECT)
// ==========================================

// Get pending incoming contact requests for current user
chatRouter.get('/contacts/pending', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUserId = req.user!.id;

  const rows = await db.all<{
    id: string;
    sender_id: string;
    created_at: number;
    display_name: string;
    username: string | null;
    anon_tag: string | null;
    avatar_url: string;
    bio: string;
  }>(
    `SELECT cr.id, cr.sender_id, cr.created_at,
            u.display_name, u.username, u.anon_tag, u.avatar_url, u.bio
     FROM contact_requests cr
     JOIN users u ON u.id = cr.sender_id
     WHERE cr.receiver_id = ? AND cr.status = 'PENDING'
     ORDER BY cr.created_at DESC`,
    [currentUserId]
  );

  res.json({ requests: rows });
});

// Send a contact request to another user
chatRouter.post('/contacts/request', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const senderId = req.user!.id;
  const { targetUserId } = req.body;

  if (!targetUserId || targetUserId === senderId) {
    res.status(400).json({ error: 'Valid target user ID is required' });
    return;
  }

  const target = await db.get('SELECT id, display_name FROM users WHERE id = ?', [targetUserId]);
  if (!target) {
    res.status(404).json({ error: 'Target user not found' });
    return;
  }

  const existing = await db.get<{ id: string; status: string }>(
    'SELECT id, status FROM contact_requests WHERE sender_id = ? AND receiver_id = ?',
    [senderId, targetUserId]
  );

  const now = Date.now();
  let requestId = existing ? existing.id : crypto.randomUUID();

  if (existing) {
    await db.run(
      "UPDATE contact_requests SET status = 'PENDING', updated_at = ? WHERE id = ?",
      [now, existing.id]
    );
  } else {
    await db.run(
      "INSERT INTO contact_requests (id, sender_id, receiver_id, status, created_at, updated_at) VALUES (?, ?, ?, 'PENDING', ?, ?)",
      [requestId, senderId, targetUserId, now, now]
    );
  }

  // Real-time notification to target user
  broadcastToUser(targetUserId, {
    type: 'contact:request_received',
    payload: {
      requestId,
      senderId,
      senderName: req.user!.display_name,
      senderUsername: req.user!.username || req.user!.anon_tag,
      senderAvatar: req.user!.avatar_url,
    },
  });

  res.status(201).json({ success: true, requestId, status: 'PENDING' });
});

// Respond to a contact request (ACCEPT / DECLINE)
chatRouter.post('/contacts/respond', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUserId = req.user!.id;
  const { requestId, action } = req.body;

  if (!requestId || (action !== 'ACCEPT' && action !== 'DECLINE')) {
    res.status(400).json({ error: 'Valid requestId and action (ACCEPT/DECLINE) required' });
    return;
  }

  const request = await db.get<{ id: string; sender_id: string; receiver_id: string; status: string }>(
    'SELECT * FROM contact_requests WHERE id = ? AND receiver_id = ?',
    [requestId, currentUserId]
  );

  if (!request) {
    res.status(404).json({ error: 'Contact request not found' });
    return;
  }

  const now = Date.now();

  if (action === 'DECLINE') {
    await db.run("UPDATE contact_requests SET status = 'DECLINED', updated_at = ? WHERE id = ?", [now, requestId]);
    res.json({ success: true, status: 'DECLINED' });
    return;
  }

  // Action is ACCEPT:
  await db.run("UPDATE contact_requests SET status = 'ACCEPTED', updated_at = ? WHERE id = ?", [now, requestId]);

  // Create or get direct chat
  const otherUserId = request.sender_id;
  let chat = await db.get<{ id: string }>(
    `SELECT c.id
     FROM chats c
     JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = ?
     JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = ?
     WHERE c.type = 'DIRECT' LIMIT 1`,
    [currentUserId, otherUserId]
  );

  let chatId = chat ? chat.id : crypto.randomUUID();

  if (!chat) {
    await db.run(
      `INSERT INTO chats (id, type, name, avatar_url, description, created_by, created_at, updated_at)
       VALUES (?, 'DIRECT', NULL, '', '', ?, ?, ?)`,
      [chatId, otherUserId, now, now]
    );

    await db.run(
      `INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at, last_read_at)
       VALUES (?, ?, ?, 'MEMBER', ?, ?)`,
      [crypto.randomUUID(), chatId, otherUserId, now, now]
    );

    await db.run(
      `INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at, last_read_at)
       VALUES (?, ?, ?, 'MEMBER', ?, ?)`,
      [crypto.randomUUID(), chatId, currentUserId, now, now]
    );
  }

  // Real-time broadcast to the requester
  broadcastToUser(otherUserId, {
    type: 'contact:request_accepted',
    payload: {
      chatId,
      acceptedByUserId: currentUserId,
      acceptedByName: req.user!.display_name,
    },
  });

  res.json({ success: true, status: 'ACCEPTED', chatId });
});
