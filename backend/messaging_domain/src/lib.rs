use candid::Principal;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Conversation {
    pub id: String,
    pub club_id: String,
    pub team_id: Option<String>,
    pub participants: Vec<Principal>,
    pub next_sequence: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Message {
    pub conversation_id: String,
    pub id: String,
    pub sender: Principal,
    pub body: String,
    pub sequence: u64,
    pub idempotency_key: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Receipt {
    pub conversation_id: String,
    pub user: Principal,
    pub message_id: String,
    pub read: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UnreadState {
    pub conversation_id: String,
    pub user: Principal,
    pub count: u64,
    pub last_read_sequence: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BlockRecord {
    pub blocker: Principal,
    pub blocked: Principal,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MessagingDomain {
    governor: Principal,
    conversations: Vec<Conversation>,
    messages: Vec<Message>,
    receipts: Vec<Receipt>,
    unread: Vec<UnreadState>,
    blocks: Vec<BlockRecord>,
}

impl MessagingDomain {
    pub fn new(governor: Principal) -> Self {
        Self {
            governor,
            conversations: vec![],
            messages: vec![],
            receipts: vec![],
            unread: vec![],
            blocks: vec![],
        }
    }

    pub fn create_conversation(
        &mut self,
        actor: Principal,
        club_id: &str,
        team_id: Option<&str>,
        participants: &[Principal],
    ) -> Result<Conversation, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated caller required".into());
        }
        if participants.is_empty() || !participants.contains(&actor) {
            return Err("Conversation participants invalid".into());
        }
        let conversation = Conversation {
            id: format!("chat-{}-{}", club_id, self.conversations.len() + 1),
            club_id: club_id.to_string(),
            team_id: team_id.map(str::to_string),
            participants: participants.to_vec(),
            next_sequence: 1,
        };
        self.conversations.push(conversation.clone());
        Ok(conversation)
    }

    pub fn can_access_conversation(&self, actor: Principal, conversation_id: &str) -> bool {
        self.conversations.iter().any(|conversation| {
            conversation.id == conversation_id && conversation.participants.contains(&actor)
        })
    }

    pub fn block_user(&mut self, actor: Principal, blocked: Principal) -> Result<(), String> {
        if actor == Principal::anonymous() || blocked == Principal::anonymous() {
            return Err("Authenticated users required".into());
        }
        if actor == blocked {
            return Err("Cannot block self".into());
        }
        if !self
            .blocks
            .iter()
            .any(|entry| entry.blocker == actor && entry.blocked == blocked)
        {
            self.blocks.push(BlockRecord {
                blocker: actor,
                blocked,
            });
        }
        Ok(())
    }

    pub fn unblock_user(&mut self, actor: Principal, blocked: Principal) -> Result<(), String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated user required".into());
        }
        self.blocks
            .retain(|entry| !(entry.blocker == actor && entry.blocked == blocked));
        Ok(())
    }

    fn blocked_by_participant(&self, actor: Principal, conversation_id: &str) -> bool {
        self.conversations
            .iter()
            .find(|conversation| conversation.id == conversation_id)
            .map(|conversation| {
                conversation.participants.iter().any(|participant| {
                    self.blocks
                        .iter()
                        .any(|entry| entry.blocker == *participant && entry.blocked == actor)
                })
            })
            .unwrap_or(false)
    }

    pub fn send_message(
        &mut self,
        actor: Principal,
        conversation_id: &str,
        body: &str,
        idempotency_key: &str,
    ) -> Result<Message, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated caller required".into());
        }
        if !self.can_access_conversation(actor, conversation_id) {
            return Err("Conversation access forbidden".into());
        }
        if self.blocked_by_participant(actor, conversation_id) {
            return Err("Message blocked by participant blocklist".into());
        }
        if let Some(message) = self.messages.iter().find(|message| {
            message.conversation_id == conversation_id && message.idempotency_key == idempotency_key
        }) {
            return Ok(message.clone());
        }
        let conversation = self
            .conversations
            .iter()
            .position(|conversation| conversation.id == conversation_id)
            .ok_or("Conversation not found")?;
        let sequence = self.conversations[conversation].next_sequence;
        let message = Message {
            conversation_id: conversation_id.to_string(),
            id: format!("msg-{}-{}", conversation_id, sequence),
            sender: actor,
            body: body.to_string(),
            sequence,
            idempotency_key: idempotency_key.to_string(),
        };
        self.messages.push(message.clone());
        self.conversations[conversation].next_sequence += 1;
        for participant in &self.conversations[conversation].participants {
            if *participant != actor {
                if let Some(entry) = self.unread.iter_mut().find(|entry| {
                    entry.conversation_id == conversation_id && entry.user == *participant
                }) {
                    entry.count += 1;
                } else {
                    self.unread.push(UnreadState {
                        conversation_id: conversation_id.to_string(),
                        user: *participant,
                        count: 1,
                        last_read_sequence: 0,
                    });
                }
            }
        }
        Ok(message)
    }

    pub fn list_messages(
        &self,
        actor: Principal,
        conversation_id: &str,
        after: Option<u64>,
        limit: usize,
    ) -> Result<Vec<Message>, String> {
        if !self.can_access_conversation(actor, conversation_id) {
            return Err("Conversation access forbidden".into());
        }
        let mut messages: Vec<Message> = self
            .messages
            .iter()
            .filter(|message| message.conversation_id == conversation_id)
            .filter(|message| after.map_or(true, |value| message.sequence > value))
            .cloned()
            .collect();
        messages.truncate(limit.min(100));
        Ok(messages)
    }

    pub fn mark_read(
        &mut self,
        actor: Principal,
        conversation_id: &str,
        message_id: &str,
    ) -> Result<Receipt, String> {
        if !self.can_access_conversation(actor, conversation_id) {
            return Err("Conversation access forbidden".into());
        }
        let message = self
            .messages
            .iter()
            .find(|entry| entry.conversation_id == conversation_id && entry.id == message_id)
            .ok_or("Message not found")?;
        let receipt = Receipt {
            conversation_id: conversation_id.to_string(),
            user: actor,
            message_id: message_id.to_string(),
            read: true,
        };
        self.receipts
            .retain(|entry| !(entry.conversation_id == conversation_id && entry.user == actor));
        self.receipts.push(receipt.clone());
        let count = self
            .messages
            .iter()
            .filter(|item| {
                item.conversation_id == conversation_id
                    && item.sequence > message.sequence
                    && item.sender != actor
            })
            .count() as u64;
        if let Some(entry) = self
            .unread
            .iter_mut()
            .find(|entry| entry.conversation_id == conversation_id && entry.user == actor)
        {
            entry.count = count;
            entry.last_read_sequence = message.sequence;
        } else {
            self.unread.push(UnreadState {
                conversation_id: conversation_id.to_string(),
                user: actor,
                count,
                last_read_sequence: message.sequence,
            });
        }
        Ok(receipt)
    }

    pub fn delete_message(
        &mut self,
        actor: Principal,
        message_id: &str,
    ) -> Result<Message, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated caller required".into());
        }
        let idx = self
            .messages
            .iter()
            .position(|message| message.id == message_id)
            .ok_or("Message not found")?;
        let message = self.messages[idx].clone();
        if message.sender != actor {
            return Err("Message author required".into());
        }
        self.messages.remove(idx);
        Ok(message)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn conversation_members_can_send_and_list_messages() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let sender = Principal::from_slice(&[2u8; 29]);
        let other = Principal::from_slice(&[3u8; 29]);
        let mut domain = MessagingDomain::new(governor);
        domain
            .create_conversation(sender, "club-1", None, &[sender, other])
            .unwrap();
        let message = domain
            .send_message(sender, "chat-club-1-1", "hello", "id-1")
            .unwrap();
        let page = domain
            .list_messages(sender, "chat-club-1-1", None, 10)
            .unwrap();
        assert_eq!(message.body, "hello");
        assert_eq!(page.len(), 1);
    }

    #[test]
    fn replayed_idempotency_key_returns_original_message() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let sender = Principal::from_slice(&[2u8; 29]);
        let other = Principal::from_slice(&[3u8; 29]);
        let mut domain = MessagingDomain::new(governor);
        domain
            .create_conversation(sender, "club-1", None, &[sender, other])
            .unwrap();
        let first = domain
            .send_message(sender, "chat-club-1-1", "hello", "idempotent")
            .unwrap();
        let second = domain
            .send_message(sender, "chat-club-1-1", "other", "idempotent")
            .unwrap();
        assert_eq!(first.id, second.id);
        assert_eq!(first.body, "hello");
    }

    #[test]
    fn blocked_participant_cannot_send_until_unblocked() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let sender = Principal::from_slice(&[2u8; 29]);
        let blocker = Principal::from_slice(&[3u8; 29]);
        let mut domain = MessagingDomain::new(governor);
        domain
            .create_conversation(sender, "club-1", None, &[sender, blocker])
            .unwrap();
        domain.block_user(blocker, sender).unwrap();
        assert_eq!(
            domain.send_message(sender, "chat-club-1-1", "blocked", "blocked-1"),
            Err("Message blocked by participant blocklist".into())
        );
        domain.unblock_user(blocker, sender).unwrap();
        assert!(domain
            .send_message(sender, "chat-club-1-1", "allowed", "allowed-1")
            .is_ok());
    }

    #[test]
    fn block_operations_reject_anonymous_and_self() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let user = Principal::from_slice(&[2u8; 29]);
        let mut domain = MessagingDomain::new(governor);
        assert!(domain.block_user(Principal::anonymous(), user).is_err());
        assert!(domain.block_user(user, user).is_err());
    }
}
